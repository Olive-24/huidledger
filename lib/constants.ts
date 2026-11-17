import type { BatchStatus, ItemCategory, ItemPurity, Role } from "./types";

// Status machine order — only forward movement allowed
export const STATUS_ORDER: BatchStatus[] = [
  "submitted",
  "received",
  "tested",
  "hallmarked",
  "returned",
];

export const STATUS_LABELS: Record<BatchStatus, string> = {
  submitted:   "Submitted",
  received:    "Received",
  tested:      "Tested",
  hallmarked:  "Hallmarked",
  returned:    "Returned",
};

export const STATUS_COLORS: Record<BatchStatus, string> = {
  submitted:  "bg-slate-500/20 text-slate-300 border-slate-500/40",
  received:   "bg-blue-500/20 text-blue-300 border-blue-500/40",
  tested:     "bg-amber-500/20 text-amber-300 border-amber-500/40",
  hallmarked: "bg-green-500/20 text-green-300 border-green-500/40",
  returned:   "bg-purple-500/20 text-purple-300 border-purple-500/40",
};

export const STATUS_DOT_COLORS: Record<BatchStatus, string> = {
  submitted:  "bg-slate-400",
  received:   "bg-blue-400",
  tested:     "bg-amber-400",
  hallmarked: "bg-green-400",
  returned:   "bg-purple-400",
};

export const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: "ring",     label: "Ring" },
  { value: "chain",    label: "Chain" },
  { value: "bangle",   label: "Bangle" },
  { value: "earring",  label: "Earring" },
  { value: "pendant",  label: "Pendant" },
  { value: "necklace", label: "Necklace" },
  { value: "other",    label: "Other" },
];

export const PURITIES: { value: ItemPurity; label: string }[] = [
  { value: "24K", label: "24K (999.9)" },
  { value: "22K", label: "22K (916)" },
  { value: "18K", label: "18K (750)" },
  { value: "14K", label: "14K (585)" },
];

export const ROLE_LABELS: Record<Role, string> = {
  jeweller: "Jeweller",
  operator: "AHC Operator",
  auditor:  "Auditor",
};

export const DEFAULTS = {
  feePerItem: 75,
  stuckAfterDays: 3,
  maxItemsPerBatch: 100,
  minItemsPerBatch: 1,
  minRejectionReasonLength: 3,
  huidPattern: /^[A-Z0-9]{6}$/,
} as const;

// Demo user profiles for easy demo login & bootstrapping
export const DEMO_USERS = [
  { email: "rajesh@rajewels.in", password: "demo123", role: "jeweller" as Role, name: "Rajesh Kumar", shopName: "Rajesh Jewellers, Karol Bagh", label: "Jeweller – Rajesh Jewellers" },
  { email: "meera@meeragold.in", password: "demo123", role: "jeweller" as Role, name: "Meera Sharma", shopName: "Meera Gold House, Jaipur", label: "Jeweller – Meera Gold House" },
  { email: "delhiahc@ahc.in", password: "demo123", role: "operator" as Role, name: "Amit Singh", centreName: "Delhi AHC", label: "Operator – Delhi AHC" },
  { email: "jaipurahc@ahc.in", password: "demo123", role: "operator" as Role, name: "Priya Verma", centreName: "Jaipur AHC", label: "Operator – Jaipur AHC" },
  { email: "auditor@huidledger.in", password: "demo123", role: "auditor" as Role, name: "Central Auditor", label: "Auditor" },
] as const;
