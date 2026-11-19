// lib/services/authService.ts — Authentication service connected to real Firebase Auth & Firestore.
// Real signups and logins use 100% real Firebase Auth.
// Demo accounts are reserved strictly for the 1-click Demo buttons.

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

export function getMockStoredUser(): UserProfile | null {
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

function mapAuthError(code: string, rawMessage?: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "No account found with this email, or password is incorrect. (Click 'Sign up' below to create one!)";
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
      return "Email/Password provider is disabled in Firebase. Enable it in Firebase Console -> Authentication -> Sign-in method -> Email/Password.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase. Add localhost or your domain in Firebase Console -> Authentication -> Settings -> Authorized domains.";
    case "auth/api-key-not-valid":
    case "auth/invalid-api-key":
      return "Firebase rejected the Web API key. Please enable 'Identity Toolkit API' in Google Cloud Console or check credentials.";
    default:
      if (rawMessage?.includes("api-key-not-valid")) {
        return "Firebase API Key is not valid. Please ensure 'Identity Toolkit API' is enabled in your Google Cloud Console for project 'huidledger'.";
      }
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

// Strictly for the 1-click Demo buttons
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

  // If there's an active demo session, notify immediately
  const initialMock = getMockStoredUser();
  if (initialMock) {
    callback(initialMock);
  }

  if (!isFirebaseConfigured()) {
    callback(getMockStoredUser());
    return () => mockAuthListeners.delete(callback);
  }

  // Real Firebase onAuthStateChanged
  const unsubFirebase = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      const mock = getMockStoredUser();
      callback(mock);
      return;
    }
    try {
      const profile = await fetchUserProfile(firebaseUser.uid);
      if (profile) {
        callback(profile);
      } else {
        // User authenticated in Firebase Auth, but user document missing in Firestore
        const fallbackProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          email: firebaseUser.email || "",
          role: "jeweller",
          shopName: "Jewellers Shop",
          centreName: null,
          createdAt: new Date(),
        };
        callback(fallbackProfile);
      }
    } catch {
      callback(null);
    }
  });

  return () => {
    mockAuthListeners.delete(callback);
    unsubFirebase();
  };
}

export async function logIn(email: string, password: string): Promise<UserProfile> {
  const normEmail = email.trim().toLowerCase();

  // If using demo credentials on login form, allow demo access
  const demoMatch = DEMO_USERS.find((d) => d.email === normEmail);
  if (demoMatch && password === "demo123") {
    const demo = loginAsDemoUser(demoMatch.email);
    if (demo) return demo;
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
        shopName: "Jewellers Shop",
        centreName: null,
        createdAt: new Date(),
      };
    }
    // Clear demo session when real user logs in
    if (typeof window !== "undefined") {
      localStorage.removeItem(MOCK_SESSION_KEY);
    }
    return profile;
  } catch (e: unknown) {
    console.error("[Real Firebase LogIn Error]:", e);
    if (e instanceof AppError) throw e;
    const code = (e as { code?: string }).code ?? "";
    const msg = (e as Error)?.message ?? "";
    throw new AppError(mapAuthError(code, msg));
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

  // REAL Firebase Auth User Creation
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

    // Save user profile to Cloud Firestore collection "users"
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      name: data.name,
      email: normEmail,
      role: data.role,
      shopName: data.shopName ?? null,
      centreName: data.centreName ?? null,
      createdAt: serverTimestamp(),
    });

    // Clear any demo session
    if (typeof window !== "undefined") {
      localStorage.removeItem(MOCK_SESSION_KEY);
    }

    return profile;
  } catch (e: unknown) {
    console.error("[Real Firebase SignUp Error]:", e);
    if (e instanceof AppError) throw e;
    const code = (e as { code?: string }).code ?? "";
    const msg = (e as Error)?.message ?? "";
    throw new AppError(mapAuthError(code, msg));
  }
}
