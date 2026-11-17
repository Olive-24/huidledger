// Core domain types for HUIDLedger

export type Role = "jeweller" | "operator" | "auditor";

export type BatchStatus =
  | "submitted"
  | "received"
  | "tested"
  | "hallmarked"
  | "returned";

export type ItemResult = "pending" | "hallmarked" | "rejected";

export type ItemCategory =
  | "ring"
  | "chain"
  | "bangle"
  | "earring"
  | "pendant"
  | "necklace"
  | "other";

export type ItemPurity = "24K" | "22K" | "18K" | "14K";

// Firestore Timestamp shape (we convert to Date in services)
export interface AppTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  shopName: string | null;    // jeweller only
  centreName: string | null;  // operator only
  createdAt: Date;
}

export interface StatusHistoryEntry {
  status: BatchStatus;
  changedAt: Date;
  changedByUid: string;
  changedByName: string;
}

export interface Batch {
  id: string;
  batchCode: string;
  jewellerId: string;
  jewellerName: string;
  shopName: string | null;
  operatorId: string | null;
  operatorName: string | null;
  centreName: string | null;
  status: BatchStatus;
  itemCount: number;
  pendingCount: number;
  hallmarkedCount: number;
  rejectedCount: number;
  feePerItem: number;
  estimatedFee: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastStatusChangeAt: Date;
  statusHistory: StatusHistoryEntry[];
  isStuck: boolean;
}

export interface Item {
  id: string;
  batchId: string;
  name: string;
  category: ItemCategory;
  purity: ItemPurity;
  weightGrams: number;
  photoUrl: string | null;
  photoPath: string | null;
  result: ItemResult;
  huid: string | null;           // exactly 6 chars A-Z0-9 when hallmarked
  rejectionReason: string | null;
  invoiceNo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicHuid {
  huid: string;
  articleName: string;
  category: string;
  purity: string;
  weightGrams: number;
  hallmarkedAt: Date;
  centreName: string | null;
}

export interface AppConfig {
  feePerItem: number;
  stuckAfterDays: number;
  batchCounter: number;
}

// Form types (used in create/edit flows)
export interface NewBatchForm {
  notes: string;
  items: NewItemForm[];
}

export interface NewItemForm {
  name: string;
  category: ItemCategory;
  purity: ItemPurity;
  weightGrams: number;
  invoiceNo: string;
  photoFile?: File | null;
  photoUrl?: string | null;
  photoPath?: string | null;
}

// Service error type
export class AppError extends Error {
  constructor(
    public userMessage: string,
    cause?: unknown
  ) {
    super(userMessage);
    this.name = "AppError";
    if (cause instanceof Error) this.cause = cause;
  }
}
