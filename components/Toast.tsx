"use client";

import { useEffect, useState } from "react";

interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let toastListeners: ((msg: ToastMessage) => void)[] = [];

export function showToast(message: string, type: ToastMessage["type"] = "success") {
  const msg: ToastMessage = { id: Date.now(), message, type };
  toastListeners.forEach((fn) => fn(msg));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 4000);
    };
    toastListeners.push(handler);
    return () => { toastListeners = toastListeners.filter((fn) => fn !== handler); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-xs w-full" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl text-sm font-medium backdrop-blur-sm transition-all ${
            t.type === "success"
              ? "border-green-500/40 bg-[#1C1C1C] text-green-300"
              : t.type === "error"
              ? "border-red-500/40 bg-[#1C1C1C] text-red-300"
              : "border-[#C9A227]/40 bg-[#1C1C1C] text-[#C9A227]"
          }`}
        >
          <span aria-hidden="true">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
