// Mock seed data for Phase 1.
// Realistic batches, items, HUIDs covering every status and edge case.

import type { Batch, Item, PublicHuid, UserProfile } from "../types";

const now = new Date("2026-11-17T17:00:00+05:30");
const d = (offsetDays: number, hour = 10) =>
  new Date(now.getTime() + offsetDays * 86400000 + hour * 3600000 - 10 * 3600000);

// ── Users ───────────────────────────────────────────────────────────────

export const MOCK_USERS: UserProfile[] = [
  {
    uid: "u_rajesh",
    name: "Rajesh Kumar",
    email: "rajesh@rajewels.in",
    role: "jeweller",
    shopName: "Rajesh Jewellers, Karol Bagh",
    centreName: null,
    createdAt: d(-60),
  },
  {
    uid: "u_meera",
    name: "Meera Sharma",
    email: "meera@meeragold.in",
    role: "jeweller",
    shopName: "Meera Gold House, Jaipur",
    centreName: null,
    createdAt: d(-45),
  },
  {
    uid: "u_delhiop",
    name: "Amit Singh",
    email: "delhiahc@ahc.in",
    role: "operator",
    shopName: null,
    centreName: "Delhi AHC",
    createdAt: d(-90),
  },
  {
    uid: "u_jaipurop",
    name: "Priya Verma",
    email: "jaipurahc@ahc.in",
    role: "operator",
    shopName: null,
    centreName: "Jaipur AHC",
    createdAt: d(-85),
  },
  {
    uid: "u_auditor",
    name: "Central Auditor",
    email: "auditor@huidledger.in",
    role: "auditor",
    shopName: null,
    centreName: null,
    createdAt: d(-120),
  },
];

// ── Batches ─────────────────────────────────────────────────────────────

