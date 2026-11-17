// Pure business-logic functions — no side effects, no Firebase imports.
// Used in both UI (button enable/disable) and will mirror in security rules later.

import type { Batch, BatchStatus, Item, UserProfile } from "./types";
import { DEFAULTS, STATUS_ORDER } from "./constants";

// ── Status Machine ──────────────────────────────────────────────────────

/** Returns the status one step after the current one, or null if already final. */
export function nextStatus(current: BatchStatus): BatchStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  return idx >= 0 && idx < STATUS_ORDER.length - 1
    ? STATUS_ORDER[idx + 1]
    : null;
}

export interface CanMoveResult {
  allowed: boolean;
  reason?: string;
}

/**
 * canMoveStatus — the central policy function.
 * UI uses it to disable buttons and show the reason.
 * Cloud Functions will mirror this logic server-side in Phase 4.
 */
export function canMoveStatus(
  batch: Batch,
  targetStatus: BatchStatus,
  user: UserProfile,
  items: Item[]
): CanMoveResult {
  // Only the assigned operator can change status
  if (user.role !== "operator") {
    return { allowed: false, reason: "Only an AHC operator can move batch status." };
  }

  // Must be the assigned operator (not any operator)
  if (batch.operatorId && batch.operatorId !== user.uid) {
    return { allowed: false, reason: "You are not the assigned operator for this batch." };
  }

  // Must be the exact next step — no skipping, no going back
  const expected = nextStatus(batch.status);
  if (expected !== targetStatus) {
    return {
      allowed: false,
      reason: `Cannot move to "${targetStatus}". Expected next step is "${expected ?? "none"}" (batch is ${batch.status}).`,
    };
  }

  // submitted → received: operator must be assigned (claiming does both steps)
  if (targetStatus === "received" && !batch.operatorId) {
    return { allowed: false, reason: "No operator is assigned to this batch yet." };
  }

  // tested → hallmarked: every item must have a result (no pending)
  if (targetStatus === "hallmarked") {
    const stillPending = items.some((i) => i.result === "pending");
    if (stillPending) {
      return {
        allowed: false,
        reason: "All items must be marked hallmarked or rejected before moving to Hallmarked.",
      };
    }
  }

  return { allowed: true };
}

// ── HUID Validation ─────────────────────────────────────────────────────

/** Returns true if huid matches /^[A-Z0-9]{6}$/. Auto-uppercase happens before calling this. */
export function validateHuid(huid: string): boolean {
  return DEFAULTS.huidPattern.test(huid.toUpperCase());
}

// ── Fee Calculation ─────────────────────────────────────────────────────

/** estimatedFee = itemCount × feePerItem */
export function calculateFee(itemCount: number, feePerItem: number): number {
  return itemCount * feePerItem;
}

// ── Stuck Detection ─────────────────────────────────────────────────────

/**
 * A batch is stuck if it has not reached "returned" and
 * the last status change was more than stuckAfterDays days ago.
 * Phase 1: computed client-side. Phase 4: Cloud Function maintains isStuck field.
 */
export function isStuck(batch: Batch, stuckAfterDays: number): boolean {
  if (batch.status === "returned") return false;
  if (batch.isStuck === true) return true;
  const ms = Date.now() - batch.lastStatusChangeAt.getTime();
  return ms > stuckAfterDays * 24 * 60 * 60 * 1000;
}

// ── Turnaround Time ─────────────────────────────────────────────────────

/**
 * Returns turnaround in milliseconds between batch creation and "returned" status.
 * Returns null if the batch has not been returned yet.
 */
export function turnaroundMs(batch: Batch): number | null {
  if (batch.status !== "returned") return null;
  const returnedEntry = batch.statusHistory.find((h) => h.status === "returned");
  if (!returnedEntry) return null;
  return returnedEntry.changedAt.getTime() - batch.createdAt.getTime();
}

/** Average turnaround of returned batches in milliseconds. */
export function averageTurnaroundMs(batches: Batch[]): number | null {
  const returned = batches
    .map(turnaroundMs)
    .filter((ms): ms is number => ms !== null);
  if (returned.length === 0) return null;
  return returned.reduce((a, b) => a + b, 0) / returned.length;
}

/** Format milliseconds as "X days Y hours" */
export function formatDuration(ms: number): string {
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `${hours}h`;
  if (hours === 0) return `${days}d`;
  return `${days}d ${hours}h`;
}

// ── Item Editability ────────────────────────────────────────────────────

/** Jeweller can add/edit/delete items only while batch is "submitted". */
export function canJewellerEditItems(batch: Batch): boolean {
  return batch.status === "submitted";
}

/**
 * Operator can record/correct item results only while batch is
 * "received" or "tested" (before "hallmarked").
 */
export function canOperatorSetResult(batch: Batch): boolean {
  return batch.status === "received" || batch.status === "tested";
}

/** Items are fully locked once batch is hallmarked or returned. */
export function areItemsReadOnly(batch: Batch): boolean {
  return batch.status === "hallmarked" || batch.status === "returned";
}
