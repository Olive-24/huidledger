"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { subscribeToBatchesForUser, subscribeToAvailableBatches, claimBatch } from "@/lib/services/batchService";
import type { Batch } from "@/lib/types";
import { isStuck } from "@/lib/rules";
import { formatMoney } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/constants";
import StatCard from "@/components/StatCard";
import BatchCard from "@/components/BatchCard";
import EmptyState from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Spinner";
import RoleGuard from "@/components/RoleGuard";
import { showToast } from "@/components/Toast";
import { AppError } from "@/lib/types";
import type { BatchStatus } from "@/lib/types";

function OperatorDashboardInner() {
  const { user } = useAuth();
  const [myBatches, setMyBatches] = useState<Batch[]>([]);
  const [available, setAvailable] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let myReady = false, availReady = false;

    const unsub1 = subscribeToBatchesForUser(user, (data) => {
      setMyBatches(data.filter((b) => b.operatorId === user.uid));
      myReady = true;
      if (availReady) setLoading(false);
    });

    const unsub2 = subscribeToAvailableBatches((data) => {
      setAvailable(data);
      availReady = true;
      if (myReady) setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, [user]);

  async function handleClaim(batchId: string) {
    if (!user) return;
    setClaiming(batchId);
    try {
      await claimBatch(user, batchId);
      showToast("Batch claimed and moved to Received.", "success");
    } catch (e) {
      const msg = e instanceof AppError ? e.userMessage : "Failed to claim batch.";
      showToast(msg, "error");
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const inProgress = myBatches.filter((b) => b.status !== "returned").length;
  const returned = myBatches.filter((b) => b.status === "returned").length;
  const stuck = myBatches.filter((b) => isStuck(b, 3)).length;

  // Group my batches by status
  const grouped: Partial<Record<BatchStatus, Batch[]>> = {};
  myBatches.forEach((b) => {
    if (!grouped[b.status]) grouped[b.status] = [];
    grouped[b.status]!.push(b);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F5F0E8]">Operator Dashboard</h1>
        <p className="text-sm text-[#A09880] mt-0.5">{user?.centreName ?? "AHC Dashboard"}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-8">
        <StatCard label="My Batches" value={myBatches.length} />
        <StatCard label="In Progress" value={inProgress} />
        <StatCard label="Returned" value={returned} />
        <StatCard label="Stuck" value={stuck} warning={stuck > 0} />
      </div>

      {/* Available to claim */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-[#F5F0E8] mb-4 flex items-center gap-2">
          Available Batches
          <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-300">{available.length}</span>
        </h2>
        {available.length === 0 ? (
          <EmptyState
            message="No batches are waiting to be claimed. Check back later."
            icon={<span>✓</span>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((b) => (
              <div key={b.id} className="relative rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-4">
                <div className="mb-2">
                  <span className="font-mono text-sm font-semibold text-[#C9A227]">{b.batchCode}</span>
                  <p className="text-xs text-[#6B6355] mt-0.5">{b.shopName ?? b.jewellerName}</p>
                </div>
                <div className="flex gap-4 text-sm mb-3">
                  <div>
                    <p className="text-xs text-[#6B6355]">Items</p>
                    <p className="font-medium text-[#F5F0E8]">{b.itemCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B6355]">Est. Fee</p>
                    <p className="font-medium text-[#C9A227]">{formatMoney(b.estimatedFee)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/batches/${b.id}`}
                    className="flex-1 rounded-lg border border-[#3A3A3A] py-2 text-xs text-center text-[#A09880] hover:border-[#C9A227]/40 transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleClaim(b.id)}
                    disabled={claiming === b.id}
                    className="flex-1 rounded-lg bg-[#C9A227] py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    {claiming === b.id ? "Claiming…" : "Claim Batch"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My batches by status */}
      <section>
        <h2 className="text-lg font-semibold text-[#F5F0E8] mb-4">My Assigned Batches</h2>
        {myBatches.length === 0 ? (
          <EmptyState message="You haven't claimed any batches yet." icon={<span>📋</span>} />
        ) : (
          <div className="space-y-6">
            {(["received", "tested", "hallmarked", "returned"] as BatchStatus[]).map((status) => {
              const group = grouped[status] ?? [];
              if (group.length === 0) return null;
              return (
                <div key={status}>
                  <h3 className="text-sm font-medium text-[#A09880] mb-3">{STATUS_LABELS[status]}</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.map((b) => <BatchCard key={b.id} batch={b} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function OperatorDashboard() {
  return (
    <RoleGuard allowedRoles={["operator"]}>
      <OperatorDashboardInner />
    </RoleGuard>
  );
}
