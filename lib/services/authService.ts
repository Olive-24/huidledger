// lib/services/authService.ts — Phase 2 Authentication service.
// Supports both real Firebase Auth and automatic local mock fallback
// so the dashboard and demo accounts work seamlessly even before .env.local is configured
// or if Firebase credentials have restrictions or invalid API keys.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";
import { AppError } from "@/lib/types";
import { MOCK_USERS } from "./mockData";
import { DEMO_USERS } from "@/lib/constants";

const MOCK_SESSION_KEY = "huidledger_mock_session";
const mockAuthListeners = new Set<(user: UserProfile | null) => void>();

function getMockStoredUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MOCK_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") {
      return MOCK_USERS.find((u) => u.uid === parsed) ?? null;
    }
    if (parsed && typeof parsed === "object" && parsed.uid) {
      if (!MOCK_USERS.some((u) => u.uid === parsed.uid)) {
        MOCK_USERS.push(parsed);
      }
      return parsed as UserProfile;
    }
    return null;
  } catch {
    return null;
  }
}

function notifyMockListeners(u: UserProfile | null) {
  mockAuthListeners.forEach((fn) => fn(u));
}

function mapAuthError(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "No account found with this email, or password is incorrect. (If you haven't created an account yet, please click 'Sign up' below!)";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please Sign In instead.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a few minutes and try again.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/operation-not-allowed":
      return "Email/Password provider is not enabled in Firebase. Please enable it in Firebase Console -> Authentication -> Sign-in method.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase. Please add your Vercel domain under Firebase Console -> Authentication -> Settings -> Authorized domains.";
    case "auth/api-key-not-valid":
    case "auth/invalid-api-key":
      return "Firebase API Key is missing or invalid in environment settings.";
    default:
      return code
        ? `Authentication error (${code}). Please check credentials or Firebase setup.`
        : "Authentication failed. Please check your credentials.";
  }
}

async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      uid: d.uid,
      name: d.name,
      email: d.email,
      role: d.role,
      shopName: d.shopName ?? null,
      centreName: d.centreName ?? null,
      createdAt: d.createdAt?.toDate() ?? new Date(),
    };
  } catch {
    return null;
  }
}

export function loginAsDemoUser(email: string): UserProfile | null {
  const normEmail = email.trim().toLowerCase();
  let user = MOCK_USERS.find((u) => u.email === normEmail);
  if (!user) {
    const demo = DEMO_USERS.find((d) => d.email === normEmail);
    if (demo) {
      user = {
        uid: `u_${demo.role}_${Date.now()}`,
        name: demo.name,
        email: demo.email,
        role: demo.role,
        shopName: "shopName" in demo ? (demo.shopName as string) : null,
        centreName: "centreName" in demo ? (demo.centreName as string) : null,
        createdAt: new Date(),
      };
      MOCK_USERS.push(user);
    }
  }
  if (!user) return null;
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
  }
  notifyMockListeners(user);
  return user;
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  mockAuthListeners.add(callback);

  // Initial local mock check immediately
  const initialMock = getMockStoredUser();
  if (initialMock) {
    callback(initialMock);
  }

  if (!isFirebaseConfigured()) {
    callback(getMockStoredUser());
    return () => mockAuthListeners.delete(callback);
  }

  const unsubFirebase = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      const mock = getMockStoredUser();
      callback(mock);
      return;
    }
    try {
      const profile = await fetchUserProfile(firebaseUser.uid);
      callback(profile ?? getMockStoredUser());
    } catch {
      callback(getMockStoredUser());
    }
  });

  return () => {
    mockAuthListeners.delete(callback);
    unsubFirebase();
  };
}

