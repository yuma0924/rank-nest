"use client";

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIER_LABELS } from "@/lib/trickcal/constants";
import type { TierLabel } from "@/lib/trickcal/constants";
import { TierRow } from "@/components/trickcal/tier/tier-row";
import { TierLikeButton } from "@/components/trickcal/tier/tier-like-button";
import { ThumbsUpDown } from "@/components/reaction/thumbs-up-down";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast, Toast } from "@/components/ui/toast";

type CharacterData = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  image_url: string | null;
};

type CommentItem = {
  id: string;
  tier_id: string;
  display_name: string | null;
  body: string;
  thumbs_up_count: number;
  thumbs_down_count: number;
  created_at: string;
  user_reaction: "up" | "down" | null;
};

type SortType = "newest" | "thumbs_up";

const SORT_TABS = [
  { value: "newest" as SortType, label: "新着順" },
  { value: "thumbs_up" as SortType, label: "人気順" },
];

function getKarmaClass(likesCount: number, dislikesCount: number): string {
  const net = likesCount - dislikesCount;
  if (net >= 30) return "karma-gold";
  if (net >= 15) return "karma-bold";
  if (net <= -30) return "karma-very-dim";
  if (net <= -15) return "karma-dim";
  return "";
}

interface TierDetailClientProps {
  tier: {
    id: string;
    title: string | null;
    display_name: string | null;
    description: string | null;
    data: Record<string, string[]>;
    likes_count: number;
    created_at: string;
  };
  characters: Record<string, CharacterData>;
  initialUserLiked: boolean;
  initialIsOwner: boolean;
  initialComments?: {
    comments: CommentItem[];
    hasMore: boolean;
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

export function TierDetailClient({
  tier: initialTier,
  characters,
  initialUserLiked,
  initialIsOwner,
  initialComments,
}: TierDetailClientProps) {
  const router = useRouter();
  const [tier, setTier] = useState(initialTier);
  const [userLiked, setUserLiked] = useState(initialUserLiked);
  const [isOwner, setIsOwner] = useState(initialIsOwner);
  const [deleted, setDeleted] = useState(false);

  const likeStorageKey = `rn:tier:${initialTier.id}:liked`;

  // ISR で配信される静的ページには likes_count/user_liked/thumbs counts の
  // 最新値が含まれないので、マウント時に1回だけ /my-state で全部同期する。
  // さらに localStorage からも色状態を即座に復元してリロード時のラグを無くす。
  useEffect(() => {
    // まず localStorage から即復元（再訪時は一瞬で色が付く）
    try {
      const v = localStorage.getItem(likeStorageKey);
      if (v !== null) setUserLiked(v === "1");
    } catch {
      // ignore
    }

    let cancelled = false;
    fetch(`/api/tiers/${initialTier.id}/my-state`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setUserLiked(!!data.user_liked);
        setIsOwner(!!data.is_owner);
        try {
          localStorage.setItem(likeStorageKey, data.user_liked ? "1" : "0");
        } catch {
          // ignore
        }
        if (typeof data.likes_count === "number") {
          setTier((prev) => ({ ...prev, likes_count: data.likes_count }));
        }
        const reactions: Record<string, "up" | "down"> = data.comment_reactions ?? {};
        const counts: Record<string, { thumbs_up: number; thumbs_down: number }> =
          data.comment_counts ?? {};
        setComments((prev) =>
          prev.map((c) => {
            const cnt = counts[c.id];
            return {
              ...c,
              user_reaction: reactions[c.id] ?? null,
              thumbs_up_count: cnt?.thumbs_up ?? c.thumbs_up_count,
              thumbs_down_count: cnt?.thumbs_down ?? c.thumbs_down_count,
            };
          })
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialTier.id]);

  // コメントフォーム開閉
  const [commentFormOpen, setCommentFormOpen] = useState(false);

  // コメント関連
  const [comments, setComments] = useState<CommentItem[]>(initialComments?.comments ?? []);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(initialComments?.hasMore ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [commentsLoaded, setCommentsLoaded] = useState(!!initialComments);

  // コメント投稿フォーム
  const [commentBody, setCommentBody] = useState("");
  const { toast, showToast } = useToast();
  const [commentName, setCommentName] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // ティア作成直後 (/tiers/new から ?created=1 付きで遷移) は成功トーストを出す
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("created") === "1") {
      showToast("ティアを投稿しました！");
      params.delete("created");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, [showToast]);

  // 通報
  const [reportTarget, setReportTarget] = useState<{
    type: "tier_comment";
    id: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // 連打対策: 前のリクエストを abort して「最後のクリックだけ」サーバーに反映
  const likeAbortRef = useRef<AbortController | null>(null);

  // エラー時のフォールバック: DB から真実を取り直す
  const resyncFromServer = async () => {
    try {
      const r = await fetch(`/api/tiers/${initialTier.id}/my-state`);
      if (!r.ok) return;
      const data = await r.json();
      setUserLiked(!!data.user_liked);
      if (typeof data.likes_count === "number") {
        setTier((prev) => ({ ...prev, likes_count: data.likes_count }));
      }
      try {
        localStorage.setItem(likeStorageKey, data.user_liked ? "1" : "0");
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  };

  const handleToggleLike = async () => {
    // 前の in-flight を abort（最後のクリックだけが最終結果に影響する）
    likeAbortRef.current?.abort();
    const controller = new AbortController();
    likeAbortRef.current = controller;

    const newLiked = !userLiked;

    // 色 + 数値を即時楽観更新。prev から計算、クランプで負値防止
    setUserLiked(newLiked);
    setTier((prev) => ({
      ...prev,
      likes_count: Math.max(0, newLiked ? prev.likes_count + 1 : prev.likes_count - 1),
    }));
    // localStorage も即同期（API 応答を待たずにリロードしても色が復元される）
    try {
      localStorage.setItem(likeStorageKey, newLiked ? "1" : "0");
    } catch {
      // ignore
    }

    try {
      const res = await fetch(`/api/tiers/${tier.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reaction_type: newLiked ? "up" : null,
        }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (res.ok) {
        const data = await res.json();
        setUserLiked(data.user_liked);
        setTier((prev) => ({ ...prev, likes_count: data.likes_count }));
        try {
          localStorage.setItem(likeStorageKey, data.user_liked ? "1" : "0");
        } catch {
          // ignore
        }
        router.refresh();
      } else {
        // 429 等: 楽観更新をキャンセルし DB から再同期
        await resyncFromServer();
      }
    } catch (e) {
      // abort されたら新しいクリックが処理中なので何もしない
      if ((e as Error)?.name === "AbortError") return;
      await resyncFromServer();
    }
  };

  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(e.target as Node)
      ) {
        setShareMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shareMenuOpen]);

  const shareUrl = `https://rank-nest.com/trickcal/tiers/${tier.id}`;
  const shareText = `「${tier.title || "無題のティア"}」のティア表をチェック！`;

  const handleShareX = () => {
    setShareMenuOpen(false);
    const params = new URLSearchParams({
      text: shareText,
      url: shareUrl,
      hashtags: "トリッカルランキング",
    });
    const a = document.createElement("a");
    a.href = `https://twitter.com/intent/tweet?${params.toString()}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const handleCopyUrl = async () => {
    setShareMenuOpen(false);
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("URLをコピーしました");
    } catch {
      showToast("コピーに失敗しました", "error");
    }
  };

  const handleDelete = async () => {
    if (!confirm("このティアを削除しますか？")) return;
    try {
      const res = await fetch(`/api/tiers/${tier.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleted(true);
      }
    } catch {
      // ignore
    }
  };

  // コメント取得
  const fetchComments = useCallback(
    async (cursorId?: string) => {
      setCommentsLoading(true);
      try {
        const params = new URLSearchParams();
        if (cursorId) params.set("cursor", cursorId);

        const res = await fetch(
          `/api/tiers/${tier.id}/comments?${params.toString()}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (cursorId) {
          setComments((prev) => [...prev, ...data.comments]);
        } else {
          setComments(data.comments);
        }
        setNextCursor(data.next_cursor);
        setHasMoreComments(data.has_more);
      } catch {
        // ignore
      } finally {
        setCommentsLoading(false);
        setCommentsLoaded(true);
      }
    },
    [tier.id]
  );

  // 初回のみ取得（initialCommentsがあればスキップ）
  const initialFetchDone = useRef(!!initialComments);
  useEffect(() => {
    if (initialFetchDone.current) {
      initialFetchDone.current = false;
      return;
    }
    fetchComments();
  }, [fetchComments]);


  // コメント毎に abort controller を保持（他コメントのクリックには影響させない）
  const commentReactAbortRef = useRef<Map<string, AbortController>>(new Map());

  const handleCommentReaction = async (
    commentId: string,
    reaction: "up" | "down" | null
  ) => {
    commentReactAbortRef.current.get(commentId)?.abort();
    const controller = new AbortController();
    commentReactAbortRef.current.set(commentId, controller);

    // 色 + 数値を即時楽観更新。prev から計算、Math.max でクランプ
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        let up = c.thumbs_up_count;
        let down = c.thumbs_down_count;
        if (c.user_reaction === "up") up--;
        if (c.user_reaction === "down") down--;
        if (reaction === "up") up++;
        if (reaction === "down") down++;
        return {
          ...c,
          thumbs_up_count: Math.max(0, up),
          thumbs_down_count: Math.max(0, down),
          user_reaction: reaction,
        };
      })
    );

    try {
      const res = await fetch(
        `/api/tiers/${tier.id}/comments/${commentId}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reaction_type: reaction }),
          signal: controller.signal,
        }
      );
      if (controller.signal.aborted) return;
      if (res.ok) {
        const data = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  thumbs_up_count: data.thumbs_up_count,
                  thumbs_down_count: data.thumbs_down_count,
                  user_reaction: data.user_reaction,
                }
              : c
          )
        );
      } else {
        await resyncFromServer();
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      await resyncFromServer();
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);

    if (!commentBody.trim()) {
      setCommentError("コメントは必須です");
      return;
    }

    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/tiers/${tier.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: commentBody.trim(),
          display_name: commentName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCommentError(data.error || "投稿に失敗しました");
        return;
      }

      setComments((prev) => [data.comment, ...prev]);
      setCommentBody("");
      setCommentName("");
      showToast("コメントを投稿しました！");
    } catch {
      setCommentError("投稿に失敗しました");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!reportTarget) return;
    setReportSubmitting(true);
    setReportSuccess(false);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: reportTarget.type,
          target_id: reportTarget.id,
          reason: reportReason.trim() || undefined,
        }),
      });

      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportTarget(null);
          setReportReason("");
          setReportSuccess(false);
        }, 2000);
      }
    } catch {
      // ignore
    } finally {
      setReportSubmitting(false);
    }
  };

  if (deleted) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">ティアを削除しました</p>
        <Link
          href="/trickcal/tiers"
          className="text-sm text-accent hover:underline"
        >
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 pl-2 text-xl font-bold text-text-primary">
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 16 16" fill="none">
            <rect x="0" y="0.5" width="3" height="3" rx="0.5" fill="#ef4444" />
            <rect x="4" y="0.5" width="12" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
            <rect x="0" y="4.5" width="3" height="3" rx="0.5" fill="#f97316" />
            <rect x="4" y="4.5" width="9" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
            <rect x="0" y="8.5" width="3" height="3" rx="0.5" fill="#eab308" />
            <rect x="4" y="8.5" width="6" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
            <rect x="0" y="12.5" width="3" height="3" rx="0.5" fill="#22c55e" />
            <rect x="4" y="12.5" width="4" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
          </svg>
          {tier.title || "無題のティア"}
        </h1>
        {isOwner && (
          <button
            onClick={handleDelete}
            className="mr-2 shrink-0 rounded-lg border border-border-primary bg-bg-tertiary px-2.5 py-1 text-xs text-text-muted transition-colors hover:text-thumbs-down hover:border-thumbs-down/30 cursor-pointer"
          >
            削除
          </button>
        )}
      </div>

      {/* ティア表 */}
      <div className="overflow-hidden rounded-2xl border border-border-primary bg-bg-card">
        {TIER_LABELS.map((label) => {
          const charIds = tier.data[label] ?? [];
          const charData = charIds
            .map((id) => characters[id])
            .filter((c): c is CharacterData => !!c);
          return (
            <TierRow
              key={label}
              label={label as TierLabel}
              characters={charData.map((c) => ({
                id: c.id,
                name: c.name,
                image_url: c.image_url,
              }))}
              iconClassName="h-14 w-14"
            />
          );
        })}
        {/* フッター */}
        <div className="flex items-start justify-between gap-3 border-t border-border-primary bg-bg-tertiary/50 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              {tier.display_name && (
                <>
                  <span className="font-semibold text-text-primary">{tier.display_name}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              <span suppressHydrationWarning>{formatDate(tier.created_at)}</span>
            </div>
            {tier.description && (
              <p className="mt-2 whitespace-pre-wrap text-sm md:text-base leading-relaxed text-text-secondary">
                {tier.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={shareMenuRef}>
              <button
                type="button"
                onClick={() => setShareMenuOpen((v) => !v)}
                aria-label="共有"
                className="flex items-center gap-1 rounded-lg border border-border-primary bg-bg-tertiary px-2.5 py-1 text-xs text-text-muted transition-colors hover:text-text-primary cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                共有
              </button>
              {shareMenuOpen && (
                <div className="absolute right-0 bottom-full z-20 mb-2 w-44 overflow-hidden rounded-xl border border-border-primary bg-bg-card shadow-[0_12px_32px_rgba(0,0,0,0.6)] ring-1 ring-white/5 dark:ring-white/10">
                  <button
                    type="button"
                    onClick={handleShareX}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold text-text-primary transition-colors hover:bg-bg-card-hover cursor-pointer"
                  >
                    <svg className="h-4 w-4 text-text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Xで共有
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="flex w-full items-center gap-2.5 border-t border-border-primary px-4 py-3 text-left text-sm font-semibold text-text-primary transition-colors hover:bg-bg-card-hover cursor-pointer"
                  >
                    <svg className="h-4 w-4 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    URLをコピー
                  </button>
                </div>
              )}
            </div>
            <TierLikeButton
              likesCount={tier.likes_count}
              userLiked={userLiked}
              onToggle={handleToggleLike}
            />
          </div>
        </div>
      </div>

      {/* コメント投稿 */}
      <section className="mt-12">
        {!commentFormOpen ? (
          <div className="rounded-[14px] bg-gradient-to-r from-[rgba(246,51,154,0.1)] to-[rgba(255,32,86,0.1)] border border-accent-active/30 p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-sm font-bold text-text-primary">
                    コメントする
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted">感想や意見を共有しよう</p>
              </div>
              <button
                onClick={() => setCommentFormOpen(true)}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-accent/80 px-5 py-3 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                投稿する
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border-primary bg-bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-text-primary">コメントを投稿</span>
              <button
                onClick={() => setCommentFormOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-bg-tertiary hover:text-text-primary cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <input
                type="text"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="名前（任意）"
                maxLength={50}
                className="w-full rounded-xl border border-border-primary bg-bg-input px-3 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:outline-none"
              />
              <div>
                <label className="mb-1 block text-xs text-text-secondary">
                  コメント<span className="text-[#f87171]">*</span>
                </label>
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="コメントを入力..."
                  maxLength={300}
                  rows={3}
                  className="w-full rounded-xl border border-border-primary bg-bg-input px-3 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:outline-none resize-none"
                />
              </div>
              {commentError && (
                <p className="text-sm text-thumbs-down">{commentError}</p>
              )}
              <Button type="submit" disabled={commentSubmitting || !commentBody.trim()} className="w-full">
                {commentSubmitting ? "投稿中..." : "コメントする"}
              </Button>
            </form>
          </div>
        )}
      </section>

      {/* コメント一覧 */}
      <SortableCommentList
        comments={comments}
        commentsLoaded={commentsLoaded}
        commentsLoading={commentsLoading}
        hasMoreComments={hasMoreComments}
        onLoadMore={() => { if (nextCursor) fetchComments(nextCursor); }}
        onReact={handleCommentReaction}
        onReport={(id) => setReportTarget({ type: "tier_comment", id })}
      />

      {/* 自分もティアを作る */}
      <Link
        href="/trickcal/tiers/new"
        className="mt-10 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e05aa8] to-[#e87080] py-3 text-sm font-bold text-white shadow-[0px_10px_15px_0px_rgba(224,90,168,0.12),0px_4px_6px_0px_rgba(224,90,168,0.12)] transition-opacity hover:opacity-90"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        ティア表を作成する
      </Link>

      {/* ティア一覧へ戻る */}
      <Link
        href="/trickcal/tiers"
        className="flex items-center justify-center gap-2 rounded-2xl border border-border-primary bg-bg-card py-3 text-sm font-medium text-text-primary transition-colors hover:bg-bg-card-hover"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
          <rect x="0" y="0.5" width="3" height="3" rx="0.5" fill="#ef4444" />
          <rect x="4" y="0.5" width="12" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
          <rect x="0" y="4.5" width="3" height="3" rx="0.5" fill="#f97316" />
          <rect x="4" y="4.5" width="9" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
          <rect x="0" y="8.5" width="3" height="3" rx="0.5" fill="#eab308" />
          <rect x="4" y="8.5" width="6" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
          <rect x="0" y="12.5" width="3" height="3" rx="0.5" fill="#22c55e" />
          <rect x="4" y="12.5" width="4" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
        </svg>
        みんなのティア表に戻る
      </Link>

      {/* 他のページもチェック */}
      <section className="!mt-10 space-y-3">
        <p className="text-xs md:text-sm font-bold text-text-tertiary">他のページもチェック</p>
        <Link
          href="/trickcal/ranking"
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
          href="/trickcal/builds"
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

      {/* 通報モーダル */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-bg-card p-4">
            <h3 className="mb-3 text-base font-bold text-text-primary">通報</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="通報理由（任意）"
              maxLength={300}
              rows={3}
              className="mb-3 w-full rounded-xl border border-border-primary bg-bg-input px-3 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:outline-none resize-none"
            />
            {reportSuccess ? (
              <p className="text-sm text-thumbs-up">通報しました</p>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReport}
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? "送信中..." : "通報する"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReportTarget(null);
                    setReportReason("");
                  }}
                >
                  キャンセル
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
    </div>
  );
}

const SortableCommentList = memo(function SortableCommentList({
  comments,
  commentsLoaded,
  commentsLoading,
  hasMoreComments,
  onLoadMore,
  onReact,
  onReport,
}: {
  comments: CommentItem[];
  commentsLoaded: boolean;
  commentsLoading: boolean;
  hasMoreComments: boolean;
  onLoadMore: () => void;
  onReact: (commentId: string, reaction: "up" | "down" | null) => void;
  onReport: (commentId: string) => void;
}) {
  const [sort, setSort] = useState<SortType>("newest");

  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    if (sort === "thumbs_up") {
      sorted.sort((a, b) => {
        const netA = a.thumbs_up_count - a.thumbs_down_count;
        const netB = b.thumbs_up_count - b.thumbs_down_count;
        if (netB !== netA) return netB - netA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [comments, sort]);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 md:h-5 md:w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm md:text-base font-bold text-text-primary">
            コメント ({comments.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSort(tab.value)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs md:text-sm md:px-3 md:py-1.5 font-medium transition-colors cursor-pointer",
                sort === tab.value
                  ? "border-accent-active/40 bg-accent-active/12 text-accent-active"
                  : "border-[rgba(139,122,171,0.3)] text-text-muted hover:text-text-tertiary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {commentsLoaded && comments.length === 0 && !commentsLoading ? (
        <p className="py-4 text-center text-sm text-text-tertiary">
          まだコメントはありません
        </p>
      ) : (
        <div className="space-y-2">
          {sortedComments.map((c) => {
            const cKarma = getKarmaClass(c.thumbs_up_count, c.thumbs_down_count);
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-2xl bg-bg-card border border-border-primary px-4 pt-4 pb-3",
                  cKarma
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "#22a870" }}
                  />
                  <div className="flex flex-col -mt-1">
                    <span className="text-base font-medium text-text-primary">
                      {c.display_name || "名無しの教主"}
                    </span>
                    <span className="text-xs md:text-sm text-text-muted" suppressHydrationWarning>{formatDate(c.created_at)}</span>
                  </div>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap text-base text-text-secondary leading-relaxed">
                  {c.body}
                </p>
                <div className="mt-4 flex items-center gap-4 text-text-muted text-xs md:text-sm">
                  <ThumbsUpDown
                    thumbsUpCount={c.thumbs_up_count}
                    thumbsDownCount={c.thumbs_down_count}
                    userReaction={c.user_reaction}
                    onReact={(reaction) => onReact(c.id, reaction)}
                  />
                  <button
                    type="button"
                    onClick={() => onReport(c.id)}
                    className="ml-auto rounded-full border border-border-primary px-2.5 py-1 text-[10px] md:text-xs text-text-muted transition-colors hover:border-thumbs-down/20 hover:text-thumbs-down cursor-pointer"
                  >
                    通報
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMoreComments && (
        <div className="flex justify-center py-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadMore}
            disabled={commentsLoading}
          >
            {commentsLoading ? "読み込み中..." : "もっと見る"}
          </Button>
        </div>
      )}
    </section>
  );
});
