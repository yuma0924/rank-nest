"use client";

import { useState, useEffect, useCallback } from "react";

interface ToastState {
  message: string;
  visible: boolean;
}

export function useToast(duration = 3000) {
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false });

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.visible, duration]);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
  }, []);

  return { toast, showToast };
}

export function Toast({ message, visible }: ToastState) {
  if (!message) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-[#0a0a0c] px-4 py-3 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/10 transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22a870]/20">
          <svg className="h-3 w-3 text-[#22a870]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="text-[13px] font-medium tracking-wide text-white">{message}</span>
      </div>
    </div>
  );
}