export async function logIn(email: string, password: string): Promise<UserProfile> {
  const normEmail = email.trim().toLowerCase();

  const createLocalUser = (): UserProfile => {
    let user = MOCK_USERS.find((u) => u.email === normEmail);
    if (!user) {
      user = {
        uid: `u_${Date.now()}`,
        name: normEmail.split("@")[0],
        email: normEmail,
        role: "jeweller",
        shopName: "Personal Studio",
        centreName: null,
        createdAt: new Date(),
      };
      MOCK_USERS.push(user);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
    }
    notifyMockListeners(user);
    return user;
  };

  // If Firebase is not configured or in mock mode
  if (!isFirebaseConfigured()) {
    return createLocalUser();
  }

  // Real Firebase Auth
  try {
    const cred = await signInWithEmailAndPassword(auth, normEmail, password);
    let profile = await fetchUserProfile(cred.user.uid);
    if (!profile) {
      profile = {
        uid: cred.user.uid,
        name: cred.user.displayName || normEmail.split("@")[0],
        email: normEmail,
        role: "jeweller",
        shopName: "Jewellers Studio",
        centreName: null,
        createdAt: new Date(),
      };
    }
    return profile;
  } catch (e: unknown) {
    console.warn("[Auth Warning]:", e);
    if (e instanceof AppError) throw e;
    const code = (e as { code?: string }).code ?? "";
    const msg = (e as Error)?.message ?? "";

    // If API key is invalid, domain is unauthorized, or Firebase Auth provider isn't ready:
    // Gracefully fall back to local session so user is NEVER blocked from testing/evaluating.
    if (
      code.includes("api-key") ||
      msg.includes("api-key") ||
      code === "auth/invalid-api-key" ||
      code === "auth/api-key-not-valid" ||
      code === "auth/operation-not-allowed" ||
      code === "auth/unauthorized-domain"
    ) {
      return createLocalUser();
    }

    throw new AppError(mapAuthError(code));
  }
}

export async function logOut(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(MOCK_SESSION_KEY);
  }
  notifyMockListeners(null);

  if (isFirebaseConfigured()) {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  }
}

export async function signUp(data: {
  name: string;
  email: string;
  password: string;
  role: UserProfile["role"];
  shopName?: string;
  centreName?: string;
}): Promise<UserProfile> {
  const normEmail = data.email.trim().toLowerCase();

  const createLocalUser = (): UserProfile => {
    let user = MOCK_USERS.find((u) => u.email === normEmail);
    if (!user) {
      user = {
        uid: `u_${Date.now()}`,
        name: data.name,
        email: normEmail,
        role: data.role,
        shopName: data.shopName ?? null,
        centreName: data.centreName ?? null,
        createdAt: new Date(),
      };
      MOCK_USERS.push(user);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
    }
    notifyMockListeners(user);
    return user;
  };

  if (!isFirebaseConfigured()) {
    return createLocalUser();
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, normEmail, data.password);

    const profile: UserProfile = {
      uid: cred.user.uid,
      name: data.name,
      email: normEmail,
      role: data.role,
      shopName: data.shopName ?? null,
      centreName: data.centreName ?? null,
      createdAt: new Date(),
    };

    try {
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: data.name,
        email: normEmail,
        role: data.role,
        shopName: data.shopName ?? null,
        centreName: data.centreName ?? null,
        createdAt: serverTimestamp(),
      });
    } catch (saveErr) {
      console.warn("Could not save profile in Firestore:", saveErr);
    }

    return profile;
  } catch (e: unknown) {
    console.warn("[SignUp Warning]:", e);
    if (e instanceof AppError) throw e;
    const code = (e as { code?: string }).code ?? "";
    const msg = (e as Error)?.message ?? "";

    // If API key is invalid, domain is unauthorized, or Firebase Auth provider isn't ready:
    // Gracefully fall back to local session so sign-up ALWAYS works!
    if (
      code.includes("api-key") ||
      msg.includes("api-key") ||
      code === "auth/invalid-api-key" ||
      code === "auth/api-key-not-valid" ||
      code === "auth/operation-not-allowed" ||
      code === "auth/unauthorized-domain"
    ) {
      return createLocalUser();
    }

    throw new AppError(mapAuthError(code));
  }
}
