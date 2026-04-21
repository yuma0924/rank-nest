"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StarRatingInput } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";

interface CommentFormProps {
  onSubmit: (data: {
    displayName: string;
    rating: number | null;
    body: string;
  }) => void;
  onClose?: () => void;
  showRating?: boolean;
  loading?: boolean;
  className?: string;
}

const MAX_CHARS = 300;
const MAX_LINES = 8;

export function CommentForm({
  onSubmit,
  onClose,
  showRating = true,
  loading = false,
  className,
}: CommentFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState("");

  const lineCount = body.split("\n").length;
  const isOverLimit = body.length > MAX_CHARS || lineCount > MAX_LINES;
  const canSubmit = body.trim().length > 0 && !isOverLimit && !loading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      displayName: displayName.trim() || "名無しの教主",
      rating,
      body: body.trim(),
    });
    setBody("");
    setRating(null);
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const lines = value.split("\n");
    if (lines.length <= MAX_LINES) {
      setBody(value);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("rounded-2xl bg-bg-card border border-border-primary p-4 space-y-3", className)}
    >
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs text-text-secondary">名前（任意）</label>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-secondary"
              aria-label="閉じる"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="名無しの教主"
          maxLength={20}
          className="w-full rounded-xl border border-border-primary bg-bg-input px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted transition-colors focus:border-accent/50 focus:outline-none"
        />
      </div>

      {showRating && (
        <div>
          <label className="mb-2 flex items-baseline gap-2 text-xs text-text-secondary">
            評価（任意）
            <span className="text-xs text-text-tertiary">※入力するとランキングに反映されます</span>
          </label>
          <StarRatingInput value={rating} onChange={setRating} />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-text-secondary">コメント<span className="text-[#f87171]">*</span></label>
        <textarea
          value={body}
          onChange={handleBodyChange}
          placeholder="コメントを入力..."
          rows={4}
          maxLength={MAX_CHARS}
          className="w-full resize-none rounded-xl border border-border-primary bg-bg-input px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted transition-colors focus:border-accent/50 focus:outline-none"
        />
        <div className="mt-1 flex justify-end text-[10px] text-text-tertiary">
          <span className={isOverLimit ? "text-thumbs-down" : ""}>
            {body.length}/{MAX_CHARS}
          </span>
        </div>
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            送信中...
          </span>
        ) : rating !== null ? "投票する" : "コメントする"}
      </Button>
    </form>
  );
}
