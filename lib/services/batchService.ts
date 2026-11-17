// lib/services/batchService.ts — Batch service supporting real Firestore with automatic mock fallback.

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  limit,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { Batch, BatchStatus, NewBatchForm, StatusHistoryEntry, UserProfile } from "@/lib/types";
import { AppError } from "@/lib/types";
import { canMoveStatus, nextStatus } from "@/lib/rules";
import { MOCK_BATCHES, MOCK_ITEMS } from "./mockData";
import { mockStore } from "./mockStore";
import { getConfig } from "./configService";

const BATCHES = collection(db, "batches");

// ── Converters ───────────────────────────────────────────────────────────

function docToBatch(id: string, d: DocumentData): Batch {
  const toDate = (v: Timestamp | null | undefined): Date =>
    v instanceof Timestamp ? v.toDate() : new Date();

  const history: StatusHistoryEntry[] = (d.statusHistory ?? []).map((h: DocumentData) => ({
    status: h.status as BatchStatus,
    changedAt: h.changedAt instanceof Timestamp ? h.changedAt.toDate() : new Date(),
    changedByUid: h.changedByUid,
    changedByName: h.changedByName,
  }));

  return {
    id,
    batchCode: d.batchCode,
    jewellerId: d.jewellerId,
    jewellerName: d.jewellerName,
    shopName: d.shopName ?? null,
    operatorId: d.operatorId ?? null,
    operatorName: d.operatorName ?? null,
    centreName: d.centreName ?? null,
    status: d.status as BatchStatus,
    itemCount: d.itemCount ?? 0,
    pendingCount: d.pendingCount ?? 0,
    hallmarkedCount: d.hallmarkedCount ?? 0,
    rejectedCount: d.rejectedCount ?? 0,
    feePerItem: d.feePerItem ?? 75,
    estimatedFee: d.estimatedFee ?? 0,
    notes: d.notes ?? null,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    lastStatusChangeAt: toDate(d.lastStatusChangeAt),
    statusHistory: history,
    isStuck: d.isStuck ?? false,
  };
}

function snapshotToBatches(snap: QuerySnapshot): Batch[] {
  return snap.docs.map((d) => docToBatch(d.id, d.data()));
}

// ── Subscriptions ────────────────────────────────────────────────────────

