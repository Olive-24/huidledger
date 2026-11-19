// lib/firebase.ts — Firebase initialisation & environment detection.
// Hot-reload safe. Configured with project credentials.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

const apiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDKb5jzoLtk2jamgwEB4whsFXwezD5H8wM";

export function isFirebaseConfigured(): boolean {
  return Boolean(
    apiKey &&
    apiKey !== "AIzaSyDummyKeyForBuildPrerender" &&
    !apiKey.includes("your_api_key") &&
    apiKey.length > 10
  );
}

const firebaseConfig = {
  apiKey:            apiKey,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "huidledger.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "huidledger",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "huidledger.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "9079929809",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:9079929809:web:a959316b52524bacd47ef0",
};

// Use existing app if already initialised (hot-reload safety)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, "asia-south1");
