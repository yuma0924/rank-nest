"use client";

import { useState, useEffect, useCallback } from "react";

type ToastType = "success" | "error";

interface ToastState {
  message: string;
  visible: boolean;
  type?: ToastType;
}

export function useToast(duration = 3000) {
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false, type: "success" });

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.visible, duration]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ message, visible: true, type });
  }, []);

  return { toast, showToast };
}

export function Toast({ message, visible, type = "success" }: ToastState) {
  if (!message) return null;

  const isError = type === "error";

  const bgClass = isError ? "bg-[#3a1417]" : "bg-[#0f3d2a]";
  const ringClass = isError ? "ring-rose-500/40" : "ring-emerald-500/40";

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-[100] w-[min(380px,calc(100vw_-_24px))] -translate-x-1/2 rounded-xl px-5 py-3.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 transition-all duration-300 ${bgClass} ${ringClass} ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-start gap-3">
        {isError ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ef4444]/25">
            <svg className="h-3.5 w-3.5 text-[#fca5a5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#22a870]/25">
            <svg className="h-3.5 w-3.5 text-[#86efac]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
        <span className="min-w-0 flex-1 text-sm font-medium leading-relaxed tracking-wide text-white">{message}</span>
      </div>
    </div>
  );
}
