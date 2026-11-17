"use client";

import { useState } from "react";
import { verifyHuid } from "@/lib/services/publicService";
import type { PublicHuid } from "@/lib/types";
import { formatDate, formatWeight } from "@/lib/format";
import { Spinner } from "@/components/Spinner";
import Link from "next/link";
import { AppError } from "@/lib/types";

export default function VerifyPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<PublicHuid | null | "not_found">(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const found = await verifyHuid(input.trim());
      setResult(found ?? "not_found");
    } catch (e) {
      if (e instanceof AppError) {
        setError(e.userMessage);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <Link href="/" className="inline-flex items-center gap-1 mb-6">
          <span className="text-xl font-bold text-[#C9A227]">HUID</span>
          <span className="text-xl font-bold text-[#F5F0E8]">Ledger</span>
        </Link>
        <h1 className="text-2xl font-bold text-[#F5F0E8]">Verify a HUID</h1>
        <p className="text-sm text-[#A09880] mt-2">
          Enter a Hallmark Unique ID (HUID) to look up its hallmarking record.
        </p>
        <p className="mt-2 text-xs text-orange-300 border border-orange-500/30 bg-orange-500/10 rounded-lg px-3 py-1.5 inline-block">
          ⚠️ Data shown here is simulated for demonstration purposes only.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleVerify} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            maxLength={6}
            className="flex-1 rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] px-4 py-3 text-lg font-mono text-[#C9A227] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none tracking-widest text-center"
            placeholder="A1B2C3"
            aria-label="HUID to verify"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={loading || input.trim().length !== 6}
            className="rounded-xl bg-[#C9A227] px-6 py-3 font-semibold text-sm text-black hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Spinner size="sm" />}
            {loading ? "Verifying…" : "Verify"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>
        )}
        <p className="mt-2 text-xs text-[#6B6355] text-center">
          A HUID is exactly 6 characters: uppercase letters (A–Z) and digits (0–9).
        </p>
      </form>

      {/* Result */}
      {result === "not_found" && (
        <div className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-6 text-center">
          <div className="text-4xl mb-3" aria-hidden="true">❌</div>
          <h2 className="font-semibold text-[#F5F0E8]">No hallmark record found</h2>
          <p className="text-sm text-[#A09880] mt-1">
            HUID <code className="font-mono text-[#C9A227]">{input}</code> was not found in the hallmarking database.
          </p>
          <p className="text-xs text-[#6B6355] mt-3">
            If you believe this is an error, contact your jeweller or the hallmarking centre.
          </p>
        </div>
      )}

      {result && result !== "not_found" && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl" aria-hidden="true">✅</div>
            <div>
              <h2 className="font-semibold text-green-300">Hallmark Verified</h2>
              <p className="text-xs text-[#6B6355]">This article is registered in the hallmarking database.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "HUID", value: <span className="font-mono font-bold text-[#C9A227]">{result.huid}</span> },
              { label: "Article", value: result.articleName },
              { label: "Category", value: <span className="capitalize">{result.category}</span> },
              { label: "Purity", value: result.purity },
              { label: "Weight", value: formatWeight(result.weightGrams) },
              { label: "Hallmarked On", value: formatDate(result.hallmarkedAt) },
              { label: "Hallmarked By", value: result.centreName ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-[#1C1C1C] border border-[#3A3A3A] px-3 py-2.5">
                <p className="text-xs text-[#6B6355] mb-0.5">{label}</p>
                <p className="text-sm font-medium text-[#F5F0E8]">{value}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-[#6B6355]">
            ⚠️ This information is simulated for a college demonstration project. It does not represent actual BIS hallmarking data.
          </p>
        </div>
      )}

      {/* Try examples */}
      <div className="mt-8 rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-4">
        <p className="text-xs font-medium text-[#6B6355] mb-2">Try these demo HUIDs:</p>
        <div className="flex flex-wrap gap-2">
          {["A1B2C3", "D4E5F6", "Y5Z6A7", "M3N4O5"].map((huid) => (
            <button
              key={huid}
              onClick={() => { setInput(huid); setResult(null); setError(null); }}
              className="font-mono text-xs rounded-lg border border-[#3A3A3A] px-2.5 py-1 text-[#C9A227] hover:border-[#C9A227]/40 transition-colors"
            >
              {huid}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
