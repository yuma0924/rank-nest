"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { StaticIcon } from "@/components/ui/static-icon";
import { Button } from "@/components/ui/button";
import { CharacterIcon } from "@/components/trickcal/character/character-icon";
import { ThumbsUpDown } from "@/components/reaction/thumbs-up-down";
import { cn } from "@/lib/utils";
import { ELEMENTS, ELEMENT_ICONS, BUILD_MODE_OPTIONS, BUILD_MODE_LABEL_MAP } from "@/lib/trickcal/constants";
import type { BuildMode } from "@/lib/trickcal/constants";
import { useToast, Toast } from "@/components/ui/toast";
import { BuildPostForm } from "./build-post-form";

// API レスポンスの型
type CharacterInfo = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  position: string | null;
  image_url: string | null;
  is_hidden: boolean;
};

type BuildItem = {
  id: string;
  mode: "general" | "arena" | "dimension" | "world_tree";
  party_size: number;
  members: string[];
  members_detail: CharacterInfo[];
  element_label: string | null;
  title: string | null;
  display_name: string | null;
  comment: string;
  likes_count: number;
  dislikes_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_reaction: "up" | "down" | null;
  comments_count: number;
};



type SortKey = "popular" | "newest";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "人気" },
  { value: "newest", label: "新着" },
];


/**
 * 自浄作用の CSS クラスを計算
 */
function getKarmaClass(likesCount: number, dislikesCount: number): string {
  const net = likesCount - dislikesCount;
  if (net >= 30) return "karma-gold";
  if (net >= 15) return "karma-bold";
  if (net <= -30) return "karma-very-dim";
  if (net <= -15) return "karma-dim";
  return "";
}

/**
 * 日時を相対表記でフォーマット
 */
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

interface BuildsClientProps {
  initialBuilds?: {
    builds: BuildItem[];
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export function BuildsClient({ initialBuilds }: BuildsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URLパラメータからフィルター状態を復元
  const mode = (searchParams.get("mode") as BuildMode) || "general";
  const elementFilter = searchParams.get("element"); // 単一選択。null なら全て
  const sortKey = (searchParams.get("sort") as SortKey) || "popular";

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // 古いキー(elements 複数選択)は完全に除去
    params.delete("elements");
    // デフォルト値は削除
    if (params.get("mode") === "general") params.delete("mode");
    if (params.get("sort") === "popular") params.delete("sort");
    const query = params.toString();
    router.replace(query ? `?${query}` : "/trickcal/builds", { scroll: false });
  }, [searchParams, router]);

  const setMode = useCallback((newMode: BuildMode) => {
    updateParams({ mode: newMode, element: null });
  }, [updateParams]);

  const setElementFilter = useCallback((next: string | null) => {
    updateParams({ element: next });
  }, [updateParams]);

