// lib/services/publicService.ts — Public HUID service supporting real Firestore with automatic mock fallback.

import { collection, doc, getDoc, onSnapshot, query, limit } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { PublicHuid } from "@/lib/types";
import { AppError } from "@/lib/types";
import { validateHuid } from "@/lib/rules";
import { MOCK_PUBLIC_HUIDS } from "./mockData";

export async function verifyHuid(huid: string): Promise<PublicHuid | null> {
  const normalised = huid.trim().toUpperCase();

  if (!validateHuid(normalised)) {
    throw new AppError("Invalid HUID format. A HUID is exactly 6 characters (A–Z and 0–9).");
  }

  // Check mock database first
  const mockMatch = MOCK_PUBLIC_HUIDS.find((h) => h.huid === normalised);
  if (mockMatch) {
    return mockMatch;
  }

  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    const snap = await getDoc(doc(db, "publicHuids", normalised));
    if (!snap.exists()) return null;

    const d = snap.data();
    return {
      huid: d.huid,
      articleName: d.articleName,
      category: d.category,
      purity: d.purity,
      weightGrams: d.weightGrams,
      hallmarkedAt: d.hallmarkedAt?.toDate() ?? new Date(),
      centreName: d.centreName ?? null,
    };
  } catch (err) {
    console.warn("Firestore verifyHuid error:", err);
    return null;
  }
}

export function subscribeToPublicHuids(callback: (huids: PublicHuid[]) => void): () => void {
  if (!isFirebaseConfigured()) {
    callback([...MOCK_PUBLIC_HUIDS]);
    return () => { };
  }

  const q = query(collection(db, "publicHuids"), limit(500));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          huid: data.huid,
          articleName: data.articleName,
          category: data.category,
          purity: data.purity,
          weightGrams: data.weightGrams,
          hallmarkedAt: data.hallmarkedAt?.toDate() ?? new Date(),
          centreName: data.centreName ?? null,
        };
      });
      if (list.length === 0) {
        callback([...MOCK_PUBLIC_HUIDS]);
      } else {
        list.sort((a, b) => b.hallmarkedAt.getTime() - a.hallmarkedAt.getTime());
        callback(list);
      }
    },
    (err) => {
      console.warn("Firestore publicHuids error, falling back to mock:", err);
      callback([...MOCK_PUBLIC_HUIDS]);
    }
  );
}
