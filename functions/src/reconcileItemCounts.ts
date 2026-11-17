import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Function 2: Firestore trigger on items write
 * Trigger: batches/{batchId}/items/{itemId} (create, update, or delete)
 *
 * Responsibilities:
 * 1. Idempotently recompute pendingCount, hallmarkedCount, rejectedCount, itemCount,
 *    and estimatedFee on the parent batch document.
 * 2. Sync publicHuids: create public verification document when an item becomes hallmarked,
 *    update or delete it if the item changes or stops being hallmarked.
 */
export const reconcileItemCounts = onDocumentWritten(
  {
    document: "batches/{batchId}/items/{itemId}",
    region: "asia-south1",
  },
  async (event) => {
    const { batchId, itemId } = event.params;
    const db = getFirestore();

    const beforeData = event.data?.before.exists ? event.data.before.data() : null;
    const afterData = event.data?.after.exists ? event.data.after.data() : null;

    logger.info(`Reconciling items for batch ${batchId}, triggered by item ${itemId}`, {
      action: !beforeData ? "created" : !afterData ? "deleted" : "updated",
    });

    const batchRef = db.doc(`batches/${batchId}`);
    const batchSnap = await batchRef.get();

    if (!batchSnap.exists) {
      logger.warn(`Parent batch ${batchId} not found; skipping reconciliation`);
      return;
    }

    const batchData = batchSnap.data();

    // ── 1. Recompute counts across all items in this batch ──────────────
    const itemsSnap = await db.collection(`batches/${batchId}/items`).get();

    let pendingCount = 0;
    let hallmarkedCount = 0;
    let rejectedCount = 0;

    itemsSnap.docs.forEach((doc) => {
      const item = doc.data();
      if (item.result === "hallmarked") {
        hallmarkedCount++;
      } else if (item.result === "rejected") {
        rejectedCount++;
      } else {
        pendingCount++;
      }
    });

    const itemCount = itemsSnap.size;
    const feePerItem = typeof batchData?.feePerItem === "number" ? batchData.feePerItem : 75;
    const estimatedFee = itemCount * feePerItem;

    await batchRef.update({
      itemCount,
      pendingCount,
      hallmarkedCount,
      rejectedCount,
      estimatedFee,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info(`Batch ${batchId} updated: ${itemCount} items, ₹${estimatedFee} fee`);

    // ── 2. Sync publicHuids collection ──────────────────────────────────
    const oldHuid = beforeData?.result === "hallmarked" && beforeData.huid ? (beforeData.huid as string).toUpperCase() : null;
    const newHuid = afterData?.result === "hallmarked" && afterData.huid ? (afterData.huid as string).toUpperCase() : null;

    // Case A: Item was deleted, or item is no longer hallmarked, or HUID changed
    if (oldHuid && (oldHuid !== newHuid || !afterData || afterData.result !== "hallmarked")) {
      logger.info(`Deleting public HUID document for previous code ${oldHuid}`);
      await db.doc(`publicHuids/${oldHuid}`).delete();
    }

    // Case B: Item is hallmarked with a valid HUID
    if (newHuid && afterData && afterData.result === "hallmarked") {
      logger.info(`Publishing public HUID document for ${newHuid}`);
      await db.doc(`publicHuids/${newHuid}`).set(
        {
          huid: newHuid,
          batchId,
          batchCode: batchData?.batchCode || "",
          centreName: batchData?.centreName || "Assaying and Hallmarking Centre",
          category: afterData.category || "other",
          purity: afterData.purity || "22K",
          weightGrams: afterData.weightGrams || 0,
          hallmarkedAt: afterData.updatedAt || FieldValue.serverTimestamp(),
          verified: true,
        },
        { merge: true }
      );
    }
  }
);