export const MOCK_BATCHES: Batch[] = [
  // 1. Returned batch – Rajesh – Delhi AHC
  {
    id: "batch_001",
    batchCode: "HB-2026-0001",
    jewellerId: "u_rajesh",
    jewellerName: "Rajesh Kumar",
    shopName: "Rajesh Jewellers, Karol Bagh",
    operatorId: "u_delhiop",
    operatorName: "Amit Singh",
    centreName: "Delhi AHC",
    status: "returned",
    itemCount: 5,
    pendingCount: 0,
    hallmarkedCount: 4,
    rejectedCount: 1,
    feePerItem: 75,
    estimatedFee: 375,
    notes: "Bridal collection batch",
    createdAt: d(-20),
    updatedAt: d(-5),
    lastStatusChangeAt: d(-5),
    statusHistory: [
      { status: "submitted",  changedAt: d(-20), changedByUid: "u_rajesh",  changedByName: "Rajesh Kumar" },
      { status: "received",   changedAt: d(-18), changedByUid: "u_delhiop", changedByName: "Amit Singh" },
      { status: "tested",     changedAt: d(-12), changedByUid: "u_delhiop", changedByName: "Amit Singh" },
      { status: "hallmarked", changedAt: d(-8),  changedByUid: "u_delhiop", changedByName: "Amit Singh" },
      { status: "returned",   changedAt: d(-5),  changedByUid: "u_delhiop", changedByName: "Amit Singh" },
    ],
    isStuck: false,
  },

  // 2. Hallmarked batch – Rajesh – Delhi AHC
  {
    id: "batch_002",
    batchCode: "HB-2026-0002",
    jewellerId: "u_rajesh",
    jewellerName: "Rajesh Kumar",
    shopName: "Rajesh Jewellers, Karol Bagh",
    operatorId: "u_delhiop",
    operatorName: "Amit Singh",
    centreName: "Delhi AHC",
    status: "hallmarked",
    itemCount: 3,
    pendingCount: 0,
    hallmarkedCount: 3,
    rejectedCount: 0,
    feePerItem: 75,
    estimatedFee: 225,
    notes: null,
    createdAt: d(-10),
    updatedAt: d(-2),
    lastStatusChangeAt: d(-2),
    statusHistory: [
      { status: "submitted",  changedAt: d(-10), changedByUid: "u_rajesh",  changedByName: "Rajesh Kumar" },
      { status: "received",   changedAt: d(-8),  changedByUid: "u_delhiop", changedByName: "Amit Singh" },
      { status: "tested",     changedAt: d(-5),  changedByUid: "u_delhiop", changedByName: "Amit Singh" },
      { status: "hallmarked", changedAt: d(-2),  changedByUid: "u_delhiop", changedByName: "Amit Singh" },
    ],
    isStuck: false,
  },

  // 3. Tested batch – Rajesh – Delhi AHC (some items still pending)
  {
    id: "batch_003",
    batchCode: "HB-2026-0003",
    jewellerId: "u_rajesh",
    jewellerName: "Rajesh Kumar",
    shopName: "Rajesh Jewellers, Karol Bagh",
    operatorId: "u_delhiop",
    operatorName: "Amit Singh",
    centreName: "Delhi AHC",
    status: "tested",
    itemCount: 4,
    pendingCount: 2,
    hallmarkedCount: 1,
    rejectedCount: 1,
    feePerItem: 75,
    estimatedFee: 300,
    notes: "Festive season batch",
    createdAt: d(-6),
    updatedAt: d(-1),
    lastStatusChangeAt: d(-1),
    statusHistory: [
      { status: "submitted", changedAt: d(-6), changedByUid: "u_rajesh",  changedByName: "Rajesh Kumar" },
      { status: "received",  changedAt: d(-4), changedByUid: "u_delhiop", changedByName: "Amit Singh" },
      { status: "tested",    changedAt: d(-1), changedByUid: "u_delhiop", changedByName: "Amit Singh" },
    ],
    isStuck: false,
  },

  // 4. Received batch – Rajesh – Delhi AHC
  {
    id: "batch_004",
    batchCode: "HB-2026-0004",
    jewellerId: "u_rajesh",
    jewellerName: "Rajesh Kumar",
    shopName: "Rajesh Jewellers, Karol Bagh",
    operatorId: "u_delhiop",
    operatorName: "Amit Singh",
    centreName: "Delhi AHC",
    status: "received",
    itemCount: 6,
    pendingCount: 6,
    hallmarkedCount: 0,
    rejectedCount: 0,
    feePerItem: 75,
    estimatedFee: 450,
    notes: "Winter collection – handle with care",
    createdAt: d(-3),
    updatedAt: d(-1),
    lastStatusChangeAt: d(-1),
    statusHistory: [
      { status: "submitted", changedAt: d(-3), changedByUid: "u_rajesh",  changedByName: "Rajesh Kumar" },
      { status: "received",  changedAt: d(-1), changedByUid: "u_delhiop", changedByName: "Amit Singh" },
    ],
    isStuck: false,
  },

  // 5. Submitted batch – Rajesh – unassigned (available for operator to claim)
  {
    id: "batch_005",
    batchCode: "HB-2026-0005",
    jewellerId: "u_rajesh",
    jewellerName: "Rajesh Kumar",
    shopName: "Rajesh Jewellers, Karol Bagh",
    operatorId: null,
    operatorName: null,
    centreName: null,
    status: "submitted",
    itemCount: 2,
    pendingCount: 2,
    hallmarkedCount: 0,
    rejectedCount: 0,
    feePerItem: 75,
    estimatedFee: 150,
    notes: null,
    createdAt: d(-1),
    updatedAt: d(-1),
    lastStatusChangeAt: d(-1),
    statusHistory: [
      { status: "submitted", changedAt: d(-1), changedByUid: "u_rajesh", changedByName: "Rajesh Kumar" },
    ],
    isStuck: false,
  },

  // 6. STUCK batch – Meera – received 10 days ago, no movement
  {
    id: "batch_006",
    batchCode: "HB-2026-0006",
    jewellerId: "u_meera",
    jewellerName: "Meera Sharma",
    shopName: "Meera Gold House, Jaipur",
    operatorId: "u_jaipurop",
    operatorName: "Priya Verma",
    centreName: "Jaipur AHC",
    status: "received",
    itemCount: 8,
    pendingCount: 8,
    hallmarkedCount: 0,
    rejectedCount: 0,
    feePerItem: 75,
    estimatedFee: 600,
    notes: "Anniversary collection",
    createdAt: d(-15),
    updatedAt: d(-10),
    lastStatusChangeAt: d(-10),
    statusHistory: [
      { status: "submitted", changedAt: d(-15), changedByUid: "u_meera",    changedByName: "Meera Sharma" },
      { status: "received",  changedAt: d(-10), changedByUid: "u_jaipurop", changedByName: "Priya Verma" },
    ],
    isStuck: true,
  },

  // 7. Returned batch – Meera – Jaipur AHC (with rejections)
  {
    id: "batch_007",
    batchCode: "HB-2026-0007",
    jewellerId: "u_meera",
    jewellerName: "Meera Sharma",
    shopName: "Meera Gold House, Jaipur",
    operatorId: "u_jaipurop",
    operatorName: "Priya Verma",
    centreName: "Jaipur AHC",
    status: "returned",
    itemCount: 7,
    pendingCount: 0,
    hallmarkedCount: 5,
    rejectedCount: 2,
    feePerItem: 75,
    estimatedFee: 525,
    notes: null,
    createdAt: d(-30),
    updatedAt: d(-18),
    lastStatusChangeAt: d(-18),
    statusHistory: [
      { status: "submitted",  changedAt: d(-30), changedByUid: "u_meera",    changedByName: "Meera Sharma" },
      { status: "received",   changedAt: d(-28), changedByUid: "u_jaipurop", changedByName: "Priya Verma" },
      { status: "tested",     changedAt: d(-24), changedByUid: "u_jaipurop", changedByName: "Priya Verma" },
      { status: "hallmarked", changedAt: d(-21), changedByUid: "u_jaipurop", changedByName: "Priya Verma" },
      { status: "returned",   changedAt: d(-18), changedByUid: "u_jaipurop", changedByName: "Priya Verma" },
    ],
    isStuck: false,
  },

  // 8. Submitted – Meera – unassigned
  {
    id: "batch_008",
    batchCode: "HB-2026-0008",
    jewellerId: "u_meera",
    jewellerName: "Meera Sharma",
    shopName: "Meera Gold House, Jaipur",
    operatorId: null,
    operatorName: null,
    centreName: null,
    status: "submitted",
    itemCount: 3,
    pendingCount: 3,
    hallmarkedCount: 0,
    rejectedCount: 0,
    feePerItem: 75,
    estimatedFee: 225,
    notes: "Diwali leftovers",
    createdAt: d(-2),
    updatedAt: d(-2),
    lastStatusChangeAt: d(-2),
    statusHistory: [
      { status: "submitted", changedAt: d(-2), changedByUid: "u_meera", changedByName: "Meera Sharma" },
    ],
    isStuck: false,
  },
];

