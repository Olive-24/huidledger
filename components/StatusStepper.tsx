import type { Batch } from "@/lib/types";
import type { StatusHistoryEntry } from "@/lib/types";
import { STATUS_ORDER, STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

interface Props {
  batch: Batch;
}

export default function StatusStepper({ batch }: Props) {
  const currentIdx = STATUS_ORDER.indexOf(batch.status);

  // Build a lookup from status -> history entry
  const historyMap: Partial<Record<string, StatusHistoryEntry>> = {};
  batch.statusHistory.forEach((h) => { historyMap[h.status] = h; });

  return (
    <div className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-4">
      <h3 className="text-sm font-medium text-[#A09880] mb-4">Progress</h3>
      <div className="flex items-start gap-0">
        {STATUS_ORDER.map((status, idx) => {
          const isDone = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const historyEntry = historyMap[status];

          return (
            <div key={status} className="flex flex-1 items-start">
              <div className="flex flex-col items-center w-full">
                {/* Circle + connector */}
                <div className="flex items-center w-full">
                  {/* Left connector */}
                  {idx > 0 && (
                    <div className={`h-0.5 flex-1 ${idx <= currentIdx ? "bg-[#C9A227]" : "bg-[#3A3A3A]"}`} />
                  )}
                  {/* Circle */}
                  <div
                    className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCurrent
                        ? "border-[#C9A227] bg-[#C9A22722] scale-110"
                        : isDone
                        ? "border-[#C9A227] bg-[#C9A227]"
                        : "border-[#3A3A3A] bg-[#242424]"
                    }`}
                    aria-label={`${STATUS_LABELS[status]}${isDone ? " (completed)" : ""}`}
                  >
                    {isDone && !isCurrent && (
                      <svg className="h-3.5 w-3.5 text-black" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {isCurrent && <span className="h-2.5 w-2.5 rounded-full bg-[#C9A227]" />}
                  </div>
                  {/* Right connector */}
                  {idx < STATUS_ORDER.length - 1 && (
                    <div className={`h-0.5 flex-1 ${idx < currentIdx ? "bg-[#C9A227]" : "bg-[#3A3A3A]"}`} />
                  )}
                </div>

                {/* Label + timestamp */}
                <div className="mt-2 text-center px-1">
                  <p className={`text-xs font-medium leading-tight ${isCurrent ? "text-[#C9A227]" : isDone ? "text-[#F5F0E8]" : "text-[#6B6355]"}`}>
                    {STATUS_LABELS[status]}
                  </p>
                  {historyEntry && (
                    <p className="text-xs text-[#6B6355] mt-0.5 leading-tight hidden sm:block">
                      {formatDate(historyEntry.changedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
