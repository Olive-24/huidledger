// lib/services/configService.ts — Config service supporting real Firestore with automatic mock fallback.

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { AppConfig } from "@/lib/types";
import { DEFAULTS } from "@/lib/constants";
import { AppError } from "@/lib/types";
import { mockStore } from "./mockStore";

const CONFIG_DOC = doc(db, "config", "app");

let mockConfig: AppConfig = {
  feePerItem: DEFAULTS.feePerItem,
  stuckAfterDays: DEFAULTS.stuckAfterDays,
  batchCounter: 8,
};

const DEFAULT_CONFIG: Omit<AppConfig, "batchCounter"> & { batchCounter: number } = {
  feePerItem: DEFAULTS.feePerItem,
  stuckAfterDays: DEFAULTS.stuckAfterDays,
  batchCounter: 0,
};

export async function getConfig(): Promise<AppConfig> {
  if (!isFirebaseConfigured()) {
    return { ...mockConfig };
  }

  const snap = await getDoc(CONFIG_DOC);
  if (!snap.exists()) {
    await setDoc(CONFIG_DOC, DEFAULT_CONFIG, { merge: true });
    return { ...DEFAULT_CONFIG };
  }
  const d = snap.data();
  return {
    feePerItem: d.feePerItem ?? DEFAULTS.feePerItem,
    stuckAfterDays: d.stuckAfterDays ?? DEFAULTS.stuckAfterDays,
    batchCounter: d.batchCounter ?? 0,
  };
}

export function subscribeToConfig(callback: (config: AppConfig) => void): () => void {
  if (!isFirebaseConfigured()) {
    callback({ ...mockConfig });
    return mockStore.subscribe("config", () => callback({ ...mockConfig }));
  }

  return onSnapshot(CONFIG_DOC, (snap) => {
    if (!snap.exists()) {
      callback({ ...DEFAULT_CONFIG });
      return;
    }
    const d = snap.data();
    callback({
      feePerItem: d.feePerItem ?? DEFAULTS.feePerItem,
      stuckAfterDays: d.stuckAfterDays ?? DEFAULTS.stuckAfterDays,
      batchCounter: d.batchCounter ?? 0,
    });
  });
}

export async function updateConfig(patch: Partial<AppConfig>): Promise<void> {
  if (!isFirebaseConfigured()) {
    mockConfig = { ...mockConfig, ...patch };
    mockStore.emit("config");
    return;
  }

  try {
    await setDoc(CONFIG_DOC, patch, { merge: true });
  } catch (e) {
    throw new AppError("Failed to update configuration.", e);
  }
}
