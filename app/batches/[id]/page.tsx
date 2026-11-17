"use client";

import { use, useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { subscribeToBatch, updateBatchStatus, getNextStatus } from "@/lib/services/batchService";
import { subscribeToItems, markItemResult, setInvoiceNo, deleteItem } from "@/lib/services/itemService";
import type { Batch, Item, ItemResult } from "@/lib/types";
import { canMoveStatus, canJewellerEditItems, canOperatorSetResult, areItemsReadOnly, isStuck } from "@/lib/rules";
import { formatDate, formatMoney, formatWeight } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";
import StatusStepper from "@/components/StatusStepper";
import StatCard from "@/components/StatCard";
import { PageSpinner, Spinner } from "@/components/Spinner";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { showToast } from "@/components/Toast";
import { AppError } from "@/lib/types";
import StuckBatchAlert from "@/components/StuckBatchAlert";
import AddItemModal from "./AddItemModal";

// ── Types ────────────────────────────────────────────────────────────────

type Tab = "items" | "reconciliation";

// ── Item result badge ────────────────────────────────────────────────────

function ResultBadge({ result }: { result: ItemResult }) {
  const styles: Record<ItemResult, string> = {
    pending: "bg-[#2E2E2E] text-[#A09880] border-[#3A3A3A]",
    hallmarked: "bg-green-500/20 text-green-300 border-green-500/40",
    rejected: "bg-red-500/20 text-red-300 border-red-500/40",
  };
  const labels: Record<ItemResult, string> = {
    pending: "Pending", hallmarked: "Hallmarked", rejected: "Rejected",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[result]}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {labels[result]}
    </span>
  );
}

// ── Item row (operator sets result inline) ───────────────────────────────

