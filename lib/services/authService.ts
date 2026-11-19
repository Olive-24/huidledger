// lib/services/authService.ts — Phase 2 Authentication service.
// Supports both real Firebase Auth and automatic local mock fallback
// so the dashboard and demo accounts work seamlessly even before .env.local is configured.

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

const MOCK_SESSION_KEY = "huidledger_mock_session";
const mockAuthListeners = new Set<(user: UserProfile | null) => void>();

function getMockStoredUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MOCK_SESSION_KEY);
    if (!raw) return null;
    const uid = JSON.parse(raw);
    return MOCK_USERS.find((u) => u.uid === uid) ?? null;
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
}

export function loginAsDemoUser(email: string): UserProfile | null {
  const normEmail = email.trim().toLowerCase();
  const user = MOCK_USERS.find((u) => u.email === normEmail);
  if (!user) return null;
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user.uid));
  }
  notifyMockListeners(user);
  return user;
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  mockAuthListeners.add(callback);

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

  // If Firebase is not configured or in mock fallback mode
  if (!isFirebaseConfigured()) {
    const user = MOCK_USERS.find((u) => u.email === normEmail);
    if (!user) {
      throw new AppError("No account found with that email in demo records.");
    }
    if (password !== "demo123") {
      throw new AppError("Incorrect password. Demo password is 'demo123'.");
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user.uid));
    }
    notifyMockListeners(user);
    return user;
  }

  // Real Firebase Auth
  try {
    const cred = await signInWithEmailAndPassword(auth, normEmail, password);
    const profile = await fetchUserProfile(cred.user.uid);
    if (!profile) throw new AppError("Account exists in Auth, but profile document is missing in Firestore.");
    return profile;
  } catch (e: unknown) {
    console.error("[Auth Error]:", e);
    if (e instanceof AppError) throw e;
    const code = (e as { code?: string }).code ?? "";
    // If API key is invalid, fall back to mock
    if (code === "auth/api-key-not-valid" || code === "auth/invalid-api-key") {
      const user = MOCK_USERS.find((u) => u.email === normEmail);
      if (user) {
        if (typeof window !== "undefined") {
          localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user.uid));
        }
        notifyMockListeners(user);
        return user;
      }
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

  if (!isFirebaseConfigured()) {
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
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user.uid));
    }
    notifyMockListeners(user);
    return user;
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

    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      name: data.name,
      email: normEmail,
      role: data.role,
      shopName: data.shopName ?? null,
      centreName: data.centreName ?? null,
      createdAt: serverTimestamp(),
    });

    return profile;
  } catch (e: unknown) {
    console.error("[SignUp Error]:", e);
    if (e instanceof AppError) throw e;
    const code = (e as { code?: string }).code ?? "";
    throw new AppError(mapAuthError(code));
  }
}
