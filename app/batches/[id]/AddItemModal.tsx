"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { addItem } from "@/lib/services/itemService";
import {
  uploadItemPhoto,
  deleteItemPhoto,
  validateImageFile,
} from "@/lib/services/storageService";
import type { Batch, NewItemForm, ItemCategory, ItemPurity } from "@/lib/types";
import { CATEGORIES, PURITIES } from "@/lib/constants";
import { Spinner } from "@/components/Spinner";
import { showToast } from "@/components/Toast";
import { AppError } from "@/lib/types";

interface Props {
  batch: Batch;
  onClose: () => void;
}

export default function AddItemModal({ batch, onClose }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<NewItemForm>({
    name: "",
    category: "ring",
    purity: "22K",
    weightGrams: 0,
    invoiceNo: "",
    photoUrl: null,
    photoPath: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setError(null);
    setUploadingPhoto(true);
    setUploadProgress(0);

    try {
      // If a previous photo was uploaded in this session, delete it first
      if (form.photoPath) {
        await deleteItemPhoto(form.photoPath);
      }
      const { photoUrl, photoPath } = await uploadItemPhoto(user.uid, file, (pct) => {
        setUploadProgress(pct);
      });
      setForm((p) => ({ ...p, photoUrl, photoPath }));
      showToast("Photo uploaded successfully!", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    if (form.photoPath) {
      await deleteItemPhoto(form.photoPath);
    }
    setForm((p) => ({ ...p, photoUrl: null, photoPath: null }));
    setUploadProgress(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) { setError("Article name is required."); return; }
    if (form.weightGrams <= 0) { setError("Weight must be greater than 0."); return; }

    setError(null);
    setLoading(true);
    try {
      await addItem(user, batch.id, form);
      showToast("Article added.", "success");
      onClose();
    } catch (e) {
      setError(e instanceof AppError ? e.userMessage : "Failed to add article.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-6 shadow-2xl">
        <h2 id="add-item-title" className="text-lg font-semibold text-[#F5F0E8] mb-4">Add Article</h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

          <div>
            <label htmlFor="add_name" className="block text-xs font-medium text-[#A09880] mb-1">Article name *</label>
            <input id="add_name" type="text" required value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
              placeholder="e.g. Gold Ring" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add_cat" className="block text-xs font-medium text-[#A09880] mb-1">Category</label>
              <select id="add_cat" value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ItemCategory }))}
                className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2 text-sm text-[#F5F0E8] focus:border-[#C9A227] focus:outline-none">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="add_purity" className="block text-xs font-medium text-[#A09880] mb-1">Purity</label>
              <select id="add_purity" value={form.purity}
                onChange={(e) => setForm((p) => ({ ...p, purity: e.target.value as ItemPurity }))}
                className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2 text-sm text-[#F5F0E8] focus:border-[#C9A227] focus:outline-none">
                {PURITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="add_weight" className="block text-xs font-medium text-[#A09880] mb-1">Weight (grams) *</label>
            <input id="add_weight" type="number" step="0.001" min="0.001" required
              value={form.weightGrams || ""}
              onChange={(e) => setForm((p) => ({ ...p, weightGrams: parseFloat(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
              placeholder="e.g. 5.250" />
          </div>

          <div>
            <label htmlFor="add_invoice" className="block text-xs font-medium text-[#A09880] mb-1">Invoice number (optional)</label>
            <input id="add_invoice" type="text"
              value={form.invoiceNo}
              onChange={(e) => setForm((p) => ({ ...p, invoiceNo: e.target.value }))}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#242424] px-3 py-2 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
              placeholder="INV-001" />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-medium text-[#A09880] mb-1">
              Article Photo (optional, max 2MB)
            </label>
            {form.photoUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-[#3A3A3A] bg-[#242424] p-2">
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-[#3A3A3A]">
                  <Image
                    src={form.photoUrl}
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
                  onClick={handleRemovePhoto}
                  className="rounded p-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Remove photo"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  id="modal_photo_input"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={uploadingPhoto}
                  className="block w-full text-xs text-[#A09880] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#C9A227] file:text-black hover:file:opacity-90 cursor-pointer disabled:opacity-50"
                />
                {uploadingPhoto && (
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

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-[#3A3A3A] py-2 text-sm text-[#A09880] hover:border-[#6B6355]">
              Cancel
            </button>
            <button type="submit" disabled={loading || uploadingPhoto}
              className="flex-1 rounded-lg bg-[#C9A227] py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Spinner size="sm" />}
              {loading ? "Adding…" : "Add Article"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