// ── Items ────────────────────────────────────────────────────────────────

export const MOCK_ITEMS: Record<string, Item[]> = {
  batch_001: [
    { id: "i001_1", batchId: "batch_001", name: "Gold Ring",        category: "ring",    purity: "22K", weightGrams: 5.230, photoUrl: null, photoPath: null, result: "hallmarked", huid: "A1B2C3", rejectionReason: null, invoiceNo: "INV-2026-001", createdAt: d(-20), updatedAt: d(-8) },
    { id: "i001_2", batchId: "batch_001", name: "Gold Chain",       category: "chain",   purity: "22K", weightGrams: 12.450, photoUrl: null, photoPath: null, result: "hallmarked", huid: "D4E5F6", rejectionReason: null, invoiceNo: "INV-2026-002", createdAt: d(-20), updatedAt: d(-8) },
    { id: "i001_3", batchId: "batch_001", name: "Gold Bangle",      category: "bangle",  purity: "22K", weightGrams: 18.750, photoUrl: null, photoPath: null, result: "hallmarked", huid: "G7H8I9", rejectionReason: null, invoiceNo: null, createdAt: d(-20), updatedAt: d(-8) },
    { id: "i001_4", batchId: "batch_001", name: "Gold Earring Set", category: "earring", purity: "18K", weightGrams: 3.100, photoUrl: null, photoPath: null, result: "hallmarked", huid: "J0K1L2", rejectionReason: null, invoiceNo: "INV-2026-003", createdAt: d(-20), updatedAt: d(-8) },
    { id: "i001_5", batchId: "batch_001", name: "Gold Pendant",     category: "pendant", purity: "18K", weightGrams: 2.800, photoUrl: null, photoPath: null, result: "rejected",   huid: null, rejectionReason: "Purity test failed – alloy content exceeded tolerance", invoiceNo: null, createdAt: d(-20), updatedAt: d(-12) },
  ],

  batch_002: [
    { id: "i002_1", batchId: "batch_002", name: "Gold Necklace",    category: "necklace", purity: "22K", weightGrams: 25.600, photoUrl: null, photoPath: null, result: "hallmarked", huid: "M3N4O5", rejectionReason: null, invoiceNo: "INV-2026-010", createdAt: d(-10), updatedAt: d(-2) },
    { id: "i002_2", batchId: "batch_002", name: "Gold Ring",        category: "ring",     purity: "24K", weightGrams: 4.750, photoUrl: null, photoPath: null, result: "hallmarked", huid: "P6Q7R8", rejectionReason: null, invoiceNo: "INV-2026-011", createdAt: d(-10), updatedAt: d(-2) },
    { id: "i002_3", batchId: "batch_002", name: "Gold Earring Set", category: "earring",  purity: "18K", weightGrams: 2.900, photoUrl: null, photoPath: null, result: "hallmarked", huid: "S9T0U1", rejectionReason: null, invoiceNo: null, createdAt: d(-10), updatedAt: d(-2) },
  ],

  batch_003: [
    { id: "i003_1", batchId: "batch_003", name: "Gold Bangle",      category: "bangle",  purity: "22K", weightGrams: 20.100, photoUrl: null, photoPath: null, result: "hallmarked", huid: "V2W3X4", rejectionReason: null, invoiceNo: null, createdAt: d(-6), updatedAt: d(-1) },
    { id: "i003_2", batchId: "batch_003", name: "Gold Chain",       category: "chain",   purity: "22K", weightGrams: 15.300, photoUrl: null, photoPath: null, result: "rejected",   huid: null, rejectionReason: "Surface finish defect – not meeting BIS standards", invoiceNo: null, createdAt: d(-6), updatedAt: d(-1) },
    { id: "i003_3", batchId: "batch_003", name: "Gold Ring",        category: "ring",    purity: "18K", weightGrams: 4.200, photoUrl: null, photoPath: null, result: "pending",    huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-6), updatedAt: d(-6) },
    { id: "i003_4", batchId: "batch_003", name: "Gold Pendant",     category: "pendant", purity: "14K", weightGrams: 3.600, photoUrl: null, photoPath: null, result: "pending",    huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-6), updatedAt: d(-6) },
  ],

  batch_004: [
    { id: "i004_1", batchId: "batch_004", name: "Gold Ring (22K)",     category: "ring",    purity: "22K", weightGrams: 5.800, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-3), updatedAt: d(-3) },
    { id: "i004_2", batchId: "batch_004", name: "Gold Chain (22K)",    category: "chain",   purity: "22K", weightGrams: 14.200, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-3), updatedAt: d(-3) },
    { id: "i004_3", batchId: "batch_004", name: "Gold Bangle (18K)",   category: "bangle",  purity: "18K", weightGrams: 17.500, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-3), updatedAt: d(-3) },
    { id: "i004_4", batchId: "batch_004", name: "Gold Earring Set",    category: "earring", purity: "22K", weightGrams: 4.300, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-3), updatedAt: d(-3) },
    { id: "i004_5", batchId: "batch_004", name: "Gold Pendant (18K)",  category: "pendant", purity: "18K", weightGrams: 2.100, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-3), updatedAt: d(-3) },
    { id: "i004_6", batchId: "batch_004", name: "Gold Necklace (22K)", category: "necklace", purity: "22K", weightGrams: 22.600, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-3), updatedAt: d(-3) },
  ],

  batch_005: [
    { id: "i005_1", batchId: "batch_005", name: "Gold Ring (24K)", category: "ring",  purity: "24K", weightGrams: 6.100, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-1), updatedAt: d(-1) },
    { id: "i005_2", batchId: "batch_005", name: "Gold Chain",      category: "chain", purity: "22K", weightGrams: 11.800, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-1), updatedAt: d(-1) },
  ],

  batch_006: [
    { id: "i006_1", batchId: "batch_006", name: "Gold Ring A",    category: "ring",    purity: "22K", weightGrams: 5.100, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-15), updatedAt: d(-15) },
    { id: "i006_2", batchId: "batch_006", name: "Gold Ring B",    category: "ring",    purity: "22K", weightGrams: 4.900, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-15), updatedAt: d(-15) },
    { id: "i006_3", batchId: "batch_006", name: "Gold Bangle",    category: "bangle",  purity: "22K", weightGrams: 19.200, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-15), updatedAt: d(-15) },
    { id: "i006_4", batchId: "batch_006", name: "Gold Earrings",  category: "earring", purity: "18K", weightGrams: 3.400, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-15), updatedAt: d(-15) },
    { id: "i006_5", batchId: "batch_006", name: "Gold Pendant",   category: "pendant", purity: "18K", weightGrams: 2.600, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-15), updatedAt: d(-15) },
    { id: "i006_6", batchId: "batch_006", name: "Gold Necklace",  category: "necklace", purity: "22K", weightGrams: 23.100, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-15), updatedAt: d(-15) },
    { id: "i006_7", batchId: "batch_006", name: "Gold Chain",     category: "chain",   purity: "22K", weightGrams: 13.700, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-15), updatedAt: d(-15) },
    { id: "i006_8", batchId: "batch_006", name: "Gold Ring C",    category: "ring",    purity: "24K", weightGrams: 7.200, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-15), updatedAt: d(-15) },
  ],

  batch_007: [
    { id: "i007_1", batchId: "batch_007", name: "Jaipur Gold Ring",    category: "ring",    purity: "22K", weightGrams: 5.500, photoUrl: null, photoPath: null, result: "hallmarked", huid: "Y5Z6A7", rejectionReason: null, invoiceNo: "JR-INV-001", createdAt: d(-30), updatedAt: d(-21) },
    { id: "i007_2", batchId: "batch_007", name: "Jaipur Bangle",       category: "bangle",  purity: "22K", weightGrams: 20.800, photoUrl: null, photoPath: null, result: "hallmarked", huid: "B8C9D0", rejectionReason: null, invoiceNo: "JR-INV-002", createdAt: d(-30), updatedAt: d(-21) },
    { id: "i007_3", batchId: "batch_007", name: "Jaipur Chain",        category: "chain",   purity: "24K", weightGrams: 16.300, photoUrl: null, photoPath: null, result: "hallmarked", huid: "E1F2G3", rejectionReason: null, invoiceNo: "JR-INV-003", createdAt: d(-30), updatedAt: d(-21) },
    { id: "i007_4", batchId: "batch_007", name: "Jaipur Necklace",     category: "necklace", purity: "22K", weightGrams: 28.100, photoUrl: null, photoPath: null, result: "hallmarked", huid: "H4I5J6", rejectionReason: null, invoiceNo: null, createdAt: d(-30), updatedAt: d(-21) },
    { id: "i007_5", batchId: "batch_007", name: "Jaipur Pendant",      category: "pendant", purity: "18K", weightGrams: 2.400, photoUrl: null, photoPath: null, result: "hallmarked", huid: "K7L8M9", rejectionReason: null, invoiceNo: "JR-INV-004", createdAt: d(-30), updatedAt: d(-21) },
    { id: "i007_6", batchId: "batch_007", name: "Jaipur Earring Set",  category: "earring", purity: "18K", weightGrams: 3.900, photoUrl: null, photoPath: null, result: "rejected",   huid: null, rejectionReason: "Weight discrepancy – declared weight does not match measured weight", invoiceNo: null, createdAt: d(-30), updatedAt: d(-24) },
    { id: "i007_7", batchId: "batch_007", name: "Jaipur Ring (Other)", category: "ring",    purity: "14K", weightGrams: 3.200, photoUrl: null, photoPath: null, result: "rejected",   huid: null, rejectionReason: "14K purity test failed – gold content below declared level", invoiceNo: null, createdAt: d(-30), updatedAt: d(-24) },
  ],

  batch_008: [
    { id: "i008_1", batchId: "batch_008", name: "Gold Ring",    category: "ring",   purity: "22K", weightGrams: 5.000, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-2), updatedAt: d(-2) },
    { id: "i008_2", batchId: "batch_008", name: "Gold Bangle",  category: "bangle", purity: "22K", weightGrams: 18.300, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-2), updatedAt: d(-2) },
    { id: "i008_3", batchId: "batch_008", name: "Gold Pendant", category: "pendant", purity: "18K", weightGrams: 2.750, photoUrl: null, photoPath: null, result: "pending", huid: null, rejectionReason: null, invoiceNo: null, createdAt: d(-2), updatedAt: d(-2) },
  ],
};

