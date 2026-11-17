"use client";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  dangerous?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  dangerous = false,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-6 shadow-2xl">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-[#F5F0E8]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[#A09880]">{message}</p>
        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[#3A3A3A] px-4 py-2 text-sm text-[#A09880] hover:border-[#6B6355] focus-visible:outline-[#C9A227]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-offset-2 ${
              dangerous
                ? "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-500"
                : "bg-[#C9A227] text-black hover:opacity-90 focus-visible:outline-[#C9A227]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
