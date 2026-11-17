import Link from "next/link";
import type { Batch } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { isStuck } from "@/lib/rules";

interface Props {
  batch: Batch;
  stuckAfterDays?: number;
}

export default function BatchCard({ batch, stuckAfterDays = 3 }: Props) {
  const stuck = isStuck(batch, stuckAfterDays);

  return (
    <Link
      href={`/batches/${batch.id}`}
      className="block rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-4 transition-all hover:border-[#C9A227]/40 hover:bg-[#242424] focus-visible:outline-[#C9A227]"
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <span className="font-mono text-sm font-semibold text-[#C9A227]">{batch.batchCode}</span>
          {batch.shopName && (
            <p className="text-xs text-[#6B6355] mt-0.5">{batch.shopName}</p>
          )}
        </div>
        <StatusBadge status={batch.status} size="sm" stuck={stuck} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
        <div>
          <p className="text-xs text-[#6B6355]">Items</p>
          <p className="font-medium text-[#F5F0E8]">{batch.itemCount}</p>
        </div>
        <div>
          <p className="text-xs text-[#6B6355]">Hallmarked</p>
          <p className="font-medium text-green-400">{batch.hallmarkedCount}</p>
        </div>
        <div>
          <p className="text-xs text-[#6B6355]">Rejected</p>
          <p className="font-medium text-red-400">{batch.rejectedCount}</p>
        </div>
        <div>
          <p className="text-xs text-[#6B6355]">Est. Fee</p>
          <p className="font-medium text-[#C9A227]">{formatMoney(batch.estimatedFee)}</p>
        </div>
      </div>

      {batch.centreName && (
        <p className="mt-2 text-xs text-[#6B6355]">
          AHC: {batch.centreName}
          {batch.operatorName ? ` · ${batch.operatorName}` : ""}
        </p>
      )}

      <p className="mt-2 text-xs text-[#6B6355]">
        Created {formatDate(batch.createdAt)}
      </p>
    </Link>
  );
}
