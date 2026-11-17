"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createBatch } from "@/lib/services/batchService";
import {
  uploadItemPhoto,
  deleteItemPhoto,
  validateImageFile,
} from "@/lib/services/storageService";
import type { NewItemForm, ItemCategory, ItemPurity } from "@/lib/types";
import { CATEGORIES, PURITIES, DEFAULTS } from "@/lib/constants";
import { formatMoney, formatWeight } from "@/lib/format";
import { Spinner } from "@/components/Spinner";
import RoleGuard from "@/components/RoleGuard";
import { showToast } from "@/components/Toast";
import { AppError } from "@/lib/types";

const EMPTY_ITEM = (): NewItemForm => ({
  name: "",
  category: "ring",
  purity: "22K",
  weightGrams: 0,
  invoiceNo: "",
});

function NewBatchInner() {
  const { user } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<NewItemForm[]>([EMPTY_ITEM()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  async function handlePhotoUpload(idx: number, file: File) {
    if (!user) return;
    const check = validateImageFile(file);
    if (!check.valid) {
      setItemErrors((prev) => ({ ...prev, [idx]: check.error || "Invalid file" }));
      return;
    }
    setUploadingIdx(idx);
    setUploadProgress(0);
    try {
      const existing = items[idx]?.photoPath;
      if (existing) {
        await deleteItemPhoto(existing);
      }
      const { photoUrl, photoPath } = await uploadItemPhoto(user.uid, file, (pct) => {
        setUploadProgress(pct);
      });
      updateItem(idx, { photoUrl, photoPath });
      showToast("Photo uploaded successfully!", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo.";
      setItemErrors((prev) => ({ ...prev, [idx]: msg }));
    } finally {
      setUploadingIdx(null);
    }
  }

  async function handlePhotoRemove(idx: number) {
    const existing = items[idx]?.photoPath;
    if (existing) {
      await deleteItemPhoto(existing);
    }
    updateItem(idx, { photoUrl: null, photoPath: null });
  }

  // Live summary
  const totalWeight = items.reduce((s, i) => s + (i.weightGrams || 0), 0);
  const feePerItem = 75; // Will fetch from config in Phase 2; using default for form preview

  function addItem() {
    if (items.length >= DEFAULTS.maxItemsPerBatch) {
      setError(`Maximum ${DEFAULTS.maxItemsPerBatch} items per batch.`);
      return;
    }
    setItems((prev) => [...prev, EMPTY_ITEM()]);
  }

  function removeItem(idx: number) {
    if (items.length === 1) {
      setError("A batch must have at least one item.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setItemErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }

  function updateItem(idx: number, patch: Partial<NewItemForm>) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
    setItemErrors((prev) => { const next = { ...prev }; delete next[idx]; return next; });
  }

  function validateItems(): boolean {
    const errors: Record<number, string> = {};
    items.forEach((item, idx) => {
      if (!item.name.trim()) errors[idx] = "Article name is required.";
      else if (item.weightGrams <= 0) errors[idx] = "Weight must be greater than 0.";
      else if (item.weightGrams > 9999) errors[idx] = "Weight seems too high. Please check.";
    });
    setItemErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateItems()) {
      setError("Please fix the item errors before submitting.");
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const batchId = await createBatch(user, { notes, items });
      showToast(`Batch created successfully!`, "success");
      router.push(`/batches/${batchId}`);
    } catch (e) {
      const msg = e instanceof AppError ? e.userMessage : "Failed to create batch.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-sm text-[#A09880] hover:text-[#C9A227] mb-4 flex items-center gap-1"
          aria-label="Go back"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-[#F5F0E8]">Create New Batch</h1>
        <p className="text-sm text-[#A09880] mt-1">
          Add all the articles you&apos;re submitting for hallmarking in this batch.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Batch notes */}
        <div className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-5 mb-6">
          <h2 className="font-semibold text-[#F5F0E8] mb-3">Batch Details</h2>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-[#A09880] mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2.5 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none resize-none"
              placeholder="e.g. Bridal collection – handle with care"
            />
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#F5F0E8]">
              Articles ({items.length}/{DEFAULTS.maxItemsPerBatch})
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-[#C9A227] hover:underline"
            >
              + Add article
            </button>
          </div>

          <div className="space-y-5">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-[#2E2E2E] bg-[#242424] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-[#C9A227]">Article #{idx + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-xs text-red-400 hover:text-red-300"
                      aria-label={`Remove article ${idx + 1}`}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {itemErrors[idx] && (
                  <p role="alert" className="text-xs text-red-400 mb-2">{itemErrors[idx]}</p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`name_${idx}`} className="block text-xs font-medium text-[#A09880] mb-1">Article name *</label>
                    <input
                      id={`name_${idx}`} type="text" required
                      value={item.name}
                      onChange={(e) => updateItem(idx, { name: e.target.value })}
                      className="w-full rounded-lg border border-[#3A3A3A] bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
                      placeholder="e.g. Gold Ring"
                    />
                  </div>

                  <div>
                    <label htmlFor={`cat_${idx}`} className="block text-xs font-medium text-[#A09880] mb-1">Category</label>
                    <select
                      id={`cat_${idx}`}
                      value={item.category}
                      onChange={(e) => updateItem(idx, { category: e.target.value as ItemCategory })}
                      className="w-full rounded-lg border border-[#3A3A3A] bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] focus:border-[#C9A227] focus:outline-none"
                    >
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`purity_${idx}`} className="block text-xs font-medium text-[#A09880] mb-1">Purity</label>
                    <select
                      id={`purity_${idx}`}
                      value={item.purity}
                      onChange={(e) => updateItem(idx, { purity: e.target.value as ItemPurity })}
                      className="w-full rounded-lg border border-[#3A3A3A] bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] focus:border-[#C9A227] focus:outline-none"
                    >
                      {PURITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`weight_${idx}`} className="block text-xs font-medium text-[#A09880] mb-1">Weight (grams) *</label>
                    <input
                      id={`weight_${idx}`} type="number" step="0.001" min="0.001" required
                      value={item.weightGrams || ""}
                      onChange={(e) => updateItem(idx, { weightGrams: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-[#3A3A3A] bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
                      placeholder="e.g. 5.250"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor={`invoice_${idx}`} className="block text-xs font-medium text-[#A09880] mb-1">Invoice number (optional)</label>
                    <input
                      id={`invoice_${idx}`} type="text"
                      value={item.invoiceNo}
                      onChange={(e) => updateItem(idx, { invoiceNo: e.target.value })}
                      className="w-full rounded-lg border border-[#3A3A3A] bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
                      placeholder="e.g. INV-2026-001"
                    />
                  </div>

                  {/* Photo upload */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#A09880] mb-1">
                      Article photo (optional, max 2MB)
                    </label>
                    {item.photoUrl ? (
                      <div className="flex items-center gap-3 rounded-lg border border-[#3A3A3A] bg-[#1C1C1C] p-2">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-[#3A3A3A]">
                          <Image
                            src={item.photoUrl}
                            alt="Article preview"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-green-400 font-medium">✓ Photo attached</p>
                          <p className="text-[10px] text-[#6B6355] truncate">Stored securely in Cloud Storage</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePhotoRemove(idx)}
                          className="rounded p-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          id={`photo_${idx}`}
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingIdx === idx}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(idx, file);
                          }}
                          className="block w-full text-xs text-[#A09880] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#C9A227] file:text-black hover:file:opacity-90 cursor-pointer disabled:opacity-50"
                        />
                        {uploadingIdx === idx && (
                          <div className="mt-2 space-y-1">
                            <div className="h-1.5 w-full rounded-full bg-[#3A3A3A] overflow-hidden">
                              <div
                                className="h-full bg-[#C9A227] transition-all duration-200"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-[#A09880]">Uploading... {uploadProgress}%</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 w-full rounded-lg border border-dashed border-[#3A3A3A] py-2.5 text-sm text-[#6B6355] hover:border-[#C9A227]/40 hover:text-[#A09880] transition-colors"
          >
            + Add another article
          </button>
        </div>

        {/* Live summary */}
        <div className="rounded-xl border border-[#C9A227]/30 bg-[#C9A22710] p-5 mb-6">
          <h2 className="font-semibold text-[#C9A227] mb-3">Batch Summary</h2>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-[#A09880]">Total articles</p>
              <p className="font-bold text-[#F5F0E8] text-lg">{items.length}</p>
            </div>
            <div>
              <p className="text-xs text-[#A09880]">Total weight</p>
              <p className="font-bold text-[#F5F0E8] text-lg">{formatWeight(totalWeight)}</p>
            </div>
            <div>
              <p className="text-xs text-[#A09880]">Estimated fee</p>
              <p className="font-bold text-[#C9A227] text-lg">{formatMoney(items.length * feePerItem)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-[#6B6355]">
            Fee is charged for all submitted articles including rejected ones (₹{feePerItem}/article).
            Verify the official BIS hallmarking fee independently.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="w-full rounded-xl bg-[#C9A227] py-3 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Spinner size="sm" />}
          {loading ? "Submitting batch…" : `Submit Batch (${items.length} ${items.length === 1 ? "article" : "articles"})`}
        </button>
      </form>
    </div>
  );
}

export default function NewBatchPage() {
  return (
    <RoleGuard allowedRoles={["jeweller"]}>
      <NewBatchInner />
    </RoleGuard>
  );
}
