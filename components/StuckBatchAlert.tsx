import Link from "next/link";
import type { Batch } from "@/lib/types";

interface Props {
  stuckBatches?: Batch[];
  batch?: Batch;
  stuckDays?: number;
}

export default function StuckBatchAlert({ stuckBatches, batch, stuckDays = 3 }: Props) {
  // Case 1: Single batch detail alert
  if (batch) {
    const isBatchStuck = Boolean(batch.isStuck);
    if (!isBatchStuck) return null;

    return (
      <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-amber-200">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">⚠️</span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-300">
              Stuck Batch Alert — Action Required
            </h3>
            <p className="mt-1 text-xs text-amber-200/90 leading-relaxed">
              This batch has been in <span className="font-semibold uppercase tracking-wider text-amber-100">{batch.status}</span> status for over {stuckDays} days without progress.
              {batch.operatorName
                ? ` Assigned to ${batch.operatorName} (${batch.centreName || "AHC"}). Please follow up.`
                : " No AHC operator has claimed this batch yet."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Dashboard banner alert
  if (stuckBatches && stuckBatches.length > 0) {
    return (
      <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-amber-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl" aria-hidden="true">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-300">
                {stuckBatches.length} batch{stuckBatches.length === 1 ? "" : "es"} marked as stuck
              </p>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Batches inactive for &gt;{stuckDays} days without status progression.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stuckBatches.slice(0, 3).map((b) => (
              <Link
                key={b.id}
                href={`/batches/${b.id}`}
                className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-mono font-medium text-amber-200 hover:bg-amber-500/30 transition-colors border border-amber-500/30"
              >
                {b.batchCode} &rarr;
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
