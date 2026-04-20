"use client";

import { TIER_COLORS } from "@/lib/constants";
import Link from "next/link";
import type { TierLabel } from "@/lib/constants";
import { CharacterIcon } from "@/components/character/character-icon";
import { TierLikeButton } from "@/components/tier/tier-like-button";

type CharacterData = {
  id: string;
  name: string;
  image_url: string | null;
};

interface TierCardProps {
  id: string;
  title: string | null;
  displayName: string | null;
  data: Record<string, string[]>;
  likesCount: number;
  userLiked: boolean;
  createdAt: string;
  commentCount?: number;
  characters: Record<string, CharacterData>;
  onToggleLike: (tierId: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 30) return `${diffDays}日前`;
  return date.toLocaleDateString("ja-JP");
}

// プレビューに表示するティア（S〜Cの4段）
const PREVIEW_LABELS: TierLabel[] = ["S", "A", "B", "C"];

export function TierCard({
  id,
  title,
  displayName,
  data,
  likesCount,
  userLiked,
  createdAt,
  commentCount,
  characters,
  onToggleLike,
}: TierCardProps) {
  return (
    <div className="rounded-2xl border border-border-primary bg-gradient-to-b from-bg-card-alpha to-bg-card-alpha-lighter overflow-hidden transition-colors hover:from-bg-card-alpha hover:to-bg-card-alpha-light">
      <Link href={`/trickcal/tiers/${id}`} className="block">
        {/* ヘッダー */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-bold text-text-primary">
              {title || "無題のティア"}
            </h3>
            <span className="shrink-0 text-xs text-text-muted">
              {formatDate(createdAt)}
            </span>
          </div>
          {displayName && (
            <p className="mt-0.5 text-xs text-text-muted">by {displayName}</p>
          )}
        </div>

        {/* ティアプレビュー（S〜C） */}
        <div className="relative mx-3 mb-2">
          <div className="overflow-hidden rounded-lg border border-border-primary">
            {PREVIEW_LABELS.map((label) => {
              const charIds = data[label] ?? [];
              const isEmpty = charIds.length === 0 && label !== "S";
              return (
                <div
                  key={label}
                  className={`flex border-b border-border-primary last:border-b-0${isEmpty ? " hidden md:flex" : ""}`}
                >
                  <div
                    className="flex w-8 shrink-0 items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: TIER_COLORS[label] }}
                  >
                    {label}
                  </div>
                  <div className="flex min-h-[36px] flex-1 flex-wrap items-center gap-0.5 px-1 py-0.5">
                    {charIds.slice(0, 8).map((charId) => {
                      const char = characters[charId];
                      if (!char) return null;
                      return (
                        <CharacterIcon
                          key={charId}
                          name={char.name}
                          imageUrl={char.image_url}
                          size="sm"
                          className="!h-8 !w-8"
                        />
                      );
                    })}
                    {charIds.length > 8 && (
                      <span className="text-[10px] text-text-muted">
                        +{charIds.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* グラデーションフェード */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-b-lg bg-gradient-to-t from-bg-card-alpha-heavy to-transparent" />
        </div>
      </Link>

      {/* 全て表示 */}
      <div className="flex justify-center -mt-1 mb-0">
        <Link href={`/trickcal/tiers/${id}`} className="text-[10px] text-text-muted hover:text-text-primary transition-colors">
          全て表示 ▼
        </Link>
      </div>

      {/* フッター */}
      <div className="flex items-center justify-between px-3 pb-1.5 -mt-0.5">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {(() => {
            const totalChars = Object.values(data).flat().length;
            return <span>{totalChars}キャラ配置</span>;
          })()}
          {commentCount != null && commentCount > 0 && (
            <span className="flex items-center gap-0.5">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {commentCount}
            </span>
          )}
        </div>
        <TierLikeButton
          likesCount={likesCount}
          userLiked={userLiked}
          onToggle={() => onToggleLike(id)}
        />
      </div>
    </div>
  );
}
