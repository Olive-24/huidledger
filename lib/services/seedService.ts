// lib/services/seedService.ts — Phase 2 seed utility
// Creates demo batches and config in Cloud Firestore for testing.

import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { UserProfile, BatchStatus, ItemCategory, ItemPurity } from "@/lib/types";
import { AppError } from "@/lib/types";

interface SampleItem {
  name: string;
  category: ItemCategory;
  purity: ItemPurity;
  weight: number;
  result?: "pending" | "hallmarked" | "rejected";
  huid?: string;
  reason?: string;
  invoiceNo?: string;
}

interface SampleBatch {
  code: string;
  status: BatchStatus;
  operatorId: string | null;
  operatorName: string | null;
  centreName: string | null;
  notes: string;
  createdDaysAgo: number;
  lastChangeDaysAgo: number;
  items: SampleItem[];
}

export async function seedDemoData(user: UserProfile): Promise<{ batchCount: number }> {
  if (user.role !== "jeweller") {
    throw new AppError("Demo batches can only be seeded while signed in as a jeweller.");
  }

  if (!isFirebaseConfigured()) {
    throw new AppError("You are running in Demo Mode with 8 seed batches active. To seed directly into Cloud Firestore, add your Firebase keys to .env.local.");
  }

  // 1. Ensure config/app exists
  const configRef = doc(db, "config", "app");
  const configSnap = await getDoc(configRef);
  let currentCounter = 100;
  if (!configSnap.exists()) {
    await setDoc(configRef, {
      feePerItem: 75,
      stuckAfterDays: 3,
      batchCounter: 100,
    });
  } else {
    currentCounter = (configSnap.data().batchCounter ?? 100) + 10;
    await setDoc(configRef, { batchCounter: currentCounter }, { merge: true });
  }

  const now = new Date();
  const d = (offsetDays: number, hour = 10) =>
    new Date(now.getTime() + offsetDays * 86400000 + (hour - 10) * 3600000);

  const year = now.getFullYear();

  // 2. Define 4 sample batches for this jeweller
  const sampleBatches: SampleBatch[] = [
    {
      code: `HB-${year}-${String(currentCounter - 3).padStart(4, "0")}`,
      status: "submitted" as BatchStatus,
      operatorId: null,
      operatorName: null,
      centreName: null,
      notes: "Wedding season batch - urgent hallmarking requested",
      createdDaysAgo: -1,
      lastChangeDaysAgo: -1,
      items: [
        { name: "Gold Bangles (Pair)", category: "bangle" as ItemCategory, purity: "22K" as ItemPurity, weight: 24.500 },
        { name: "Bridal Choker", category: "necklace" as ItemCategory, purity: "22K" as ItemPurity, weight: 32.100 },
        { name: "Cocktail Ring", category: "ring" as ItemCategory, purity: "18K" as ItemPurity, weight: 6.450 },
      ],
    },
    {
      code: `HB-${year}-${String(currentCounter - 2).padStart(4, "0")}`,
      status: "received" as BatchStatus,
      operatorId: "demo_op_delhi",
      operatorName: "Amit Singh",
      centreName: "Delhi AHC",
      notes: "Traditional Kundan set collection",
      createdDaysAgo: -5,
      lastChangeDaysAgo: -4, // > 3 days ago -> STUCK batch!
      items: [
        { name: "Heavy Mangalsutra", category: "chain" as ItemCategory, purity: "22K" as ItemPurity, weight: 15.800 },
        { name: "Jhumka Earrings", category: "earring" as ItemCategory, purity: "22K" as ItemPurity, weight: 8.900 },
        { name: "Temple Pendant", category: "pendant" as ItemCategory, purity: "22K" as ItemPurity, weight: 4.250 },
      ],
    },
    {
      code: `HB-${year}-${String(currentCounter - 1).padStart(4, "0")}`,
      status: "tested" as BatchStatus,
      operatorId: "demo_op_delhi",
      operatorName: "Amit Singh",
      centreName: "Delhi AHC",
      notes: "Daily wear rings and chains",
      createdDaysAgo: -3,
      lastChangeDaysAgo: -1,
      items: [
        { name: "Men's Signet Ring", category: "ring" as ItemCategory, purity: "22K" as ItemPurity, weight: 7.200, result: "hallmarked", huid: `H${Math.floor(10000 + Math.random() * 89999)}` },
        { name: "Lightweight Chain", category: "chain" as ItemCategory, purity: "18K" as ItemPurity, weight: 5.100, result: "rejected", reason: "Alloy composition exceeded BIS limits" },
        { name: "Solitaire Studs", category: "earring" as ItemCategory, purity: "18K" as ItemPurity, weight: 2.300, result: "pending" },
      ],
    },
    {
      code: `HB-${year}-${String(currentCounter).padStart(4, "0")}`,
      status: "returned" as BatchStatus,
      operatorId: "demo_op_delhi",
      operatorName: "Amit Singh",
      centreName: "Delhi AHC",
      notes: "Export order completed batch",
      createdDaysAgo: -12,
      lastChangeDaysAgo: -2,
      items: [
        { name: "24K Sovereign Coin Bezel", category: "other" as ItemCategory, purity: "24K" as ItemPurity, weight: 10.000, result: "hallmarked", huid: `G${Math.floor(10000 + Math.random() * 89999)}`, invoiceNo: "INV-DEMO-001" },
        { name: "Floral Gold Necklace", category: "necklace" as ItemCategory, purity: "22K" as ItemPurity, weight: 28.400, result: "hallmarked", huid: `G${Math.floor(10000 + Math.random() * 89999)}`, invoiceNo: "INV-DEMO-002" },
      ],
    },
  ];

  const wb = writeBatch(db);

  for (const b of sampleBatches) {
    const batchRef = doc(collection(db, "batches"));
    const createdAt = Timestamp.fromDate(d(b.createdDaysAgo));
    const lastChangeAt = Timestamp.fromDate(d(b.lastChangeDaysAgo));

    const hallmarkedCount = b.items.filter((i) => i.result === "hallmarked").length;
    const rejectedCount = b.items.filter((i) => i.result === "rejected").length;
    const pendingCount = b.items.length - hallmarkedCount - rejectedCount;

    wb.set(batchRef, {
      batchCode: b.code,
      jewellerId: user.uid,
      jewellerName: user.name,
      shopName: user.shopName ?? "Jeweller Shop",
      operatorId: b.operatorId,
      operatorName: b.operatorName,
      centreName: b.centreName,
      status: b.status,
      itemCount: b.items.length,
      pendingCount,
      hallmarkedCount,
      rejectedCount,
      feePerItem: 75,
      estimatedFee: b.items.length * 75,
      notes: b.notes,
      createdAt,
      updatedAt: lastChangeAt,
      lastStatusChangeAt: lastChangeAt,
      statusHistory: [
        {
          status: "submitted",
          changedAt: createdAt,
          changedByUid: user.uid,
          changedByName: user.name,
        },
        ...(b.status !== "submitted"
          ? [
              {
                status: b.status,
                changedAt: lastChangeAt,
                changedByUid: b.operatorId ?? user.uid,
                changedByName: b.operatorName ?? user.name,
              },
            ]
          : []),
      ],
      isStuck: b.status !== "returned" && (now.getTime() - d(b.lastChangeDaysAgo).getTime()) > 3 * 86400000,
    });

    for (const item of b.items) {
      const itemRef = doc(collection(db, "batches", batchRef.id, "items"));
      wb.set(itemRef, {
        name: item.name,
        category: item.category,
        purity: item.purity,
        weightGrams: item.weight,
        photoUrl: null,
        photoPath: null,
        result: item.result ?? "pending",
        huid: item.huid ?? null,
        rejectionReason: item.reason ?? null,
        invoiceNo: item.invoiceNo ?? null,
        createdAt,
        updatedAt: lastChangeAt,
      });

      // If hallmarked, register in publicHuids
      if (item.result === "hallmarked" && item.huid) {
        const pubRef = doc(db, "publicHuids", item.huid);
        wb.set(pubRef, {
          huid: item.huid,
          articleName: item.name,
          category: item.category,
          purity: item.purity,
          weightGrams: item.weight,
          hallmarkedAt: lastChangeAt,
          centreName: b.centreName ?? "Delhi AHC",
        });
      }
    }
  }

  await wb.commit();
  return { batchCount: sampleBatches.length };
}