  const setSortKey = useCallback((newSort: SortKey) => {
    updateParams({ sort: newSort });
  }, [updateParams]);
  const [builds, setBuilds] = useState<BuildItem[]>(initialBuilds?.builds ?? []);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialBuilds?.hasMore ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialBuilds?.nextCursor ?? null);
  const [initialLoaded, setInitialLoaded] = useState(!!initialBuilds);
  const [formOpen, setFormOpen] = useState(false);
  const { toast, showToast } = useToast();

  // mode 変更時にだけサーバーフェッチ。要素フィルターはクライアント側で即時適用
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // mode ごとのレスポンスキャッシュ（同セッション内で再訪時に即時表示）
  const buildsCacheRef = useRef<
    Map<string, { builds: BuildItem[]; hasMore: boolean; nextCursor: string | null }>
  >(new Map());
  // 初回 initialBuilds をキャッシュに登録
  if (initialBuilds && !buildsCacheRef.current.has("general")) {
    buildsCacheRef.current.set("general", {
      builds: initialBuilds.builds,
      hasMore: initialBuilds.hasMore,
      nextCursor: initialBuilds.nextCursor,
    });
  }

  const fetchBuilds = useCallback(
    async (cursorId?: string, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      // ページネーションでない時のみ abort 適用（追加読み込みは中断しない）
      if (!cursorId) {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
      }
      const controller = abortRef.current!;
      const myId = ++requestIdRef.current;

      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams({ mode });
        // 要素フィルターはサーバーに送らない（クライアント側で適用）
        params.set("sort", "popular");
        if (cursorId) params.set("cursor", cursorId);

        const res = await fetch(`/api/builds?${params.toString()}`, {
          signal: cursorId ? undefined : controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch builds");

        const data = await res.json();
        if (!cursorId && myId !== requestIdRef.current) return;

        if (cursorId) {
          setBuilds((prev) => {
            const merged = [...prev, ...data.builds];
            buildsCacheRef.current.set(mode, {
              builds: merged,
              hasMore: data.has_more,
              nextCursor: data.next_cursor,
            });
            return merged;
          });
        } else {
          setBuilds(data.builds);
          buildsCacheRef.current.set(mode, {
            builds: data.builds,
            hasMore: data.has_more,
            nextCursor: data.next_cursor,
          });
        }
        setNextCursor(data.next_cursor);
        setHasMore(data.has_more);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      } finally {
        if (!silent && (cursorId || myId === requestIdRef.current)) {
          setLoading(false);
          setInitialLoaded(true);
        }
        if (silent) setInitialLoaded(true);
      }
    },
    [mode]
  );

  // mode 変更時のみ再フェッチ（要素フィルターはクライアント側）。
  // 訪問済み mode はキャッシュから即時復元しつつ、裏で SWR 的に再取得して
  // 最新の投稿・リアクション数を反映する。
  const initialSkip = useRef(!!initialBuilds);
  useEffect(() => {
    if (initialSkip.current && mode === "general") {
      initialSkip.current = false;
      // 初回 SSR データは ISR(60秒) で最大1分古い可能性。裏で軽く再取得
      fetchBuilds(undefined, { silent: true });
      return;
    }
    initialSkip.current = false;

    const cached = buildsCacheRef.current.get(mode);
    if (cached) {
      setBuilds(cached.builds);
      setHasMore(cached.hasMore);
      setNextCursor(cached.nextCursor);
      // バックグラウンドで最新データを取得（スピナー無し）
      fetchBuilds(undefined, { silent: true });
      return;
    }
    setBuilds([]);
    setNextCursor(null);
    setHasMore(false);
    fetchBuilds();
  }, [fetchBuilds, mode]);

  // builds 変更（リアクション・楽観的更新など）をキャッシュに反映
  useEffect(() => {
    if (builds.length === 0) return;
    buildsCacheRef.current.set(mode, { builds, hasMore, nextCursor });
  }, [builds, hasMore, nextCursor, mode]);

  // クライアント側で要素フィルター → ソート
  // 単一性格の編成は element_label 一致で判定。混合編成はメンバーに該当性格が
  // 含まれていれば一致扱いとする（例: 純粋を選択 → 混合編成のうち純粋メンバーが
  // 1人でもいるものは表示）。
  const sortedBuilds = useMemo(() => {
    const filtered = elementFilter
      ? builds.filter((b) => {
          if (b.element_label === elementFilter) return true;
          if (b.element_label === "混合") {
            return b.members_detail.some((m) => m.element === elementFilter);
          }
          return false;
        })
      : builds;
    const sorted = [...filtered];
    if (sortKey === "newest") {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      sorted.sort((a, b) => {
        const netA = a.likes_count - a.dislikes_count;
        const netB = b.likes_count - b.dislikes_count;
        if (netB !== netA) return netB - netA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    return sorted;
  }, [builds, sortKey, elementFilter]);

  const handleLoadMore = () => {
    if (nextCursor && !loading) {
      fetchBuilds(nextCursor);
    }
  };

  const handleReaction = async (
    buildId: string,
    reaction: "up" | "down" | null
  ) => {
    // 楽観的更新
    const target = builds.find((b) => b.id === buildId);
    if (!target) return;
    const prevReaction = target.user_reaction;
    setBuilds((prev) =>
      prev.map((b) => {
        if (b.id !== buildId) return b;
        let { likes_count, dislikes_count } = b;
        if (prevReaction === "up") likes_count--;
        if (prevReaction === "down") dislikes_count--;
        if (reaction === "up") likes_count++;
        if (reaction === "down") dislikes_count++;
        return { ...b, likes_count, dislikes_count, user_reaction: reaction };
      })
    );

    try {
      const res = await fetch(`/api/builds/${buildId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction_type: reaction }),
      });
      if (!res.ok) {
        // ロールバック
        setBuilds((prev) =>
          prev.map((b) =>
            b.id === buildId
              ? { ...b, likes_count: target.likes_count, dislikes_count: target.dislikes_count, user_reaction: prevReaction }
              : b
          )
        );
      }
    } catch {
      setBuilds((prev) =>
        prev.map((b) =>
          b.id === buildId
            ? { ...b, likes_count: target.likes_count, dislikes_count: target.dislikes_count, user_reaction: prevReaction }
            : b
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* モバイル: コンテンツ選択 + 投稿ボタン */}
      <div className="flex items-center justify-between gap-2 md:hidden">
        <div className="relative">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as BuildMode)}
            className="w-44 appearance-none rounded-[14px] border border-border-primary bg-bg-card-alpha px-4 py-2.5 pr-9 text-sm font-bold text-text-primary cursor-pointer focus:border-accent/50 focus:outline-none"
          >
            {BUILD_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="flex shrink-0 items-center gap-1.5 rounded-[14px] bg-gradient-to-r from-[#e05aa8] to-[#e87080] px-5 py-2.5 text-sm font-bold text-white shadow-[0px_10px_15px_0px_rgba(224,90,168,0.12),0px_4px_6px_0px_rgba(224,90,168,0.12)] cursor-pointer"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          投稿
        </button>
      </div>

      {/* 投稿フォーム（フィルターの上に表示） */}
      {formOpen && (
        <div id="build-form" className="mb-6">
          <BuildPostForm
            mode={mode}
            onModeChange={(newMode) => setMode(newMode)}
            onPosted={() => {
              setSortKey("newest");
              setFormOpen(false);
              showToast("編成を投稿しました！");
              // Client Router Cache を無効化（戻った時に最新を見せるため）
              router.refresh();
              // クライアント側の一覧も即時に再取得（投稿直後の反映）
              fetchBuilds();
              setTimeout(() => {
                document.getElementById("build-list-top")?.scrollIntoView({ behavior: "smooth" });
              }, 300);
            }}
            onClose={() => setFormOpen(false)}
          />
        </div>
      )}

      {/* モバイル: 性格フィルター + ソート */}
      <div id="build-list-top" className="flex items-center justify-between gap-2 md:hidden">
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setElementFilter(null)}
            className={cn(
              "shrink-0 rounded-[10px] px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer",
              elementFilter === null
                ? "bg-[rgba(255,99,126,0.15)] text-text-primary shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
                : "bg-bg-input text-text-tertiary"
            )}
            style={{
              border: `1.2px solid ${elementFilter === null ? "rgba(255,99,126,0.4)" : "var(--border-primary)"}`,
            }}
          >
            全て
          </button>
          {ELEMENTS.map((elem) => {
            const active = elementFilter === elem;
            return (
              <button
                key={elem}
                onClick={() => setElementFilter(active ? null : elem)}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-[10px] p-1.5 transition-colors cursor-pointer",
                  active
                    ? "bg-[rgba(255,99,126,0.15)] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
                    : "bg-bg-input"
                )}
                style={{
                  border: `1.2px solid ${active ? "rgba(255,99,126,0.4)" : "var(--border-primary)"}`,
                }}
                title={elem}
              >
                <StaticIcon
                  src={ELEMENT_ICONS[elem]}
                  alt={elem}
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              </button>
            );
          })}
        </div>
        {builds.length > 0 && (
          <div className="flex shrink-0 gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortKey(opt.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs md:text-sm font-medium transition-colors cursor-pointer",
                  sortKey === opt.value
                    ? "border-accent-active/40 bg-accent-active/12 text-accent-active"
                    : "border-[rgba(139,122,171,0.3)] text-text-muted hover:text-text-tertiary"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PC: モード + フィルター + ソート + 投稿を1行に */}
      <div className="hidden items-center gap-3 md:flex">
        <div className="relative shrink-0">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as BuildMode)}
            className="appearance-none rounded-[14px] border border-border-primary bg-bg-card-alpha px-4 py-2 pr-9 text-sm font-bold text-text-primary cursor-pointer focus:border-accent/50 focus:outline-none"
          >
            {BUILD_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setElementFilter(null)}
            className={cn(
              "shrink-0 rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer",
              elementFilter === null
                ? "bg-[rgba(255,99,126,0.15)] text-text-primary shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
                : "bg-bg-input text-text-tertiary"
            )}
            style={{
              border: `1.2px solid ${elementFilter === null ? "rgba(255,99,126,0.4)" : "var(--border-primary)"}`,
            }}
          >
            全て
          </button>
          {ELEMENTS.map((elem) => {
            const active = elementFilter === elem;
            return (
              <button
                key={elem}
                onClick={() => setElementFilter(active ? null : elem)}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-[10px] p-1.5 transition-colors cursor-pointer",
                  active
                    ? "bg-[rgba(255,99,126,0.15)] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
                    : "bg-bg-input"
                )}
                style={{
                  border: `1.2px solid ${active ? "rgba(255,99,126,0.4)" : "var(--border-primary)"}`,
                }}
                title={elem}
              >
                <StaticIcon
                  src={ELEMENT_ICONS[elem]}
                  alt={elem}
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-4">
          {builds.length > 0 && (
            <div className="flex gap-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortKey(opt.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                    sortKey === opt.value
                      ? "border-accent-active/40 bg-accent-active/12 text-accent-active"
                      : "border-[rgba(139,122,171,0.3)] text-text-muted hover:text-text-tertiary"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex shrink-0 items-center gap-1.5 rounded-[14px] bg-gradient-to-r from-[#e05aa8] to-[#e87080] px-5 py-2 text-sm font-bold text-white shadow-[0px_10px_15px_0px_rgba(224,90,168,0.12),0px_4px_6px_0px_rgba(224,90,168,0.12)] cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            投稿
          </button>
        </div>
      </div>

      {/* 編成一覧 */}
      {initialLoaded && builds.length === 0 && !loading ? (
        <EmptyState />
      ) : initialLoaded && sortedBuilds.length === 0 && !loading ? (
        <FilterEmptyState onClear={() => setElementFilter(null)} />
      ) : (
        <div className="space-y-6 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
          {sortedBuilds.map((build, idx) => (
            <BuildCard
              key={build.id}
              build={build}
              onReaction={handleReaction}
              rank={sortKey === "popular" ? idx : -1}
            />
          ))}
        </div>
      )}

      {/* もっと見る */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? "読み込み中..." : "もっと見る"}
          </Button>
        </div>
      )}

      {loading && builds.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-12 text-text-secondary">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm">読み込み中...</p>
        </div>
      )}

      {/* ナビリンクはサーバーコンポーネント側で表示 */}

      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
    </div>
  );
}

/**
 * 編成カード
 */
function BuildCard({
  build,
  onReaction,
  rank = -1,
}: {
  build: BuildItem;
  onReaction: (buildId: string, reaction: "up" | "down" | null) => void;
  rank?: number;
}) {
  const netScore = build.likes_count - build.dislikes_count;
  const isTop = rank === 0 && netScore >= 2;
  const isSecond = rank === 1 && netScore >= 2;
  const karmaClass = getKarmaClass(build.likes_count, build.dislikes_count);

  // 視覚オーバーフロー検出（PC でカード高さを揃えるため、インライン展開はせず
  // 「続きを読む →」で詳細ページへ誘導するスタイル）
  const commentLines = build.comment.split("\n");
  const commentRef = useRef<HTMLParagraphElement | null>(null);
  const [isClipped, setIsClipped] = useState(false);
  useEffect(() => {
    const el = commentRef.current;
    if (!el) return;
    setIsClipped(el.scrollHeight > el.clientHeight + 1);
  }, [build.comment]);
  const shouldTruncate = commentLines.length > 3 || isClipped;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-4",
        isTop
          ? "border-[rgba(252,211,77,0.5)] bg-bg-card-alpha"
          : isSecond
            ? "border-[rgba(192,192,210,0.5)] bg-bg-card-alpha"
            : "border-border-primary bg-gradient-to-b from-bg-card-alpha to-bg-card-alpha-lighter",
        karmaClass
      )}
    >
      {(isTop || isSecond) && (
        <div className="absolute -top-3 left-3 flex items-center gap-1 rounded-full bg-bg-input px-2 py-0.5 md:gap-1.5 md:px-2.5 md:py-1">
          <svg className={cn("h-3.5 w-3.5 md:h-4 md:w-4", isTop ? "text-star" : "text-rank-silver")} viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
          </svg>
          <span className={cn("text-[10px] md:text-xs font-bold", isTop ? "text-star" : "text-rank-silver")}>高評価</span>
        </div>
      )}
      <Link
        href={`/trickcal/builds/${build.id}${isTop ? "?rank=1" : isSecond ? "?rank=2" : ""}`}
        className="flex flex-1 flex-col cursor-pointer"
      >
        {/* タイトル + 属性アイコン + モード */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm md:text-base font-bold text-text-primary">
            {build.title || BUILD_MODE_LABEL_MAP[build.mode]}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {build.members_detail
              .map((m) => m.element)
              .filter((e, i, arr) => e && arr.indexOf(e) === i)
              .map((el) => (
                ELEMENT_ICONS[el as string] ? (
                  <StaticIcon
                    key={el}
                    src={ELEMENT_ICONS[el as string]}
                    alt={el as string}
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px]"
                  />
                ) : null
              ))}
            <span className="rounded-md bg-bg-card-alpha-light px-2 py-0.5 text-[10px] md:text-xs font-bold text-text-muted">
              {BUILD_MODE_LABEL_MAP[build.mode]}
            </span>
          </div>
        </div>

        {/* キャラ編成グリッド */}
        {(() => {
          // members配列からスロット位置を再現（9枠: 後列×3, 中列×3, 前列×3）
          const charMap = new Map(build.members_detail.map((c) => [c.id, c]));
          const slots: (CharacterInfo | null)[] = build.members.map(
            (id: string | null) => (id ? charMap.get(id) ?? null : null)
          );
          // 9枠に満たない場合はnullで埋める
          while (slots.length < 9) slots.push(null);
          const rowCount = 3;
          // 全スロットが空の行は非表示にする
          const hasContent = (rowIdx: number) =>
            [0, 1, 2].some((colIdx) => slots[colIdx * rowCount + rowIdx] !== null);

          return (
            <div className="mb-2 overflow-hidden rounded-[14px] border border-border-primary">
              <div className="grid grid-cols-3 bg-bg-inset">
                <span className="border-r border-border-primary py-1 text-center text-[10px] md:text-xs font-bold text-text-tertiary">後列</span>
                <span className="border-r border-border-primary py-1 text-center text-[10px] md:text-xs font-bold text-text-tertiary">中列</span>
                <span className="py-1 text-center text-[10px] md:text-xs font-bold text-text-tertiary">前列</span>
              </div>
              {Array.from({ length: rowCount }).map((_, rowIdx) => {
                const empty = !hasContent(rowIdx);
                return (
                  <div key={rowIdx} className={cn("grid grid-cols-3", "border-b border-border-primary last:border-b-0", empty && "hidden md:grid")}>
                    {[0, 1, 2].map((colIdx) => {
                      const char = slots[colIdx * rowCount + rowIdx];
                      return (
                        <div key={colIdx} className={cn(
                          "flex flex-col items-center gap-0.5 pt-2 pb-1.5",
                          colIdx < 2 && "border-r border-border-primary"
                        )}>
                          {char ? (
                            <>
                              <CharacterIcon
                                name={char.name}
                                imageUrl={char.image_url}
                                isHidden={char.is_hidden}
                                size="md"
                              />
                              <span className="max-w-20 truncate text-center text-[10px] md:text-xs font-bold text-text-tertiary">
                                {char.name}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="h-16 w-16" />
                              <span className="text-[10px] md:text-xs">&nbsp;</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* コメント（高さは 3行＋名前で固定。「続きを読む」は名前行の右端） */}
        <div className="mx-0.5 flex flex-col rounded-[10px] bg-bg-inset border border-border-primary px-2.5 py-2">
          <p
            ref={commentRef}
            className="line-clamp-3 min-h-[3lh] whitespace-pre-wrap text-xs md:text-sm text-text-primary leading-relaxed"
          >
            {build.comment}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[10px] md:text-xs text-text-muted">
              {build.display_name ? `— ${build.display_name}` : " "}
            </span>
            {shouldTruncate && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] md:text-xs text-accent-secondary">
                続きを読む
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* フッター: 日時 + コメント数 + リアクション */}
      <div className="mt-auto pt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs md:text-sm text-text-muted">
          <span suppressHydrationWarning>{formatDate(build.updated_at)}</span>
          {build.comments_count > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {build.comments_count}
              </span>
            </>
          )}
        </div>
        <ThumbsUpDown
          thumbsUpCount={build.likes_count}
          thumbsDownCount={build.dislikes_count}
          userReaction={build.user_reaction}
          onReact={(reaction) => onReaction(build.id, reaction)}
        />
      </div>
    </div>
  );
}

/**
 * 0件時の表示
 */
function EmptyState() {
  return (
    <div className="rounded-2xl border border-border-primary bg-bg-card p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
        <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <p className="font-medium text-text-secondary">まだ投稿がありません</p>
      <p className="mt-1 text-sm text-text-tertiary">
        最初の投稿者になろう！
      </p>
    </div>
  );
}

function FilterEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-border-primary bg-bg-card p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-tertiary">
        <svg className="h-6 w-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="font-medium text-text-secondary">該当する編成が見つかりませんでした</p>
      <p className="mt-1 text-sm text-text-tertiary">
        フィルターを変更してみてください
      </p>
      <button
        onClick={onClear}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border-primary bg-bg-input px-4 py-2 text-xs font-bold text-text-secondary transition-colors hover:border-accent/30 hover:text-text-primary cursor-pointer"
      >
        フィルターをクリア
      </button>
    </div>
  );
}

