import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * Function 1: Scheduled Daily Stuck Batch Detector
 * Runs once every 24 hours at midnight IST (Asia/Kolkata).
 * Inspects all active (non-returned) batches.
 * Flags isStuck = true if lastStatusChangeAt is older than config.stuckAfterDays.
 * Clears isStuck = false if batch status was updated recently.
 */
export const detectStuckBatches = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
    retryCount: 3,
  },
  async () => {
    const db = getFirestore();
    logger.info("Starting daily stuck batch detection run...");

    // 1. Fetch configurable threshold
    let stuckAfterDays = 3;
    try {
      const configDoc = await db.doc("config/app").get();
      if (configDoc.exists) {
        const data = configDoc.data();
        if (data && typeof data.stuckAfterDays === "number") {
          stuckAfterDays = data.stuckAfterDays;
        }
      }
    } catch (err) {
      logger.warn("Could not read config/app; falling back to 3 days default", { err });
    }

    const cutoffMillis = Date.now() - stuckAfterDays * 24 * 60 * 60 * 1000;
    logger.info(`Stuck threshold: ${stuckAfterDays} days (cutoff: ${new Date(cutoffMillis).toISOString()})`);

    // 2. Fetch all active batches
    const activeStatuses = ["submitted", "received", "tested", "hallmarked"];
    const batchesSnap = await db
      .collection("batches")
      .where("status", "in", activeStatuses)
      .get();

    logger.info(`Found ${batchesSnap.size} active batches to evaluate`);

    let markedStuck = 0;
    let clearedStuck = 0;
    const batchWriter = db.batch();
    let pendingWrites = 0;

    for (const doc of batchesSnap.docs) {
      const data = doc.data();
      const lastChange = data.lastStatusChangeAt as Timestamp | undefined;
      const createdAt = data.createdAt as Timestamp | undefined;
      const effectiveTimestamp = lastChange ? lastChange.toMillis() : (createdAt ? createdAt.toMillis() : 0);

      const isOlderThanCutoff = effectiveTimestamp < cutoffMillis;
      const currentlyStuck = Boolean(data.isStuck);

      if (isOlderThanCutoff && !currentlyStuck) {
        batchWriter.update(doc.ref, {
          isStuck: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
        markedStuck++;
        pendingWrites++;
      } else if (!isOlderThanCutoff && currentlyStuck) {
        batchWriter.update(doc.ref, {
          isStuck: false,
          updatedAt: FieldValue.serverTimestamp(),
        });
        clearedStuck++;
        pendingWrites++;
      }

      // Firestore batches have a 500-op limit
      if (pendingWrites >= 400) {
        await batchWriter.commit();
        pendingWrites = 0;
      }
    }

    if (pendingWrites > 0) {
      await batchWriter.commit();
    }

    logger.info(`Stuck batch detection complete. Marked stuck: ${markedStuck}, Cleared: ${clearedStuck}`);
  }
);
