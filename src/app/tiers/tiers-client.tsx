"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TierCard } from "@/components/tier/tier-card";

type CharacterData = {
  id: string;
  name: string;
  image_url: string | null;
};

type TierItem = {
  id: string;
  title: string | null;
  display_name: string | null;
  data: Record<string, string[]>;
  likes_count: number;
  created_at: string;
  comment_count: number;
};

type SortType = "popular" | "newest";

const SORT_TABS: { value: SortType; label: string }[] = [
  { value: "newest", label: "新着順" },
  { value: "popular", label: "人気順" },
];

const PAGE_SIZE = 20;

interface TiersClientProps {
  characters: Record<string, CharacterData>;
  allTiers: TierItem[];
}

export function TiersClient({ characters, allTiers }: TiersClientProps) {
  const [sort, setSort] = useState<SortType>("newest");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeDelta, setLikeDelta] = useState<Record<string, number>>({});

  // APIと同期
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    async function fetchLiked() {
      try {
        const ids = allTiers.map((t) => t.id);
        if (ids.length === 0) return;
        const res = await fetch(`/api/tiers?liked_check=${ids.join(",")}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.liked_ids) {
          setLikedIds(new Set(data.liked_ids));
        }
      } catch {
        // ignore
      }
    }
    fetchLiked();
  }, [allTiers]);

  // クライアント側ソート
  const sortedTiers = useMemo(() => {
    const sorted = [...allTiers];
    if (sort === "popular") {
      sorted.sort((a, b) => {
        const likeDiff = (b.likes_count + (likeDelta[b.id] ?? 0)) - (a.likes_count + (likeDelta[a.id] ?? 0));
        if (likeDiff !== 0) return likeDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [allTiers, sort, likeDelta]);

  const visibleTiers = sortedTiers.slice(0, displayCount);
  const hasMore = displayCount < sortedTiers.length;

  // ソート変更時に表示件数リセット
  const handleSortChange = (newSort: SortType) => {
    setSort(newSort);
    setDisplayCount(PAGE_SIZE);
  };

  const handleToggleLike = async (tierId: string) => {
    const prevLiked = likedIds.has(tierId);
    const newLiked = !prevLiked;

    // 楽観的更新
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (newLiked) next.add(tierId);
      else next.delete(tierId);
      return next;
    });
    setLikeDelta((prev) => ({
      ...prev,
      [tierId]: (prev[tierId] ?? 0) + (newLiked ? 1 : -1),
    }));

    try {
      const res = await fetch(`/api/tiers/${tierId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reaction_type: newLiked ? "up" : null,
        }),
      });
      if (!res.ok) {
        // ロールバック
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (prevLiked) next.add(tierId);
          else next.delete(tierId);
          return next;
        });
        setLikeDelta((prev) => ({
          ...prev,
          [tierId]: (prev[tierId] ?? 0) + (prevLiked ? 1 : -1),
        }));
      }
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (prevLiked) next.add(tierId);
        else next.delete(tierId);
        return next;
      });
      setLikeDelta((prev) => ({
        ...prev,
        [tierId]: (prev[tierId] ?? 0) + (prevLiked ? 1 : -1),
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* 新規作成 + ソート */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleSortChange(tab.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs md:text-sm font-medium transition-colors cursor-pointer",
                sort === tab.value
                  ? "border-accent-active/40 bg-accent-active/12 text-accent-active"
                  : "border-[rgba(139,122,171,0.3)] text-text-muted hover:text-text-tertiary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Link
          href="/tiers/new"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#e05aa8] to-[#e87080] px-4 py-2 text-xs font-bold text-white shadow-[0px_10px_15px_0px_rgba(224,90,168,0.12),0px_4px_6px_0px_rgba(224,90,168,0.12)] transition-opacity hover:opacity-90"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          作成する
        </Link>
      </div>

      {/* ティア一覧 */}
      {sortedTiers.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-text-tertiary">
            まだティアが投稿されていません
          </p>
          <Link
            href="/tiers/new"
            className="mt-3 inline-block rounded-xl bg-gradient-to-r from-[#e05aa8] to-[#e87080] px-6 py-2.5 text-sm font-bold text-white shadow-[0px_10px_15px_0px_rgba(224,90,168,0.12),0px_4px_6px_0px_rgba(224,90,168,0.12)] transition-opacity hover:opacity-90"
          >
            最初のティアを作成する
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visibleTiers.map((tier) => (
            <TierCard
              key={tier.id}
              id={tier.id}
              title={tier.title}
              displayName={tier.display_name}
              data={tier.data}
              likesCount={tier.likes_count + (likeDelta[tier.id] ?? 0)}
              userLiked={likedIds.has(tier.id)}
              createdAt={tier.created_at}
              commentCount={tier.comment_count}
              characters={characters}
              onToggleLike={handleToggleLike}
            />
          ))}
        </div>
      )}

      {/* もっと見る */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
            className="rounded-xl border border-border-primary bg-bg-tertiary px-6 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-card-hover cursor-pointer"
          >
            もっと見る
          </button>
        </div>
      )}

      {/* 他のランキングもチェック */}
      <section className="!mt-10 space-y-3">
        <p className="text-xs md:text-sm font-bold text-text-tertiary">他のランキングもチェック</p>
        <Link
          href="/ranking"
          className="flex items-center gap-3 rounded-[14px] bg-gradient-to-r from-[rgba(255,185,0,0.15)] to-[rgba(255,99,126,0.15)] border border-[rgba(255,185,0,0.1)] px-4 py-3 transition-colors hover:from-[rgba(255,185,0,0.25)] hover:to-[rgba(255,99,126,0.25)] cursor-pointer"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
            style={{ backgroundImage: "linear-gradient(135deg, #ffb900, #e87080)" }}
          >
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
            </svg>
          </span>
          <div className="flex-1">
            <span className="block text-sm md:text-base font-bold text-text-primary">人気キャラランキング</span>
            <span className="text-[10px] md:text-xs text-text-muted">投票で決まる最強キャラをチェック</span>
          </div>
          <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          href="/builds"
          className="flex items-center gap-3 rounded-[14px] bg-gradient-to-r from-[rgba(59,130,246,0.15)] to-[rgba(6,182,212,0.15)] border border-[rgba(59,130,246,0.1)] px-4 py-3 transition-colors hover:from-[rgba(59,130,246,0.25)] hover:to-[rgba(6,182,212,0.25)] cursor-pointer"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
            style={{ backgroundImage: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </span>
          <div className="flex-1">
            <span className="block text-sm md:text-base font-bold text-text-primary">人気編成ランキング</span>
            <span className="text-[10px] md:text-xs text-text-muted">人気のパーティ編成をチェックしよう</span>
          </div>
          <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