export function subscribeToBatchesForUser(
  user: UserProfile,
  callback: (batches: Batch[]) => void
): () => void {
  if (!isFirebaseConfigured()) {
    const send = () => {
      let result: Batch[];
      if (user.role === "jeweller") {
        result = MOCK_BATCHES.filter((b) => b.jewellerId === user.uid);
      } else if (user.role === "operator") {
        result = MOCK_BATCHES.filter(
          (b) => b.operatorId === user.uid || (b.status === "submitted" && !b.operatorId)
        );
      } else {
        result = [...MOCK_BATCHES];
      }
      callback([...result].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    };
    send();
    return mockStore.subscribe("batches", send);
  }

  // Real Firestore onSnapshot
  if (user.role === "jeweller") {
    const q = query(BATCHES, where("jewellerId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const batches = snapshotToBatches(snap);
      batches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(batches);
    });
  }

  if (user.role === "operator") {
    const myBatchesQ = query(BATCHES, where("operatorId", "==", user.uid));
    const availableQ = query(BATCHES, where("status", "==", "submitted"));

    let myBatches: Batch[] = [];
    let available: Batch[] = [];
    let unsub1Fired = false;
    let unsub2Fired = false;

    function merge() {
      if (!unsub1Fired || !unsub2Fired) return;
      const unassignedAvailable = available.filter((b) => !b.operatorId);
      const all = [...myBatches, ...unassignedAvailable];
      const seen = new Set<string>();
      const unique = all.filter((b) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
      unique.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(unique);
    }

    const unsub1 = onSnapshot(myBatchesQ, (snap) => {
      myBatches = snapshotToBatches(snap);
      unsub1Fired = true;
      merge();
    });
    const unsub2 = onSnapshot(availableQ, (snap) => {
      available = snapshotToBatches(snap);
      unsub2Fired = true;
      merge();
    });

    return () => {
      unsub1();
      unsub2();
    };
  }

  // Auditor: all batches
  const q = query(BATCHES, limit(250));
  return onSnapshot(q, (snap) => {
    const batches = snapshotToBatches(snap);
    batches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(batches);
  });
}

export function subscribeToAvailableBatches(callback: (batches: Batch[]) => void): () => void {
  if (!isFirebaseConfigured()) {
    const send = () => {
      const result = MOCK_BATCHES.filter((b) => b.status === "submitted" && !b.operatorId);
      callback([...result].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    };
    send();
    return mockStore.subscribe("batches", send);
  }

  const q = query(BATCHES, where("status", "==", "submitted"));
  return onSnapshot(q, (snap) => {
    const batches = snapshotToBatches(snap).filter((b) => !b.operatorId);
    batches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(batches);
  });
}

export function subscribeToBatch(id: string, callback: (batch: Batch | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    const send = () => {
      callback(MOCK_BATCHES.find((b) => b.id === id) ?? null);
    };
    send();
    const u1 = mockStore.subscribe("batches", send);
    const u2 = mockStore.subscribe(`batch:${id}`, send);
    return () => { u1(); u2(); };
  }

  return onSnapshot(doc(BATCHES, id), (snap) => {
    callback(snap.exists() ? docToBatch(snap.id, snap.data()!) : null);
  });
}

// ── Mutations ────────────────────────────────────────────────────────────

export async function createBatch(user: UserProfile, form: NewBatchForm): Promise<string> {
  if (user.role !== "jeweller") throw new AppError("Only a jeweller can create a batch.");
  if (form.items.length === 0) throw new AppError("A batch must have at least one item.");

  const config = await getConfig();
  const year = new Date().getFullYear();

  if (!isFirebaseConfigured()) {
    config.batchCounter += 1;
    const batchId = `batch_${Date.now()}`;
    const batchCode = `HB-${year}-${String(config.batchCounter).padStart(4, "0")}`;
    const now = new Date();
    const feePerItem = config.feePerItem;

    const newBatch: Batch = {
      id: batchId,
      batchCode,
      jewellerId: user.uid,
      jewellerName: user.name,
      shopName: user.shopName,
      operatorId: null,
      operatorName: null,
      centreName: null,
      status: "submitted",
      itemCount: form.items.length,
      pendingCount: form.items.length,
      hallmarkedCount: 0,
      rejectedCount: 0,
      feePerItem,
      estimatedFee: form.items.length * feePerItem,
      notes: form.notes || null,
      createdAt: now,
      updatedAt: now,
      lastStatusChangeAt: now,
      statusHistory: [
        { status: "submitted", changedAt: now, changedByUid: user.uid, changedByName: user.name },
      ],
      isStuck: false,
    };

    MOCK_BATCHES.push(newBatch);

    MOCK_ITEMS[batchId] = form.items.map((f, i) => ({
      id: `${batchId}_item${i + 1}`,
      batchId,
      name: f.name,
      category: f.category,
      purity: f.purity,
      weightGrams: f.weightGrams,
      photoUrl: f.photoUrl || null,
      photoPath: f.photoPath || null,
      result: "pending" as const,
      huid: null,
      rejectionReason: null,
      invoiceNo: f.invoiceNo || null,
      createdAt: now,
      updatedAt: now,
    }));

    mockStore.emit("batches");
    return batchId;
  }

  // Real Firestore
  const configRef = doc(db, "config", "app");
  const batchRef = doc(BATCHES);
  const now = serverTimestamp();
  let feePerItem = 75;
  let batchCode = "";

  await runTransaction(db, async (tx) => {
    const configSnap = await tx.get(configRef);
    const counter = (configSnap.exists() ? configSnap.data().batchCounter ?? 0 : 0) + 1;
    feePerItem = configSnap.exists() ? configSnap.data().feePerItem ?? 75 : 75;
    batchCode = `HB-${year}-${String(counter).padStart(4, "0")}`;

    const historyEntry = {
      status: "submitted",
      changedAt: now,
      changedByUid: user.uid,
      changedByName: user.name,
    };

    tx.set(batchRef, {
      batchCode,
      jewellerId: user.uid,
      jewellerName: user.name,
      shopName: user.shopName ?? null,
      operatorId: null,
      operatorName: null,
      centreName: null,
      status: "submitted",
      itemCount: form.items.length,
      pendingCount: form.items.length,
      hallmarkedCount: 0,
      rejectedCount: 0,
      feePerItem,
      estimatedFee: form.items.length * feePerItem,
      notes: form.notes || null,
      createdAt: now,
      updatedAt: now,
      lastStatusChangeAt: now,
      statusHistory: [historyEntry],
      isStuck: false,
    });

    tx.set(configRef, { batchCounter: counter }, { merge: true });
  });

  const wb = writeBatch(db);
  form.items.forEach((item) => {
    const itemRef = doc(collection(db, "batches", batchRef.id, "items"));
    wb.set(itemRef, {
      name: item.name,
      category: item.category,
      purity: item.purity,
      weightGrams: item.weightGrams,
      photoUrl: item.photoUrl || null,
      photoPath: item.photoPath || null,
      result: "pending",
      huid: null,
      rejectionReason: null,
      invoiceNo: item.invoiceNo || null,
      createdAt: now,
      updatedAt: now,
    });
  });
  await wb.commit();

  return batchRef.id;
}

export async function claimBatch(user: UserProfile, batchId: string): Promise<void> {
  if (user.role !== "operator") throw new AppError("Only an AHC operator can claim a batch.");

  if (!isFirebaseConfigured()) {
    const batch = MOCK_BATCHES.find((b) => b.id === batchId);
    if (!batch) throw new AppError("Batch not found.");
    if (batch.status !== "submitted") throw new AppError("Only submitted batches can be claimed.");
    if (batch.operatorId) throw new AppError("This batch has already been claimed.");

    const now = new Date();
    batch.operatorId = user.uid;
    batch.operatorName = user.name;
    batch.centreName = user.centreName;
    batch.status = "received";
    batch.lastStatusChangeAt = now;
    batch.updatedAt = now;
    batch.statusHistory.push({
      status: "received",
      changedAt: now,
      changedByUid: user.uid,
      changedByName: user.name,
    });

    mockStore.emit("batches");
    mockStore.emit(`batch:${batchId}`);
    return;
  }

  const bRef = doc(BATCHES, batchId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bRef);
    if (!snap.exists()) throw new AppError("Batch not found.");
    const d = snap.data()!;
    if (d.status !== "submitted") throw new AppError("Only submitted batches can be claimed.");
    if (d.operatorId) throw new AppError("This batch has already been claimed.");

    const now = serverTimestamp();
    const historyEntry = {
      status: "received",
      changedAt: now,
      changedByUid: user.uid,
      changedByName: user.name,
    };

    tx.update(bRef, {
      operatorId: user.uid,
      operatorName: user.name,
      centreName: user.centreName ?? null,
      status: "received",
      lastStatusChangeAt: now,
      updatedAt: now,
      statusHistory: [...(d.statusHistory ?? []), historyEntry],
    });
  });
}

export async function updateBatchStatus(
  user: UserProfile,
  batchId: string,
  targetStatus: BatchStatus
): Promise<void> {
  if (!isFirebaseConfigured()) {
    const batch = MOCK_BATCHES.find((b) => b.id === batchId);
    if (!batch) throw new AppError("Batch not found.");

    const items = MOCK_ITEMS[batchId] ?? [];
    const check = canMoveStatus(batch, targetStatus, user, items);
    if (!check.allowed) throw new AppError(check.reason ?? "Status change not allowed.");

    const now = new Date();
    batch.status = targetStatus;
    batch.lastStatusChangeAt = now;
    batch.updatedAt = now;
    batch.statusHistory.push({
      status: targetStatus,
      changedAt: now,
      changedByUid: user.uid,
      changedByName: user.name,
    });

    mockStore.emit("batches");
    mockStore.emit(`batch:${batchId}`);
    return;
  }

  const bRef = doc(BATCHES, batchId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bRef);
    if (!snap.exists()) throw new AppError("Batch not found.");
    const batch = docToBatch(snap.id, snap.data()!);

    const itemsSnap = await getDocs(collection(db, "batches", batchId, "items"));
    const items = itemsSnap.docs.map((d) => ({
      id: d.id,
      batchId,
      result: d.data().result ?? "pending",
      name: "",
      category: "ring" as const,
      purity: "22K" as const,
      weightGrams: 0,
      photoUrl: null,
      photoPath: null,
      huid: null,
      rejectionReason: null,
      invoiceNo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const check = canMoveStatus(batch, targetStatus, user, items);
    if (!check.allowed) throw new AppError(check.reason ?? "Status change not allowed.");

    const now = serverTimestamp();
    const historyEntry = {
      status: targetStatus,
      changedAt: now,
      changedByUid: user.uid,
      changedByName: user.name,
    };

    tx.update(bRef, {
      status: targetStatus,
      lastStatusChangeAt: now,
      updatedAt: now,
      statusHistory: [...(snap.data()!.statusHistory ?? []), historyEntry],
    });
  });
}

export function getNextStatus(batch: Batch): BatchStatus | null {
  return nextStatus(batch.status);
}
