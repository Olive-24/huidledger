// lib/services/itemService.ts — Item service supporting real Firestore with automatic mock fallback.

import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
  getDoc,
  type DocumentData,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { Item, ItemCategory, ItemPurity, ItemResult, NewItemForm, UserProfile } from "@/lib/types";
import { AppError } from "@/lib/types";
import {
  validateHuid,
  canJewellerEditItems,
  canOperatorSetResult,
  areItemsReadOnly,
} from "@/lib/rules";
import { DEFAULTS } from "@/lib/constants";
import { MOCK_ITEMS, MOCK_BATCHES } from "./mockData";
import { mockStore } from "./mockStore";

function docToItem(id: string, batchId: string, d: DocumentData): Item {
  const toDate = (v: Timestamp | null | undefined): Date =>
    v instanceof Timestamp ? v.toDate() : new Date();
  return {
    id,
    batchId,
    name: d.name,
    category: d.category as ItemCategory,
    purity: d.purity as ItemPurity,
    weightGrams: d.weightGrams,
    photoUrl: d.photoUrl ?? null,
    photoPath: d.photoPath ?? null,
    result: (d.result ?? "pending") as ItemResult,
    huid: d.huid ?? null,
    rejectionReason: d.rejectionReason ?? null,
    invoiceNo: d.invoiceNo ?? null,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

function itemsRef(batchId: string) {
  return collection(db, "batches", batchId, "items");
}

function batchRef(batchId: string) {
  return doc(db, "batches", batchId);
}

function recalcMockBatch(batchId: string) {
  const batch = MOCK_BATCHES.find((b) => b.id === batchId);
  if (!batch) return;
  const items = MOCK_ITEMS[batchId] || [];
  batch.itemCount = items.length;
  batch.pendingCount = items.filter((i) => i.result === "pending").length;
  batch.hallmarkedCount = items.filter((i) => i.result === "hallmarked").length;
  batch.rejectedCount = items.filter((i) => i.result === "rejected").length;
  batch.estimatedFee = batch.itemCount * batch.feePerItem;
  batch.updatedAt = new Date();
}

export function subscribeToItems(batchId: string, callback: (items: Item[]) => void): () => void {
  const hasMock = Boolean(MOCK_ITEMS[batchId]);
  if (hasMock || !isFirebaseConfigured() || batchId.startsWith("demo-batch") || batchId.startsWith("batch_")) {
    callback([...(MOCK_ITEMS[batchId] || [])]);
    return mockStore.subscribe(`items:${batchId}`, () => {
      callback([...(MOCK_ITEMS[batchId] || [])]);
    });
  }

  return onSnapshot(
    itemsRef(batchId),
    (snap) => {
      const list = snap.docs.map((d) => docToItem(d.id, batchId, d.data()));
      if (list.length === 0 && MOCK_ITEMS[batchId]) {
        callback([...MOCK_ITEMS[batchId]]);
      } else {
        list.sort((a, b) => a.createdAt.getTime() - a.createdAt.getTime());
        callback(list);
      }
    },
    (err) => {
      console.warn("Firestore items error, falling back to mock:", err);
      callback([...(MOCK_ITEMS[batchId] || [])]);
    }
  );
}

export async function addItem(user: UserProfile, batchId: string, form: NewItemForm): Promise<Item> {
  if (user.role !== "jeweller") throw new AppError("Only the jeweller can add items.");

  const hasMock = Boolean(MOCK_ITEMS[batchId]);
  if (hasMock || !isFirebaseConfigured() || batchId.startsWith("demo-batch") || batchId.startsWith("batch_")) {
    const batch = MOCK_BATCHES.find((b) => b.id === batchId);
    if (!batch) throw new AppError("Batch not found.");
    if (!canJewellerEditItems(batch)) throw new AppError("Items can only be added while the batch is Submitted.");

    if (!MOCK_ITEMS[batchId]) MOCK_ITEMS[batchId] = [];
    const items = MOCK_ITEMS[batchId];
    if (items.length >= DEFAULTS.maxItemsPerBatch) {
      throw new AppError(`A batch can have at most ${DEFAULTS.maxItemsPerBatch} items.`);
    }

    const newItem: Item = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      batchId,
      name: form.name,
      category: form.category,
      purity: form.purity,
      weightGrams: form.weightGrams,
      photoUrl: form.photoUrl || null,
      photoPath: form.photoPath || null,
      result: "pending",
      huid: null,
      rejectionReason: null,
      invoiceNo: form.invoiceNo || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    items.push(newItem);
    recalcMockBatch(batchId);
    mockStore.emit(`items:${batchId}`);
    mockStore.emit(`batch:${batchId}`);
    mockStore.emit("batches");
    return newItem;
  }

  try {
    let generatedId = "";
    await runTransaction(db, async (tx) => {
      const bSnap = await tx.get(batchRef(batchId));
      if (!bSnap.exists()) throw new AppError("Batch not found.");
      const b = bSnap.data()!;
      if (b.jewellerId !== user.uid) throw new AppError("You do not own this batch.");
      if (b.status !== "submitted") throw new AppError("Items can only be added while the batch is Submitted.");
      if ((b.itemCount ?? 0) >= DEFAULTS.maxItemsPerBatch) {
        throw new AppError(`Maximum ${DEFAULTS.maxItemsPerBatch} items per batch.`);
      }

      const now = serverTimestamp();
      const itemRef = doc(itemsRef(batchId));
      generatedId = itemRef.id;

      tx.set(itemRef, {
        name: form.name,
        category: form.category,
        purity: form.purity,
        weightGrams: form.weightGrams,
        photoUrl: form.photoUrl || null,
        photoPath: form.photoPath || null,
        result: "pending",
        huid: null,
        rejectionReason: null,
        invoiceNo: form.invoiceNo || null,
        createdAt: now,
        updatedAt: now,
      });

      const newCount = (b.itemCount ?? 0) + 1;
      tx.update(batchRef(batchId), {
        itemCount: newCount,
        pendingCount: (b.pendingCount ?? 0) + 1,
        estimatedFee: newCount * (b.feePerItem ?? 75),
        updatedAt: now,
      });
    });

    return {
      id: generatedId,
      batchId,
      name: form.name,
      category: form.category,
      purity: form.purity,
      weightGrams: form.weightGrams,
      photoUrl: form.photoUrl || null,
      photoPath: form.photoPath || null,
      result: "pending",
      huid: null,
      rejectionReason: null,
      invoiceNo: form.invoiceNo || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err) {
    console.warn("Firestore addItem error, falling back to mock:", err);
    if (!MOCK_ITEMS[batchId]) MOCK_ITEMS[batchId] = [];
    const newItem: Item = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      batchId,
      name: form.name,
      category: form.category,
      purity: form.purity,
      weightGrams: form.weightGrams,
      photoUrl: form.photoUrl || null,
      photoPath: form.photoPath || null,
      result: "pending",
      huid: null,
      rejectionReason: null,
      invoiceNo: form.invoiceNo || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MOCK_ITEMS[batchId].push(newItem);
    recalcMockBatch(batchId);
    mockStore.emit(`items:${batchId}`);
    mockStore.emit(`batch:${batchId}`);
    mockStore.emit("batches");
    return newItem;
  }
}

export async function updateItem(
  user: UserProfile,
  batchId: string,
  itemId: string,
  patch: Partial<Pick<Item, "name" | "category" | "purity" | "weightGrams" | "invoiceNo">>
): Promise<void> {
  const hasMock = Boolean(MOCK_ITEMS[batchId]);
  if (hasMock || !isFirebaseConfigured() || batchId.startsWith("demo-batch") || batchId.startsWith("batch_")) {
    const item = (MOCK_ITEMS[batchId] || []).find((i) => i.id === itemId);
    if (!item) throw new AppError("Item not found.");

    Object.assign(item, { ...patch, updatedAt: new Date() });
    mockStore.emit(`items:${batchId}`);
    return;
  }

  try {
    await runTransaction(db, async (tx) => {
      const bSnap = await tx.get(batchRef(batchId));
      if (!bSnap.exists()) throw new AppError("Batch not found.");
      const b = bSnap.data()!;
      if (b.jewellerId !== user.uid) throw new AppError("You do not own this batch.");
      if (b.status !== "submitted") throw new AppError("Items can only be edited while Submitted.");

      const iRef = doc(itemsRef(batchId), itemId);
      tx.update(iRef, { ...patch, updatedAt: serverTimestamp() });
    });
  } catch (err) {
    console.warn("Firestore updateItem error, falling back to mock:", err);
    const item = (MOCK_ITEMS[batchId] || []).find((i) => i.id === itemId);
    if (item) {
      Object.assign(item, { ...patch, updatedAt: new Date() });
      mockStore.emit(`items:${batchId}`);
    }
  }
}

export async function deleteItem(user: UserProfile, batchId: string, itemId: string): Promise<void> {
  const hasMock = Boolean(MOCK_ITEMS[batchId]);
  if (hasMock || !isFirebaseConfigured() || batchId.startsWith("demo-batch") || batchId.startsWith("batch_")) {
    const items = MOCK_ITEMS[batchId] || [];
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new AppError("Item not found.");

    items.splice(idx, 1);
    recalcMockBatch(batchId);
    mockStore.emit(`items:${batchId}`);
    mockStore.emit(`batch:${batchId}`);
    mockStore.emit("batches");
    return;
  }

  try {
    await runTransaction(db, async (tx) => {
      const bSnap = await tx.get(batchRef(batchId));
      if (!bSnap.exists()) throw new AppError("Batch not found.");
      const b = bSnap.data()!;
      if (b.jewellerId !== user.uid) throw new AppError("You do not own this batch.");
      if (b.status !== "submitted") throw new AppError("Items can only be deleted while Submitted.");

      const now = serverTimestamp();
      const iRef = doc(itemsRef(batchId), itemId);
      const iSnap = await tx.get(iRef);
      if (!iSnap.exists()) throw new AppError("Item not found.");

      tx.delete(iRef);

      const newCount = Math.max(0, (b.itemCount ?? 1) - 1);
      const result = iSnap.data()!.result ?? "pending";
      tx.update(batchRef(batchId), {
        itemCount: newCount,
        pendingCount: Math.max(0, (b.pendingCount ?? 0) - (result === "pending" ? 1 : 0)),
        hallmarkedCount: Math.max(0, (b.hallmarkedCount ?? 0) - (result === "hallmarked" ? 1 : 0)),
        rejectedCount: Math.max(0, (b.rejectedCount ?? 0) - (result === "rejected" ? 1 : 0)),
        estimatedFee: newCount * (b.feePerItem ?? 75),
        updatedAt: now,
      });
    });
  } catch (err) {
    console.warn("Firestore deleteItem error, falling back to mock:", err);
    const items = MOCK_ITEMS[batchId] || [];
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      items.splice(idx, 1);
      recalcMockBatch(batchId);
      mockStore.emit(`items:${batchId}`);
      mockStore.emit(`batch:${batchId}`);
      mockStore.emit("batches");
    }
  }
}

export async function markItemResult(
  user: UserProfile,
  batchId: string,
  itemId: string,
  result: ItemResult,
  huid?: string,
  rejectionReason?: string
): Promise<void> {
  if (user.role !== "operator") throw new AppError("Only an AHC operator can record item results.");

  const hasMock = Boolean(MOCK_ITEMS[batchId]);
  if (hasMock || !isFirebaseConfigured() || batchId.startsWith("demo-batch") || batchId.startsWith("batch_")) {
    const batch = MOCK_BATCHES.find((b) => b.id === batchId);
    if (!batch) throw new AppError("Batch not found.");

    const item = (MOCK_ITEMS[batchId] || []).find((i) => i.id === itemId);
    if (!item) throw new AppError("Item not found.");

    if (result === "hallmarked") {
      if (!huid) throw new AppError("A HUID is required when marking an item as hallmarked.");
      const normalised = huid.toUpperCase();
      if (!validateHuid(normalised)) throw new AppError("Invalid HUID. Must be exactly 6 characters.");
      item.result = "hallmarked";
      item.huid = normalised;
      item.rejectionReason = null;
    } else if (result === "rejected") {
      if (!rejectionReason || rejectionReason.trim().length < DEFAULTS.minRejectionReasonLength) {
        throw new AppError(`Rejection reason must be at least ${DEFAULTS.minRejectionReasonLength} characters.`);
      }
      item.result = "rejected";
      item.huid = null;
      item.rejectionReason = rejectionReason.trim();
    } else {
      item.result = "pending";
      item.huid = null;
      item.rejectionReason = null;
    }

    item.updatedAt = new Date();
    recalcMockBatch(batchId);

    if (batch.status === "received") {
      batch.status = "tested";
      batch.lastStatusChangeAt = new Date();
      batch.updatedAt = new Date();
      batch.statusHistory.push({
        status: "tested",
        changedAt: new Date(),
        changedByUid: user.uid,
        changedByName: user.name,
      });
      mockStore.emit("batches");
    }

    mockStore.emit(`items:${batchId}`);
    mockStore.emit(`batch:${batchId}`);
    return;
  }

  // Real Firestore
  try {
    if (result === "hallmarked") {
      if (!huid) throw new AppError("A HUID is required when marking an item as hallmarked.");
      const normalised = huid.toUpperCase();
      if (!validateHuid(normalised)) {
        throw new AppError("Invalid HUID. Must be exactly 6 characters (A–Z and 0–9).");
      }
    }

    await runTransaction(db, async (tx) => {
      const bSnap = await tx.get(batchRef(batchId));
      if (!bSnap.exists()) throw new AppError("Batch not found.");
      const b = bSnap.data()!;

      const iRef = doc(itemsRef(batchId), itemId);
      const iSnap = await tx.get(iRef);
      if (!iSnap.exists()) throw new AppError("Item not found.");

      const oldResult = (iSnap.data()!.result ?? "pending") as ItemResult;
      const now = serverTimestamp();

      const counts: Record<string, number> = {
        pendingCount: b.pendingCount ?? 0,
        hallmarkedCount: b.hallmarkedCount ?? 0,
        rejectedCount: b.rejectedCount ?? 0,
      };
      if (oldResult === "pending") counts.pendingCount = Math.max(0, counts.pendingCount - 1);
      if (oldResult === "hallmarked") counts.hallmarkedCount = Math.max(0, counts.hallmarkedCount - 1);
      if (oldResult === "rejected") counts.rejectedCount = Math.max(0, counts.rejectedCount - 1);

      if (result === "pending") counts.pendingCount++;
      if (result === "hallmarked") counts.hallmarkedCount++;
      if (result === "rejected") counts.rejectedCount++;

      const itemPatch: Record<string, unknown> = { result, updatedAt: now };
      if (result === "hallmarked") {
        itemPatch.huid = huid!.toUpperCase();
        itemPatch.rejectionReason = null;
      } else if (result === "rejected") {
        if (!rejectionReason || rejectionReason.trim().length < DEFAULTS.minRejectionReasonLength) {
          throw new AppError(`Rejection reason must be at least ${DEFAULTS.minRejectionReasonLength} characters.`);
        }
        itemPatch.huid = null;
        itemPatch.rejectionReason = rejectionReason.trim();
      } else {
        itemPatch.huid = null;
        itemPatch.rejectionReason = null;
      }

      tx.update(iRef, itemPatch);

      const batchPatch: Record<string, unknown> = { ...counts, updatedAt: now };
      if (b.status === "received") {
        batchPatch.status = "tested";
        batchPatch.lastStatusChangeAt = now;
        batchPatch.statusHistory = [
          ...(b.statusHistory ?? []),
          { status: "tested", changedAt: now, changedByUid: user.uid, changedByName: user.name },
        ];
      }
      tx.update(batchRef(batchId), batchPatch);

      if (result === "hallmarked" && huid) {
        const pubRef = doc(db, "publicHuids", huid.toUpperCase());
        tx.set(pubRef, {
          huid: huid.toUpperCase(),
          articleName: iSnap.data()!.name,
          category: iSnap.data()!.category,
          purity: iSnap.data()!.purity,
          weightGrams: iSnap.data()!.weightGrams,
          hallmarkedAt: now,
          centreName: user.centreName ?? null,
        });
      }

      if (oldResult === "hallmarked" && iSnap.data()!.huid) {
        const oldPubRef = doc(db, "publicHuids", iSnap.data()!.huid as string);
        tx.delete(oldPubRef);
      }
    });
  } catch (err) {
    console.warn("Firestore markItemResult error, falling back to mock:", err);
    const item = (MOCK_ITEMS[batchId] || []).find((i) => i.id === itemId);
    if (item) {
      if (result === "hallmarked" && huid) {
        item.result = "hallmarked";
        item.huid = huid.toUpperCase();
        item.rejectionReason = null;
      } else if (result === "rejected") {
        item.result = "rejected";
        item.huid = null;
        item.rejectionReason = rejectionReason || "Quality test failed";
      } else {
        item.result = "pending";
        item.huid = null;
        item.rejectionReason = null;
      }
      recalcMockBatch(batchId);
      mockStore.emit(`items:${batchId}`);
      mockStore.emit(`batch:${batchId}`);
    }
  }
}

export async function setInvoiceNo(
  user: UserProfile,
  batchId: string,
  itemId: string,
  invoiceNo: string
): Promise<void> {
  const hasMock = Boolean(MOCK_ITEMS[batchId]);
  if (hasMock || !isFirebaseConfigured() || batchId.startsWith("demo-batch") || batchId.startsWith("batch_")) {
    const item = (MOCK_ITEMS[batchId] || []).find((i) => i.id === itemId);
    if (!item) throw new AppError("Item not found.");
    item.invoiceNo = invoiceNo.trim() || null;
    item.updatedAt = new Date();
    mockStore.emit(`items:${batchId}`);
    return;
  }

  try {
    await runTransaction(db, async (tx) => {
      const bSnap = await tx.get(batchRef(batchId));
      if (!bSnap.exists()) throw new AppError("Batch not found.");
      if (bSnap.data()!.jewellerId !== user.uid) throw new AppError("You do not own this batch.");
      const iRef = doc(itemsRef(batchId), itemId);
      tx.update(iRef, { invoiceNo: invoiceNo.trim() || null, updatedAt: serverTimestamp() });
    });
  } catch (err) {
    console.warn("Firestore setInvoiceNo error, falling back to mock:", err);
    const item = (MOCK_ITEMS[batchId] || []).find((i) => i.id === itemId);
    if (item) {
      item.invoiceNo = invoiceNo.trim() || null;
      item.updatedAt = new Date();
      mockStore.emit(`items:${batchId}`);
    }
  }
}
