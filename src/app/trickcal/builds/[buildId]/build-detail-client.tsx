"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StaticIcon } from "@/components/ui/static-icon";
import { Button } from "@/components/ui/button";

import { CharacterIcon } from "@/components/trickcal/character/character-icon";
import { ThumbsUpDown } from "@/components/reaction/thumbs-up-down";
import { cn } from "@/lib/utils";
import { ELEMENT_ICONS, BUILD_MODE_LABEL_MAP } from "@/lib/trickcal/constants";
import type { BuildMode } from "@/lib/trickcal/constants";
import { useToast, Toast } from "@/components/ui/toast";

type CharacterInfo = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  position: string | null;
  image_url: string | null;
  is_hidden: boolean;
};


type BuildDetail = {
  id: string;
  mode: BuildMode;
  party_size: number;
  element_label: string | null;
  title: string | null;
  display_name: string | null;
  comment: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  updated_at: string;
  members: (string | null)[];
  members_detail: CharacterInfo[];
};

type SimilarBuild = {
  id: string;
  mode: BuildMode;
  title: string | null;
  display_name: string | null;
  comment: string;
  element_label: string | null;
  likes_count: number;
  members_detail: CharacterInfo[];
  updated_at: string;
};

type CommentItem = {
  id: string;
  build_id: string;
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

interface BuildDetailClientProps {
  build: BuildDetail;
  similarBuilds: SimilarBuild[];
  initialUserReaction: "up" | "down" | null;
  initialComments?: {
    comments: CommentItem[];
    hasMore: boolean;
  };
}

export function BuildDetailClient({
  build: initialBuild,
  similarBuilds,
  initialUserReaction,
  initialComments,
}: BuildDetailClientProps) {
  const router = useRouter();
  const [build, setBuild] = useState(initialBuild);
  const searchParams = useSearchParams();
  const rankParam = searchParams.get("rank");
  const isTopRank = rankParam === "1";
  const isSecondRank = rankParam === "2";
  const [userReaction, setUserReaction] = useState<"up" | "down" | null>(initialUserReaction);

  const reactionStorageKey = `rn:build:${initialBuild.id}:reaction`;

  // ISR で配信される静的ページには likes_count/user_reaction/thumbs counts の
  // 最新値が含まれないので、マウント時に1回だけ /my-state で全部同期する。
  // さらに localStorage からも色状態を即座に復元してリロード時のラグを無くす。
  useEffect(() => {
    // まず localStorage から即復元
    try {
      const v = localStorage.getItem(reactionStorageKey);
      if (v === "up" || v === "down") setUserReaction(v);
      else if (v === "") setUserReaction(null);
    } catch {
      // ignore
    }

    let cancelled = false;
    fetch(`/api/builds/${initialBuild.id}/my-state`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setUserReaction(data.user_reaction ?? null);
        try {
          localStorage.setItem(reactionStorageKey, data.user_reaction ?? "");
        } catch {
          // ignore
        }
        if (
          typeof data.likes_count === "number" &&
          typeof data.dislikes_count === "number"
        ) {
          setBuild((prev) => ({
            ...prev,
            likes_count: data.likes_count,
            dislikes_count: data.dislikes_count,
          }));
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
  }, [initialBuild.id]);

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

  // 通報
  const [reportTarget, setReportTarget] = useState<{
    type: "build" | "build_comment";
    id: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const fetchComments = useCallback(
    async (cursorId?: string) => {
      setCommentsLoading(true);
      try {
        const params = new URLSearchParams();
        if (cursorId) params.set("cursor", cursorId);

        const res = await fetch(
          `/api/builds/${build.id}/comments?${params.toString()}`
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
    [build.id]
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



  // 連打対策: 前のリクエストを abort
  const reactionAbortRef = useRef<AbortController | null>(null);

  // エラー時のフォールバック
  const resyncFromServer = async () => {
    try {
      const r = await fetch(`/api/builds/${initialBuild.id}/my-state`);
      if (!r.ok) return;
      const data = await r.json();
      setUserReaction(data.user_reaction ?? null);
      if (
        typeof data.likes_count === "number" &&
        typeof data.dislikes_count === "number"
      ) {
        setBuild((prev) => ({
          ...prev,
          likes_count: data.likes_count,
          dislikes_count: data.dislikes_count,
        }));
      }
      try {
        localStorage.setItem(reactionStorageKey, data.user_reaction ?? "");
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  };

  const handleBuildReaction = async (reaction: "up" | "down" | null) => {
    reactionAbortRef.current?.abort();
    const controller = new AbortController();
    reactionAbortRef.current = controller;

    const prevUserReaction = userReaction;
    setUserReaction(reaction);
    setBuild((prev) => {
      let up = prev.likes_count;
      let down = prev.dislikes_count;
      if (prevUserReaction === "up") up--;
      if (prevUserReaction === "down") down--;
      if (reaction === "up") up++;
      if (reaction === "down") down++;
      return {
        ...prev,
        likes_count: Math.max(0, up),
        dislikes_count: Math.max(0, down),
      };
    });
    // localStorage も即同期
    try {
      localStorage.setItem(reactionStorageKey, reaction ?? "");
    } catch {
      // ignore
    }

    try {
      const res = await fetch(`/api/builds/${build.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction_type: reaction }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (res.ok) {
        const data = await res.json();
        setBuild((prev) => ({
          ...prev,
          likes_count: data.likes_count,
          dislikes_count: data.dislikes_count,
        }));
        setUserReaction(data.user_reaction);
        try {
          localStorage.setItem(reactionStorageKey, data.user_reaction ?? "");
        } catch {
          // ignore
        }
        router.refresh();
      } else {
        await resyncFromServer();
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      await resyncFromServer();
    }
  };

  // コメント毎に abort controller
  const commentReactAbortRef = useRef<Map<string, AbortController>>(new Map());

  const handleCommentReaction = async (
    commentId: string,
    reaction: "up" | "down" | null
  ) => {
    commentReactAbortRef.current.get(commentId)?.abort();
    const controller = new AbortController();
    commentReactAbortRef.current.set(commentId, controller);

    // 色 + 数値を即時楽観更新
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
        `/api/builds/${build.id}/comments/${commentId}/reactions`,
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
      const res = await fetch(`/api/builds/${build.id}/comments`, {
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

  const karmaClass = getKarmaClass(build.likes_count, build.dislikes_count);

  return (
    <div className="pt-2 space-y-6">
      {/* 編成情報カード */}
      <div className={cn(
        "relative rounded-2xl border p-4 md:max-w-xl",
        isTopRank
          ? "border-[rgba(252,211,77,0.5)] bg-bg-card-alpha"
          : isSecondRank
            ? "border-[rgba(192,192,210,0.5)] bg-bg-card-alpha"
            : "border-border-primary bg-gradient-to-b from-bg-card-alpha to-bg-card-alpha-lighter",
        karmaClass
      )}>
        {(isTopRank || isSecondRank) && (
          <div className="absolute -top-3 left-3 flex items-center gap-1 rounded-full bg-bg-input px-2 py-0.5 md:gap-1.5 md:px-2.5 md:py-1">
            <svg className={cn("h-3.5 w-3.5 md:h-4 md:w-4", isTopRank ? "text-star" : "text-rank-silver")} viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
            </svg>
            <span className={cn("text-[10px] md:text-xs font-bold", isTopRank ? "text-star" : "text-rank-silver")}>高評価</span>
          </div>
        )}
        {/* タイトル + 属性アイコン + モード + 通報 */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate text-sm font-bold text-text-primary">
            {build.title || BUILD_MODE_LABEL_MAP[build.mode]}
          </h1>
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
            <span className="rounded-md bg-bg-card-alpha-light px-2 py-0.5 text-[10px] font-bold text-text-muted">
              {BUILD_MODE_LABEL_MAP[build.mode]}
            </span>
            <button
              onClick={() => setReportTarget({ type: "build", id: build.id })}
              className="text-[10px] text-text-muted/50 hover:text-thumbs-down cursor-pointer"
            >
              通報
            </button>
          </div>
        </div>

        {/* キャラ編成グリッド */}
        {(() => {
          const charMap = new Map(build.members_detail.map((c) => [c.id, c]));
          const slots: (CharacterInfo | null)[] = build.members.map(
            (id) => (id ? charMap.get(id) ?? null : null)
          );
          while (slots.length < 9) slots.push(null);
          const rowCount = 3;
          const hasContent = (rowIdx: number) =>
            [0, 1, 2].some((colIdx) => slots[colIdx * rowCount + rowIdx] !== null);

          return (
            <div className="mb-2 overflow-hidden rounded-[14px] border border-border-primary">
              <div className="grid grid-cols-3 bg-bg-inset">
                <span className="border-r border-border-primary py-1 text-center text-[10px] font-bold text-text-tertiary">後列</span>
                <span className="border-r border-border-primary py-1 text-center text-[10px] font-bold text-text-tertiary">中列</span>
                <span className="py-1 text-center text-[10px] font-bold text-text-tertiary">前列</span>
              </div>
              {Array.from({ length: rowCount }).map((_, rowIdx) => {
                if (!hasContent(rowIdx)) return null;
                return (
                  <div key={rowIdx} className={cn("grid grid-cols-3", "border-b border-border-primary last:border-b-0")}>
                    {[0, 1, 2].map((colIdx) => {
                      const char = slots[colIdx * rowCount + rowIdx];
                      return (
                        <div key={colIdx} className={cn(
                          "flex flex-col items-center gap-0.5 pt-2 pb-1.5",
                          colIdx < 2 && "border-r border-border-primary"
                        )}>
                          {char ? (
                            <Link href={char.slug ? `/trickcal/characters/${char.slug}` : "#"} className="flex flex-col items-center gap-0.5">
                              <CharacterIcon
                                name={char.name}
                                imageUrl={char.image_url}
                                isHidden={char.is_hidden}
                                size="md"
                              />
                              <span className="max-w-20 truncate text-center text-[10px] font-bold text-text-tertiary">
                                {char.name}
                              </span>
                            </Link>
                          ) : (
                            <div className="h-16 w-16" />
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

        {/* コメント */}
        <div className="mx-0.5 flex flex-col rounded-[10px] bg-bg-inset border border-border-primary px-2.5 py-2 min-h-[76px]">
          <p className="whitespace-pre-wrap text-[11px] md:text-xs text-text-primary leading-relaxed">
            {build.comment}
          </p>
          <div className="mt-auto pt-1">
            {build.display_name && (
              <span className="text-[10px] md:text-xs text-text-muted">— {build.display_name}</span>
            )}
          </div>
        </div>

        {/* フッター: 日時 + リアクション */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs md:text-sm text-text-muted">
            <span>{formatDate(build.updated_at)}</span>
          </div>
          <ThumbsUpDown
            thumbsUpCount={build.likes_count}
            thumbsDownCount={build.dislikes_count}
            userReaction={userReaction}
            onReact={handleBuildReaction}
          />
        </div>
      </div>

      {/* コメント投稿 */}
      <section>
        {!commentFormOpen ? (
          <div className="rounded-[14px] bg-gradient-to-r from-[rgba(246,51,154,0.1)] to-[rgba(255,32,86,0.1)] border border-accent-active/30 p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-sm font-bold text-text-primary">
                    この編成にコメントする
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted">感想や改善点を共有しよう</p>
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
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="コメントを入力..."
                  maxLength={300}
                  rows={3}
                  className="w-full rounded-xl border border-border-primary bg-bg-input px-3 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:outline-none resize-none"
                />
                <div className="mt-1 text-right text-xs text-text-tertiary">
                  {commentBody.length}/300
                </div>
              </div>
              {commentError && (
                <p className="text-sm text-thumbs-down">{commentError}</p>
              )}
              <Button type="submit" disabled={commentSubmitting} className="w-full">
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
        onReport={(id) => setReportTarget({ type: "build_comment", id })}
      />

      {/* 似ている編成 */}
      {similarBuilds.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-[#e05aa8] to-[#f08a9a]" />
            <h2 className="text-xl font-bold text-text-primary">似ている編成</h2>
          </div>
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {similarBuilds.map((sb) => (
              <Link
                key={sb.id}
                href={`/trickcal/builds/${sb.id}`}
                className="block rounded-2xl border border-border-primary bg-bg-card px-4 pt-2.5 pb-3 transition-colors hover:bg-bg-card-hover cursor-pointer"
              >
                {/* タイトル + 性格アイコン + モード */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-bold text-text-primary">
                    {sb.title || BUILD_MODE_LABEL_MAP[sb.mode]}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {sb.members_detail
                      .map((m) => m.element)
                      .filter((e, i, arr) => e && arr.indexOf(e) === i)
                      .map((el) => (
                        ELEMENT_ICONS[el as string] ? (
                          <StaticIcon
                            key={el}
                            src={ELEMENT_ICONS[el as string]}
                            alt={el as string}
                            width={16}
                            height={16}
                            className="h-4 w-4"
                          />
                        ) : null
                      ))}
                    <span className="rounded-md bg-bg-card-alpha-light px-2 py-0.5 text-[10px] font-bold text-text-muted">
                      {BUILD_MODE_LABEL_MAP[sb.mode]}
                    </span>
                  </div>
                </div>
                {/* キャラアイコン */}
                <div className="mb-2 flex gap-1">
                  {sb.members_detail.map((char, i) => (
                    <CharacterIcon
                      key={`${char.id}-${i}`}
                      name={char.name}
                      imageUrl={char.image_url}
                      isHidden={char.is_hidden}
                      size="sm"
                    />
                  ))}
                </div>
                {/* 日時 + いいね数 */}
                <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                  <span>{formatDate(sb.updated_at)}</span>
                  <span className="flex items-center gap-0.5 text-thumbs-up">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
                    </svg>
                    {sb.likes_count}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 一覧へ戻る */}
      <Link
        href="/trickcal/builds"
        className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-border-primary bg-bg-card py-3 text-sm font-medium text-text-primary transition-colors hover:bg-bg-card-hover"
      >
        <svg className="h-5 w-5 text-[#3b82f6]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
        人気編成ランキングに戻る
      </Link>

      {/* ページ下部ナビリンク */}
      <section className="!mt-10 space-y-3">
        <p className="text-xs md:text-sm font-bold text-text-tertiary">他のランキングもチェック</p>
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
          href="/trickcal/tiers"
          className="flex items-center gap-3 rounded-[14px] bg-gradient-to-r from-[rgba(144,72,212,0.15)] to-[rgba(212,64,138,0.15)] border border-[rgba(144,72,212,0.1)] px-4 py-3 transition-colors hover:from-[rgba(144,72,212,0.25)] hover:to-[rgba(212,64,138,0.25)] cursor-pointer"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
            style={{ backgroundImage: "linear-gradient(135deg, #9048d4, #d4408a)" }}
          >
            <svg className="h-5 w-5 text-white" viewBox="0 0 16 16" fill="none">
              <rect x="0" y="0.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="0.5" width="12" height="3" rx="0.5" fill="white" />
              <rect x="0" y="4.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="4.5" width="9" height="3" rx="0.5" fill="white" />
              <rect x="0" y="8.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="8.5" width="6" height="3" rx="0.5" fill="white" />
              <rect x="0" y="12.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="12.5" width="4" height="3" rx="0.5" fill="white" />
            </svg>
          </span>
          <div className="flex-1">
            <span className="block text-sm md:text-base font-bold text-text-primary">みんなのティア表</span>
            <span className="text-[10px] md:text-xs text-text-muted">キャラをランク付けして共有</span>
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

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

import { memo } from "react";

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
                    <span className="text-xs md:text-sm text-text-muted">{formatDate(c.created_at)}</span>
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
