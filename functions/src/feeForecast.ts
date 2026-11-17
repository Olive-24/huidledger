import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

export interface FeeForecastResponse {
  monthlyAverageArticles: number;
  estimatedMonthlyFee: number;
  estimatedYearlyFee: number;
  totalBatches: number;
  totalArticles: number;
  feePerItem: number;
  monthsActive: number;
}

/**
 * Function 3: Callable Fee Forecast
 * Endpoint: getFeeForecast
 *
 * Verifies caller authentication and jeweller role.
 * Calculates historical monthly article volume and projects monthly/annual hallmarking costs.
 */
export const getFeeForecast = onCall(
  {
    region: "asia-south1",
  },
  async (request): Promise<FeeForecastResponse> => {
    // 1. Authentication check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated to access fee forecasts.");
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    // 2. Authorization check: caller must be a jeweller
    const userDoc = await db.doc(`users/${uid}`).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    const userData = userDoc.data();
    if (userData?.role !== "jeweller") {
      throw new HttpsError("permission-denied", "Only registered jewellers can access fee forecasts.");
    }

    // 3. Fetch app configuration for current fee per item
    let feePerItem = 75;
    try {
      const configDoc = await db.doc("config/app").get();
      if (configDoc.exists) {
        const configData = configDoc.data();
        if (configData && typeof configData.feePerItem === "number") {
          feePerItem = configData.feePerItem;
        }
      }
    } catch (err) {
      logger.warn("Could not read config/app; falling back to 75 default", { err });
    }

    // 4. Fetch all batches for this jeweller
    const batchesSnap = await db
      .collection("batches")
      .where("jewellerId", "==", uid)
      .get();

    logger.info(`Calculating fee forecast for jeweller ${uid} across ${batchesSnap.size} batches`);

    if (batchesSnap.empty) {
      return {
        monthlyAverageArticles: 0,
        estimatedMonthlyFee: 0,
        estimatedYearlyFee: 0,
        totalBatches: 0,
        totalArticles: 0,
        feePerItem,
        monthsActive: 0,
      };
    }

    let totalArticles = 0;
    const monthKeys = new Set<string>();

    batchesSnap.docs.forEach((doc) => {
      const data = doc.data();
      const count = typeof data.itemCount === "number" ? data.itemCount : 0;
      totalArticles += count;

      const createdAt = data.createdAt as Timestamp | undefined;
      if (createdAt) {
        const date = createdAt.toDate();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthKeys.add(monthKey);
      }
    });

    const monthsActive = Math.max(1, monthKeys.size);
    const monthlyAverageArticles = Math.round(totalArticles / monthsActive);
    const estimatedMonthlyFee = monthlyAverageArticles * feePerItem;
    const estimatedYearlyFee = estimatedMonthlyFee * 12;

    return {
      monthlyAverageArticles,
      estimatedMonthlyFee,
      estimatedYearlyFee,
      totalBatches: batchesSnap.size,
      totalArticles,
      feePerItem,
      monthsActive,
    };
  }
);
