"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { subscribeToBatchesForUser } from "@/lib/services/batchService";
import { getConfig } from "@/lib/services/configService";
import { seedDemoData } from "@/lib/services/seedService";
import { getFeeForecast, type FeeForecast } from "@/lib/services/forecastService";
import { showToast } from "@/components/Toast";
import type { Batch, AppConfig } from "@/lib/types";
import { isStuck } from "@/lib/rules";
import { formatMoney } from "@/lib/format";
import StatCard from "@/components/StatCard";
import BatchCard from "@/components/BatchCard";
import EmptyState from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Spinner";
import RoleGuard from "@/components/RoleGuard";
import FeeForecastCard from "@/components/FeeForecastCard";
import StuckBatchAlert from "@/components/StuckBatchAlert";
import type { BatchStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";

type FilterStatus = "all" | BatchStatus;

function JewellerDashboardInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [seeding, setSeeding] = useState(false);
  const [forecast, setForecast] = useState<FeeForecast | null>(null);

  async function handleSeed() {
    if (!user) return;
    setSeeding(true);
    try {
      const res = await seedDemoData(user);
      showToast(`Successfully seeded ${res.batchCount} demo batches!`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to seed demo batches.";
      showToast(msg, "error");
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    getConfig().then(setConfig);
    const unsub = subscribeToBatchesForUser(user, (data) => {
      setBatches(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user || batches.length === 0) return;
    let active = true;
    getFeeForecast(user.uid, batches, config?.feePerItem ?? 75).then((data) => {
      if (active) {
        setForecast(data);
      }
    });
    return () => {
      active = false;
    };
  }, [user, batches, config]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const stuckAfterDays = config?.stuckAfterDays ?? 3;
  const stuckBatches = batches.filter((b) => isStuck(b, stuckAfterDays));
  const stuckCount = stuckBatches.length;
  const inProgress = batches.filter((b) => b.status !== "returned").length;
  const hallmarkedItems = batches.reduce((s, b) => s + b.hallmarkedCount, 0);
  const rejectedItems = batches.reduce((s, b) => s + b.rejectedCount, 0);
  const totalFee = batches.reduce((s, b) => s + b.estimatedFee, 0);

  const filteredBatches = batches.filter((b) => {
    const matchStatus = filter === "all" || b.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.batchCode.toLowerCase().includes(q) ||
      (b.notes?.toLowerCase().includes(q) ?? false) ||
      (b.centreName?.toLowerCase().includes(q) ?? false);
    return matchStatus && matchSearch;
  });

  const statuses: FilterStatus[] = ["all", "submitted", "received", "tested", "hallmarked", "returned"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F0E8]">My Batches</h1>
          <p className="text-sm text-[#A09880] mt-0.5">
            {user?.shopName ?? "Jeweller Dashboard"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#C9A227]/40 bg-[#C9A227]/10 px-4 py-2.5 font-medium text-sm text-[#C9A227] hover:bg-[#C9A227]/20 transition-colors disabled:opacity-50"
            title="Create demo batches in Firestore"
          >
            {seeding ? "Seeding…" : "🌱 Seed Demo Batches"}
          </button>
          <Link
            href="/dashboard/jeweller/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#C9A227] px-5 py-2.5 font-semibold text-sm text-black hover:opacity-90 transition-opacity focus-visible:outline-[#C9A227]"
          >
            <span aria-hidden="true">+</span> New Batch
          </Link>
        </div>
      </div>

      {/* Stuck Batches Warning Alert */}
      <StuckBatchAlert stuckBatches={stuckBatches} stuckDays={stuckAfterDays} />

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-8">
        <StatCard label="Total Batches" value={batches.length} />
        <StatCard label="In Progress" value={inProgress} />
        <StatCard label="Hallmarked" value={hallmarkedItems} sub="articles" accent />
        <StatCard label="Rejected" value={rejectedItems} sub="articles" />
        <StatCard label="Est. Total Fees" value={formatMoney(totalFee)} accent />
        <StatCard label="Stuck Batches" value={stuckCount} warning={stuckCount > 0} />
      </div>

      {/* Hallmarking Fee & Volume Forecast (Cloud Function v2 + fallback) */}
      <div className="mb-8">
        <FeeForecastCard forecast={forecast} loading={batches.length > 0 && !forecast} />
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by batch code, notes, centre…"
          className="flex-1 rounded-lg border border-[#3A3A3A] bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
          aria-label="Search batches"
        />
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === s
                  ? "bg-[#C9A227] text-black"
                  : "border border-[#3A3A3A] text-[#A09880] hover:border-[#C9A227]/40"
                }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Batch list */}
      {filteredBatches.length === 0 ? (
        <EmptyState
          message={
            batches.length === 0
              ? "You haven't submitted any batches yet. Create your first batch to get started."
              : "No batches match your search or filter."
          }
          action={
            batches.length === 0
              ? { label: "Create First Batch", onClick: () => router.push("/dashboard/jeweller/new") }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBatches.map((b) => (
            <BatchCard key={b.id} batch={b} stuckAfterDays={stuckAfterDays} />
          ))}
        </div>
      )}

      {/* Fee disclaimer */}
      <p className="mt-8 text-xs text-[#6B6355]">
        * Estimated fee is calculated at ₹{config?.feePerItem ?? 75}/article (configurable) and applies to all submitted articles, including rejected ones. Verify the official BIS hallmarking fee independently.
      </p>
    </div>
  );
}

export default function JewellerDashboard() {
  return (
    <RoleGuard allowedRoles={["jeweller"]}>
      <JewellerDashboardInner />
    </RoleGuard>
  );
}
