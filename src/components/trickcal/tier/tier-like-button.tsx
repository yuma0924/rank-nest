"use client";

import { cn } from "@/lib/utils";

interface TierLikeButtonProps {
  likesCount: number;
  userLiked: boolean;
  onToggle: () => void;
}

export function TierLikeButton({
  likesCount,
  userLiked,
  onToggle,
}: TierLikeButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
        userLiked
          ? "border-thumbs-up/40 bg-thumbs-up/10 text-thumbs-up"
          : "border-border-primary text-text-muted hover:border-thumbs-up/30 hover:text-thumbs-up"
      )}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
      </svg>
      <span className="leading-none">{likesCount}</span>
    </button>
  );
}