function ItemRow({
  item,
  batch,
  canSet,
  isReadOnly,
  isJewellerOwner,
  onDelete,
  onUpdateInvoice,
  onViewPhoto,
}: {
  item: Item;
  batch: Batch;
  canSet: boolean;
  isReadOnly: boolean;
  isJewellerOwner: boolean;
  onDelete: (id: string) => void;
  onUpdateInvoice: (id: string, val: string) => void;
  onViewPhoto: (url: string, name: string) => void;
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [huidInput, setHuidInput] = useState(item.huid ?? "");
  const [reasonInput, setReasonInput] = useState(item.rejectionReason ?? "");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [invoiceEdit, setInvoiceEdit] = useState(false);
  const [invoiceVal, setInvoiceVal] = useState(item.invoiceNo ?? "");

  async function saveResult(result: ItemResult) {
    if (!user || !batch) return;
    setLocalError(null);
    setSaving(true);
    try {
      await markItemResult(user, batch.id, item.id, result, huidInput || undefined, reasonInput || undefined);
      setExpanded(false);
      showToast(`Item marked as ${result}.`, "success");
    } catch (e) {
      setLocalError(e instanceof AppError ? e.userMessage : "Failed to update item.");
    } finally {
      setSaving(false);
    }
  }

  async function saveInvoice() {
    if (!user) return;
    try {
      await onUpdateInvoice(item.id, invoiceVal);
      setInvoiceEdit(false);
      showToast("Invoice number saved.", "success");
    } catch {
      showToast("Failed to save invoice number.", "error");
    }
  }

  return (
    <div className="border-b border-[#2E2E2E] last:border-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
        {/* Photo thumbnail */}
        {item.photoUrl && (
          <button
            type="button"
            onClick={() => onViewPhoto(item.photoUrl!, item.name)}
            className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-[#3A3A3A] hover:border-[#C9A227] transition-colors focus-visible:outline-[#C9A227]"
            title={`View photo of ${item.name}`}
          >
            <Image
              src={item.photoUrl}
              alt={item.name}
              fill
              unoptimized
              className="object-cover"
            />
          </button>
        )}

        {/* Basic info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#F5F0E8] text-sm truncate">{item.name}</p>
          <p className="text-xs text-[#6B6355]">
            {item.category} · {item.purity} · {formatWeight(item.weightGrams)}
          </p>
        </div>

        {/* Result + HUID */}
        <div className="flex items-center gap-3 flex-wrap">
          <ResultBadge result={item.result} />
          {item.huid && (
            <span className="font-mono text-xs font-semibold text-[#C9A227] bg-[#C9A22722] rounded px-2 py-0.5 border border-[#C9A227]/30">
              {item.huid}
            </span>
          )}
          {item.rejectionReason && (
            <span className="text-xs text-red-300 max-w-[180px] truncate" title={item.rejectionReason}>
              {item.rejectionReason}
            </span>
          )}

          {/* Operator actions */}
          {canSet && !isReadOnly && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="rounded-lg border border-[#3A3A3A] px-2 py-1 text-xs text-[#A09880] hover:border-[#C9A227]/40 hover:text-[#F5F0E8]"
            >
              {expanded ? "Cancel" : item.result === "pending" ? "Set result" : "Edit result"}
            </button>
          )}

          {/* Jeweller delete */}
          {isJewellerOwner && canJewellerEditItems(batch) && (
            <button
              onClick={() => onDelete(item.id)}
              className="text-xs text-red-400 hover:text-red-300"
              aria-label={`Delete ${item.name}`}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Invoice number row */}
      <div className="px-4 pb-2 flex items-center gap-2 text-xs text-[#6B6355]">
        <span>Invoice:</span>
        {invoiceEdit ? (
          <>
            <input
              type="text"
              value={invoiceVal}
              onChange={(e) => setInvoiceVal(e.target.value)}
              className="rounded border border-[#3A3A3A] bg-[#242424] px-2 py-0.5 text-xs text-[#F5F0E8] focus:border-[#C9A227] focus:outline-none"
              placeholder="INV-001"
              autoFocus
            />
            <button onClick={saveInvoice} className="text-[#C9A227] hover:underline">Save</button>
            <button onClick={() => setInvoiceEdit(false)} className="text-[#6B6355] hover:text-[#A09880]">Cancel</button>
          </>
        ) : (
          <>
            <span className="text-[#A09880]">{item.invoiceNo || "—"}</span>
            {isJewellerOwner && (
              <button
                onClick={() => setInvoiceEdit(true)}
                className="text-[#6B6355] hover:text-[#C9A227] ml-1"
                aria-label="Edit invoice number"
              >
                Edit
              </button>
            )}
          </>
        )}
      </div>

      {/* Operator set-result panel */}
      {expanded && canSet && (
        <div className="mx-4 mb-3 rounded-lg border border-[#3A3A3A] bg-[#242424] p-3 space-y-3">
          {localError && (
            <p role="alert" className="text-xs text-red-400">{localError}</p>
          )}

          {/* Hallmark */}
          <div>
            <label htmlFor={`huid_${item.id}`} className="block text-xs font-medium text-[#A09880] mb-1">
              HUID (for Hallmarked)
            </label>
            <div className="flex gap-2">
              <input
                id={`huid_${item.id}`}
                type="text"
                maxLength={6}
                value={huidInput}
                onChange={(e) => setHuidInput(e.target.value.toUpperCase())}
                className="flex-1 rounded border border-[#3A3A3A] bg-[#1C1C1C] px-2 py-1.5 text-sm font-mono text-[#C9A227] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
                placeholder="A1B2C3"
                aria-describedby={`huid_hint_${item.id}`}
              />
              <button
                onClick={() => saveResult("hallmarked")}
                disabled={saving || huidInput.length !== 6}
                className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                {saving && <Spinner size="sm" />}
                Mark Hallmarked
              </button>
            </div>
            <p id={`huid_hint_${item.id}`} className="text-xs text-[#6B6355] mt-0.5">
              Exactly 6 characters, A–Z and 0–9. Converted to uppercase automatically.
            </p>
          </div>

          {/* Reject */}
          <div>
            <label htmlFor={`reason_${item.id}`} className="block text-xs font-medium text-[#A09880] mb-1">
              Rejection reason (for Rejected)
            </label>
            <div className="flex gap-2">
              <input
                id={`reason_${item.id}`}
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                className="flex-1 rounded border border-[#3A3A3A] bg-[#1C1C1C] px-2 py-1.5 text-sm text-[#F5F0E8] placeholder-[#6B6355] focus:border-[#C9A227] focus:outline-none"
                placeholder="e.g. Purity test failed"
              />
              <button
                onClick={() => saveResult("rejected")}
                disabled={saving || reasonInput.trim().length < 3}
                className="rounded bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
              >
                {saving && <Spinner size="sm" />}
                Mark Rejected
              </button>
            </div>
          </div>

          {/* Reset */}
          {item.result !== "pending" && (
            <button
              onClick={() => saveResult("pending")}
              disabled={saving}
              className="text-xs text-[#6B6355] hover:text-[#A09880] underline"
            >
              Reset to Pending
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main batch detail page ────────────────────────────────────────────────

function BatchDetailInner({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();

  const [batch, setBatch] = useState<Batch | null | undefined>(undefined);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<Tab>("items");
  const [movingStatus, setMovingStatus] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    const unsub1 = subscribeToBatch(id, setBatch);
    const unsub2 = subscribeToItems(id, setItems);
    return () => { unsub1(); unsub2(); };
  }, [id]);

  async function handleMoveStatus() {
    if (!user || !batch) return;
    const target = getNextStatus(batch);
    if (!target) return;

    setMoveError(null);
    const check = canMoveStatus(batch, target, user, items);
    if (!check.allowed) {
      setMoveError(check.reason ?? "Status change not allowed.");
      return;
    }

    setMovingStatus(true);
    try {
      await updateBatchStatus(user, batch.id, target);
      showToast(`Batch moved to ${STATUS_LABELS[target]}.`, "success");
    } catch (e) {
      setMoveError(e instanceof AppError ? e.userMessage : "Failed to update status.");
    } finally {
      setMovingStatus(false);
    }
  }

  async function handleDelete(itemId: string) {
    if (!user || !batch) return;
    try {
      await deleteItem(user, batch.id, itemId);
      showToast("Article deleted.", "success");
    } catch (e) {
      showToast(e instanceof AppError ? e.userMessage : "Failed to delete article.", "error");
    }
    setDeleteTarget(null);
  }

  async function handleUpdateInvoice(itemId: string, val: string) {
    if (!user || !batch) return;
    await setInvoiceNo(user, batch.id, itemId, val);
  }

  if (batch === undefined) return <PageSpinner />;
  if (batch === null) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-xl font-semibold text-[#F5F0E8]">Batch not found</h1>
        <p className="text-[#A09880] mt-2">This batch does not exist or you do not have access to it.</p>
        <button onClick={() => router.back()} className="mt-6 rounded-lg bg-[#C9A227] px-4 py-2 text-sm text-black">
          Go Back
        </button>
      </div>
    );
  }

  // Access check
  const isOwner = user?.uid === batch.jewellerId;
  const isAssignedOp = user?.uid === batch.operatorId;
  const isAuditor = user?.role === "auditor";
  const hasAccess = isOwner || isAssignedOp || isAuditor ||
    (user?.role === "operator" && !batch.operatorId && batch.status === "submitted");
  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-5xl mb-4">🔒</p>
        <h1 className="text-xl font-semibold text-[#F5F0E8]">Access Denied</h1>
        <p className="text-[#A09880] mt-2">You do not have permission to view this batch.</p>
        <button onClick={() => router.back()} className="mt-6 rounded-lg bg-[#C9A227] px-4 py-2 text-sm text-black">
          Go Back
        </button>
      </div>
    );
  }

  const stuck = isStuck(batch, 3);
  const nextSt = getNextStatus(batch);
  const moveCheck = nextSt && user ? canMoveStatus(batch, nextSt, user, items) : null;
  const canSet = isAssignedOp && canOperatorSetResult(batch);
  const readOnly = areItemsReadOnly(batch);

  // Reconciliation tab data
  const hallmarkedItems = items.filter((i) => i.result === "hallmarked");
  const linkedItems = hallmarkedItems.filter((i) => i.invoiceNo);
  const unlinkedItems = hallmarkedItems.filter((i) => !i.invoiceNo);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back */}
      <button onClick={() => router.back()} className="text-sm text-[#A09880] hover:text-[#C9A227] mb-6 flex items-center gap-1">
        ← Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold font-mono text-[#C9A227]">{batch.batchCode}</h1>
            <StatusBadge status={batch.status} stuck={stuck} />
          </div>
          <p className="text-sm text-[#A09880]">
            {batch.shopName ?? batch.jewellerName}
            {batch.centreName && ` · ${batch.centreName}`}
          </p>
          <p className="text-xs text-[#6B6355] mt-0.5">Created {formatDate(batch.createdAt)}</p>
          {batch.notes && (
            <p className="mt-2 text-sm text-[#A09880] italic">&ldquo;{batch.notes}&rdquo;</p>
          )}
          {stuck && (
            <div className="mt-4">
              <StuckBatchAlert batch={batch} stuckDays={3} />
            </div>
          )}
        </div>

        {/* Operator move-status button */}
        {isAssignedOp && nextSt && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleMoveStatus}
              disabled={movingStatus || !moveCheck?.allowed}
              className="rounded-xl bg-[#C9A227] px-5 py-2.5 font-semibold text-sm text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={!moveCheck?.allowed ? (moveCheck?.reason ?? "") : ""}
            >
              {movingStatus && <Spinner size="sm" />}
              Move to {STATUS_LABELS[nextSt]}
            </button>
            {!moveCheck?.allowed && moveCheck?.reason && (
              <p className="text-xs text-red-400 max-w-[200px] text-right">{moveCheck.reason}</p>
            )}
            {moveError && <p className="text-xs text-red-400">{moveError}</p>}
          </div>
        )}

        {/* Jeweller add item button */}
        {isOwner && canJewellerEditItems(batch) && (
          <button
            onClick={() => setAddOpen(true)}
            className="rounded-xl border border-[#C9A227]/40 px-4 py-2.5 text-sm font-medium text-[#C9A227] hover:bg-[#C9A22710] transition-colors"
          >
            + Add Article
          </button>
        )}
      </div>

      {/* Status stepper */}
      <div className="mb-6">
        <StatusStepper batch={batch} />
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-6">
        <StatCard label="Total Articles" value={batch.itemCount} />
        <StatCard label="Pending" value={batch.pendingCount} />
        <StatCard label="Hallmarked" value={batch.hallmarkedCount} accent />
        <StatCard label="Rejected" value={batch.rejectedCount} />
        <StatCard label="Est. Fee" value={formatMoney(batch.estimatedFee)} accent />
        <StatCard label="Total Weight" value={formatWeight(items.reduce((s, i) => s + i.weightGrams, 0))} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-[#3A3A3A]">
        {(["items", "reconciliation"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-[#C9A227] text-[#C9A227]" : "border-transparent text-[#A09880] hover:text-[#F5F0E8]"
              }`}
          >
            {t === "items" ? "Articles" : "Reconciliation"}
          </button>
        ))}
      </div>

      {/* Items tab */}
      {tab === "items" && (
        <div className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] overflow-hidden">
          {items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                message="No articles in this batch yet."
                action={isOwner && canJewellerEditItems(batch) ? { label: "Add Article", onClick: () => setAddOpen(true) } : undefined}
              />
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  batch={batch}
                  canSet={canSet}
                  isReadOnly={readOnly}
                  isJewellerOwner={isOwner}
                  onDelete={(id) => setDeleteTarget(id)}
                  onUpdateInvoice={handleUpdateInvoice}
                  onViewPhoto={(url, name) => setSelectedPhoto({ url, title: name })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reconciliation tab */}
      {tab === "reconciliation" && (
        <div className="space-y-5">
          <div className="grid gap-4 grid-cols-3">
            <StatCard label="Hallmarked" value={hallmarkedItems.length} accent />
            <StatCard label="Linked to Invoice" value={linkedItems.length} />
            <StatCard label="Unlinked" value={unlinkedItems.length} warning={unlinkedItems.length > 0} />
          </div>

          {hallmarkedItems.length === 0 ? (
            <EmptyState message="No hallmarked articles to reconcile yet." icon={<span>🏅</span>} />
          ) : (
            <div className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2E2E2E] text-xs text-[#6B6355] font-medium">
                Link each hallmarked article to its invoice number.
              </div>
              {hallmarkedItems.map((item) => (
                <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 border-b border-[#2E2E2E] last:border-0 ${!item.invoiceNo ? "bg-orange-500/5" : ""}`}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#F5F0E8]">{item.name}</p>
                    <p className="text-xs text-[#6B6355]">{item.purity} · {formatWeight(item.weightGrams)}</p>
                    <p className="text-xs font-mono text-[#C9A227] mt-0.5">HUID: {item.huid}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!item.invoiceNo && (
                      <span className="text-xs text-orange-300 border border-orange-500/40 rounded px-1.5 py-0.5 bg-orange-500/10">
                        Not linked
                      </span>
                    )}
                    <InvoiceEditor
                      item={item}
                      jewellerId={batch.jewellerId}
                      onSave={handleUpdateInvoice}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Article"
        message="Are you sure you want to delete this article? This cannot be undone."
        confirmLabel="Delete"
        dangerous
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Add item modal */}
      {addOpen && (
        <AddItemModal
          batch={batch}
          onClose={() => setAddOpen(false)}
        />
      )}

      {/* Click-to-enlarge photo preview dialog */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged article photo"
        >
          <div
            className="relative w-full max-w-xl rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#2E2E2E] mb-3">
              <h3 className="text-sm font-semibold text-[#F5F0E8]">{selectedPhoto.title}</h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="rounded p-1 text-sm text-[#A09880] hover:text-[#F5F0E8]"
                aria-label="Close photo preview"
              >
                ✕
              </button>
            </div>
            <div className="relative h-[55vh] w-full">
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                fill
                unoptimized
                className="object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceEditor({ item, jewellerId, onSave }: {
  item: Item; jewellerId: string;
  onSave: (id: string, val: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.invoiceNo ?? "");

  if (user?.uid !== jewellerId) {
    return <span className="text-sm text-[#A09880]">{item.invoiceNo || "—"}</span>;
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="rounded border border-[#3A3A3A] bg-[#242424] px-2 py-1 text-xs text-[#F5F0E8] focus:border-[#C9A227] focus:outline-none"
          placeholder="INV-001"
          autoFocus
        />
        <button
          onClick={async () => { await onSave(item.id, val); setEditing(false); }}
          className="text-xs text-[#C9A227] hover:underline"
        >
          Save
        </button>
        <button onClick={() => { setVal(item.invoiceNo ?? ""); setEditing(false); }} className="text-xs text-[#6B6355]">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[#A09880]">{item.invoiceNo || "—"}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-[#6B6355] hover:text-[#C9A227]"
        aria-label="Edit invoice number"
      >
        Edit
      </button>
    </div>
  );
}

export default function BatchDetailPage(props: PageProps<"/batches/[id]">) {
  // use(props.params) suspends on dynamic routes when cacheComponents is on.
  // BatchDetailInner is already inside <Suspense> so this is safe.
  return (
    <Suspense fallback={<PageSpinner />}>
      <BatchDetailPageInner params={props.params} />
    </Suspense>
  );
}

function BatchDetailPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BatchDetailInner id={id} />;
}
