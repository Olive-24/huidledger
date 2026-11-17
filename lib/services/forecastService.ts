// lib/services/forecastService.ts — Fee forecasting service
// Calls the Cloud Function getFeeForecast with automatic client-side calculation fallback.

import { httpsCallable } from "firebase/functions";
import { functions, isFirebaseConfigured } from "@/lib/firebase";
import type { Batch } from "@/lib/types";

export interface FeeForecast {
  monthlyAverageArticles: number;
  estimatedMonthlyFee: number;
  estimatedYearlyFee: number;
  totalBatches: number;
  totalArticles: number;
  feePerItem: number;
  monthsActive: number;
  isCloudComputed: boolean;
}

/**
 * Calculates or fetches fee forecast for a jeweller.
 * Tries the Cloud Function first; gracefully falls back to client-side logic.
 */
export async function getFeeForecast(
  jewellerUid: string,
  batches: Batch[],
  feePerItem = 75
): Promise<FeeForecast> {
  // 1. Try Cloud Function if Firebase is configured
  if (isFirebaseConfigured()) {
    try {
      const getFeeForecastFn = httpsCallable<void, Omit<FeeForecast, "isCloudComputed">>(
        functions,
        "getFeeForecast"
      );
      const res = await getFeeForecastFn();
      if (res && res.data) {
        return {
          ...res.data,
          isCloudComputed: true,
        };
      }
    } catch {
      // Cloud Function might not be deployed yet (Blaze plan pending)
      // Fallback cleanly to client computation
    }
  }

  // 2. Client-side fallback computation
  if (batches.length === 0) {
    return {
      monthlyAverageArticles: 0,
      estimatedMonthlyFee: 0,
      estimatedYearlyFee: 0,
      totalBatches: 0,
      totalArticles: 0,
      feePerItem,
      monthsActive: 0,
      isCloudComputed: false,
    };
  }

  let totalArticles = 0;
  const monthKeys = new Set<string>();

  batches.forEach((b) => {
    totalArticles += b.itemCount;
    const d = b.createdAt;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthKeys.add(monthKey);
  });

  const monthsActive = Math.max(1, monthKeys.size);
  const monthlyAverageArticles = Math.round(totalArticles / monthsActive);
  const estimatedMonthlyFee = monthlyAverageArticles * feePerItem;
  const estimatedYearlyFee = estimatedMonthlyFee * 12;

  return {
    monthlyAverageArticles,
    estimatedMonthlyFee,
    estimatedYearlyFee,
    totalBatches: batches.length,
    totalArticles,
    feePerItem,
    monthsActive,
    isCloudComputed: false,
  };
}
