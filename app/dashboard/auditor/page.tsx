"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToBatchesForUser } from "@/lib/services/batchService";
import { subscribeToPublicHuids } from "@/lib/services/publicService";
import type { Batch, PublicHuid } from "@/lib/types";
import { formatDate, formatMoney, formatMs } from "@/lib/format";
import { averageTurnaroundMs, isStuck } from "@/lib/rules";
import { STATUS_LABELS } from "@/lib/constants";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Spinner";
import RoleGuard from "@/components/RoleGuard";
import Link from "next/link";
import type { BatchStatus } from "@/lib/types";

type Tab = "batches" | "huids";
type FilterStatus = "all" | BatchStatus;

function AuditorDashboardInner() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [publicHuids, setPublicHuids] = useState<PublicHuid[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("batches");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [jeweller, setJeweller] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsubBatches = subscribeToBatchesForUser(user, (data) => {
      setBatches(data);
      setLoading(false);
    });
    const unsubHuids = subscribeToPublicHuids((huids) => {
      setPublicHuids(huids);
    });
    return () => {
      unsubBatches();
      unsubHuids();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-8">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // Stats
  const totalItems = batches.reduce((s, b) => s + b.itemCount, 0);
  const totalHallmarked = batches.reduce((s, b) => s + b.hallmarkedCount, 0);
  const totalRejected = batches.reduce((s, b) => s + b.rejectedCount, 0);
  const rejectionRate = totalItems > 0 ? ((totalRejected / totalItems) * 100).toFixed(1) : "0.0";
  const totalFees = batches.reduce((s, b) => s + b.estimatedFee, 0);
  const avgTurnaround = averageTurnaroundMs(batches);
  const stuckCount = batches.filter((b) => isStuck(b, 3)).length;

  // Filter batches
  const filtered = batches.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (jeweller && !b.jewellerName.toLowerCase().includes(jeweller.toLowerCase()) && !(b.shopName?.toLowerCase().includes(jeweller.toLowerCase()))) return false;
    if (dateFrom && b.createdAt < new Date(dateFrom)) return false;
    if (dateTo && b.createdAt > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  // Export CSV
  function exportCSV() {
    if (tab === "batches") {
      const header = ["Batch Code", "Jeweller", "Shop", "Operator", "Centre", "Status", "Items", "Hallmarked", "Rejected", "Est. Fee", "Created At"];
      const rows = filtered.map((b) => [
        b.batchCode, b.jewellerName, b.shopName ?? "", b.operatorName ?? "", b.centreName ?? "",
        STATUS_LABELS[b.status], b.itemCount, b.hallmarkedCount, b.rejectedCount,
        b.estimatedFee, formatDate(b.createdAt),
      ]);
      downloadCSV("huidledger_batches.csv", [header, ...rows]);
    } else {
      const header = ["HUID", "Article", "Category", "Purity", "Weight (g)", "Hallmarked At", "Centre"];
      const rows = publicHuids.map((h) => [
        h.huid, h.articleName, h.category, h.purity, h.weightGrams, formatDate(h.hallmarkedAt), h.centreName ?? "",
      ]);
      downloadCSV("huidledger_huids.csv", [header, ...rows]);
    }
  }

  function downloadCSV(filename: string, data: (string | number)[][]) {
    const content = data.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statuses: FilterStatus[] = ["all", "submitted", "received", "tested", "hallmarked", "returned"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F5F0E8]">Auditor Dashboard</h1>
        <p className="text-sm text-[#A09880] mt-0.5">Read-only view of all hallmarking data</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-8">
        <StatCard label="Total Batches" value={batches.length} />
        <StatCard label="Total Articles" value={totalItems} />
        <StatCard label="Hallmarked" value={totalHallmarked} accent />
        <StatCard label="Rejected" value={totalRejected} />
        <StatCard label="Rejection Rate" value={`${rejectionRate}%`} />
        <StatCard label="Avg. Turnaround" value={avgTurnaround ? formatMs(avgTurnaround) : "—"} sub="returned batches" />
        <StatCard label="Total Est. Fees" value={formatMoney(totalFees)} accent />
        <StatCard label="Stuck Batches" value={stuckCount} warning={stuckCount > 0} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#3A3A3A] pb-0">
        {(["batches", "huids"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t
              ? "border-[#C9A227] text-[#C9A227]"
              : "border-transparent text-[#A09880] hover:text-[#F5F0E8]"
              }`}
          >
            {t === "batches" ? "All Batches" : "Issued HUIDs"}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === "batches" && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s
                  ? "bg-[#C9A227] text-black"
                  : "border border-[#3A3A3A] text-[#A09880] hover:border-[#C9A227]/40"
                  }`}
              >
                {s === "all" ? "All" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={jeweller}
            onChange={(e) => setJeweller(e.target.value)}
            placeholder="Filter by jeweller…"
            className="rounded-lg border border-[#3A3A3A] bg-[#1C1C1C] px-3 py-1.5 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
            aria-label="Filter by jeweller name"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-[#3A3A3A] bg-[#1C1C1C] px-3 py-1.5 text-sm text-[#F5F0E8] focus:border-[#C9A227] focus:outline-none"
            aria-label="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-[#3A3A3A] bg-[#1C1C1C] px-3 py-1.5 text-sm text-[#F5F0E8] focus:border-[#C9A227] focus:outline-none"
            aria-label="To date"
          />
        </div>
      )}

      {/* Export button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={exportCSV}
          className="rounded-lg border border-[#3A3A3A] px-4 py-2 text-sm text-[#A09880] hover:border-[#C9A227]/40 hover:text-[#C9A227] transition-colors"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Batches table */}
      {tab === "batches" && (
        filtered.length === 0 ? (
          <EmptyState message="No batches match your filters." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#3A3A3A]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#3A3A3A] bg-[#1C1C1C]">
                  {["Batch Code", "Jeweller / Shop", "Operator / Centre", "Status", "Items", "Hallmarked", "Rejected", "Est. Fee", "Created"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6B6355] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-[#2E2E2E] hover:bg-[#1C1C1C] transition-colors">
                    <td className="px-4 py-3 font-mono text-[#C9A227] whitespace-nowrap">
                      <Link href={`/batches/${b.id}`} className="hover:underline">{b.batchCode}</Link>
                    </td>
                    <td className="px-4 py-3 text-[#F5F0E8] whitespace-nowrap">
                      {b.jewellerName}
                      {b.shopName && <p className="text-xs text-[#6B6355]">{b.shopName}</p>}
                    </td>
                    <td className="px-4 py-3 text-[#A09880] whitespace-nowrap">
                      {b.operatorName ?? "—"}
                      {b.centreName && <p className="text-xs text-[#6B6355]">{b.centreName}</p>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} size="sm" stuck={isStuck(b, 3)} /></td>
                    <td className="px-4 py-3 text-center text-[#F5F0E8]">{b.itemCount}</td>
                    <td className="px-4 py-3 text-center text-green-400">{b.hallmarkedCount}</td>
                    <td className="px-4 py-3 text-center text-red-400">{b.rejectedCount}</td>
                    <td className="px-4 py-3 text-[#C9A227] whitespace-nowrap">{formatMoney(b.estimatedFee)}</td>
                    <td className="px-4 py-3 text-xs text-[#6B6355] whitespace-nowrap">{formatDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* HUIDs table */}
      {tab === "huids" && (
        <div className="overflow-x-auto rounded-xl border border-[#3A3A3A]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#3A3A3A] bg-[#1C1C1C]">
                {["HUID", "Article", "Category", "Purity", "Weight", "Hallmarked At", "Centre"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6B6355] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {publicHuids.map((h) => (
                <tr key={h.huid} className="border-b border-[#2E2E2E] hover:bg-[#1C1C1C] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-[#C9A227]">{h.huid}</td>
                  <td className="px-4 py-3 text-[#F5F0E8]">{h.articleName}</td>
                  <td className="px-4 py-3 text-[#A09880] capitalize">{h.category}</td>
                  <td className="px-4 py-3 text-[#A09880]">{h.purity}</td>
                  <td className="px-4 py-3 text-[#A09880]">{h.weightGrams.toFixed(3)} g</td>
                  <td className="px-4 py-3 text-xs text-[#6B6355] whitespace-nowrap">{formatDate(h.hallmarkedAt)}</td>
                  <td className="px-4 py-3 text-[#A09880]">{h.centreName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AuditorDashboard() {
  return (
    <RoleGuard allowedRoles={["auditor"]}>
      <AuditorDashboardInner />
    </RoleGuard>
  );
}
