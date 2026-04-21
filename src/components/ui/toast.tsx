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
      className={`fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-bg-card border-2 border-accent/40 px-5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_0_1px_rgba(224,90,168,0.15)] ring-1 ring-accent/10 transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-medium text-text-primary">{message}</span>
      </div>
    </div>
  );
}
