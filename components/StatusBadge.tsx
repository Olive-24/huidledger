import type { BatchStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";

interface Props {
  status: BatchStatus;
  size?: "sm" | "md";
  stuck?: boolean;
}

export default function StatusBadge({ status, size = "md", stuck }: Props) {
  const base = "inline-flex items-center gap-1.5 rounded-full border font-medium";
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  const colorClass = STATUS_COLORS[status];

  return (
    <span className={`${base} ${sizeClass} ${colorClass}`} aria-label={`Status: ${STATUS_LABELS[status]}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
      {STATUS_LABELS[status]}
      {stuck && (
        <span className="ml-1 rounded-full bg-orange-500/20 border border-orange-500/40 px-1.5 py-0.5 text-xs text-orange-300">
          Stuck
        </span>
      )}
    </span>
  );
}