// ── Public HUIDs (for /verify page) ─────────────────────────────────────

export const MOCK_PUBLIC_HUIDS: PublicHuid[] = [
  { huid: "A1B2C3", articleName: "Gold Ring",        category: "ring",     purity: "22K", weightGrams: 5.230,  hallmarkedAt: d(-8), centreName: "Delhi AHC" },
  { huid: "D4E5F6", articleName: "Gold Chain",       category: "chain",    purity: "22K", weightGrams: 12.450, hallmarkedAt: d(-8), centreName: "Delhi AHC" },
  { huid: "G7H8I9", articleName: "Gold Bangle",      category: "bangle",   purity: "22K", weightGrams: 18.750, hallmarkedAt: d(-8), centreName: "Delhi AHC" },
  { huid: "J0K1L2", articleName: "Gold Earring Set", category: "earring",  purity: "18K", weightGrams: 3.100,  hallmarkedAt: d(-8), centreName: "Delhi AHC" },
  { huid: "M3N4O5", articleName: "Gold Necklace",    category: "necklace", purity: "22K", weightGrams: 25.600, hallmarkedAt: d(-2), centreName: "Delhi AHC" },
  { huid: "P6Q7R8", articleName: "Gold Ring",        category: "ring",     purity: "24K", weightGrams: 4.750,  hallmarkedAt: d(-2), centreName: "Delhi AHC" },
  { huid: "S9T0U1", articleName: "Gold Earring Set", category: "earring",  purity: "18K", weightGrams: 2.900,  hallmarkedAt: d(-2), centreName: "Delhi AHC" },
  { huid: "V2W3X4", articleName: "Gold Bangle",      category: "bangle",   purity: "22K", weightGrams: 20.100, hallmarkedAt: d(-1), centreName: "Delhi AHC" },
  { huid: "Y5Z6A7", articleName: "Jaipur Gold Ring",    category: "ring",    purity: "22K", weightGrams: 5.500,  hallmarkedAt: d(-21), centreName: "Jaipur AHC" },
  { huid: "B8C9D0", articleName: "Jaipur Bangle",       category: "bangle",  purity: "22K", weightGrams: 20.800, hallmarkedAt: d(-21), centreName: "Jaipur AHC" },
  { huid: "E1F2G3", articleName: "Jaipur Chain",        category: "chain",   purity: "24K", weightGrams: 16.300, hallmarkedAt: d(-21), centreName: "Jaipur AHC" },
  { huid: "H4I5J6", articleName: "Jaipur Necklace",     category: "necklace", purity: "22K", weightGrams: 28.100, hallmarkedAt: d(-21), centreName: "Jaipur AHC" },
  { huid: "K7L8M9", articleName: "Jaipur Pendant",      category: "pendant", purity: "18K", weightGrams: 2.400,  hallmarkedAt: d(-21), centreName: "Jaipur AHC" },
];
