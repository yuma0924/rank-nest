"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { StaticIcon } from "@/components/ui/static-icon";
import { CharacterCard } from "@/components/trickcal/character/character-card";
import { StarRatingDisplay } from "@/components/ui/star-rating";
import { CommentForm } from "@/components/comment/comment-form";
import { CommentList } from "@/components/comment/comment-list";
import { CommentImageLightbox } from "@/components/comment/comment-image-lightbox";
import { cn } from "@/lib/utils";
import { ROLE_ICON_MAP, POSITION_ICON_MAP, ATTACK_TYPE_ICON_MAP } from "@/lib/trickcal/constants";
import { useToast, Toast } from "@/components/ui/toast";
import type { CharacterDetail, RelatedCharacter } from "./page";


/** パラメータ行の「ラベル: 値」を分割し、値部分にアクセント色を適用 */
function ParamLine({ text }: { text: string }) {
  // 「ラベル: 値」形式
  const colonMatch = text.match(/^(.+?)([：:]\s*)(.+)$/);
  if (colonMatch) {
    const [, label, sep, value] = colonMatch;
    return (
      <>
        <span>{label}{sep}</span>
        <span className="font-medium text-star">{value}</span>
      </>
    );
  }
  // 「ラベル +数値%」形式（コロンなし）
  const numMatch = text.match(/^(.+?\s)([+\-−][\d.]+%?.*)$/);
  if (numMatch) {
    const [, label, value] = numMatch;
    return (
      <>
        <span>{label}</span>
        <span className="font-medium text-star">{value}</span>
      </>
    );
  }
  return <>{text}</>;
}

/** **text** を強調色の <span> に変換して表示 */
function StyledText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <span key={i} className="font-semibold text-[#f0c8a0]">{part.slice(2, -2)}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

type SortTab = "newest" | "thumbs_up";
type ReactionState = "up" | "down" | null;

interface CommentItem {
  id: string;
  commentType: "vote" | "board";
  displayName: string;
  body: string;
  rating: number | null;
  thumbsUpCount: number;
  thumbsDownCount: number;
  createdAt: string;
  isLatestVote: boolean;
  isDeleted: boolean;
  imageUrl: string | null;
}

const SKILL_LABEL_COLOR = "#2d6bc4";

const SKILL_CATEGORIES: { key: string; label: string; hasName?: boolean; hasCooltime?: boolean }[] = [
  { key: "low_grade", label: "低学年スキル", hasName: true },
  { key: "high_grade", label: "高学年スキル", hasName: true, hasCooltime: true },
  { key: "passive", label: "パッシブスキル" },
];


// Element color mappings for header image border/bg
const ELEMENT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  純粋: { border: "rgba(74,222,128,0.6)", bg: "rgba(74,222,128,0.15)", text: "#4ade80" },
  冷静: { border: "rgba(56,189,248,0.6)", bg: "rgba(56,189,248,0.15)", text: "#38bdf8" },
  狂気: { border: "rgba(251,113,133,0.6)", bg: "rgba(251,113,133,0.15)", text: "#fb7185" },
  活発: { border: "rgba(255,210,48,0.6)", bg: "rgba(255,210,48,0.15)", text: "#fcd34d" },
  憂鬱: { border: "rgba(167,139,250,0.6)", bg: "rgba(167,139,250,0.15)", text: "#a78bfa" },
};

const ELEMENT_ICON_MAP: Record<string, string> = {
  純粋: "/icons/pure.png",
  冷静: "/icons/calm.png",
  狂気: "/icons/madness.png",
  活発: "/icons/lively.png",
  憂鬱: "/icons/melancholy.png",
};


const SORT_MAP: Record<SortTab, string> = {
  newest: "new",
  thumbs_up: "thumbs_up",
};

interface InitialComments {
  comments: Array<{
    id: string;
    character_id: string;
    user_hash: string;
    comment_type: string;
    rating: number | null;
    body: string | null;
    display_name: string | null;
    is_latest_vote: boolean | null;
    is_deleted: boolean;
    thumbs_up_count: number;
    thumbs_down_count: number;
    image_url: string | null;
    created_at: string;
    user_reaction: "up" | "down" | null;
  }>;
  hasMore: boolean;
  nextCursor: string | null;
}

interface CharacterDetailClientProps {
  character: CharacterDetail;
  relatedCharacters: RelatedCharacter[];
  initialComments?: InitialComments;
}

export function CharacterDetailClient({
  character,
  relatedCharacters,
  initialComments,
}: CharacterDetailClientProps) {
  const [comments, setComments] = useState<CommentItem[]>(() => {
    if (!initialComments) return [];
    return initialComments.comments.map((c) => ({
      id: c.id,
      commentType: c.comment_type as "vote" | "board",
      displayName: c.display_name ?? "名無しの教主",
      body: c.body ?? "",
      rating: c.rating,
      thumbsUpCount: c.thumbs_up_count,
      thumbsDownCount: c.thumbs_down_count,
      createdAt: c.created_at,
      isLatestVote: c.is_latest_vote ?? false,
      isDeleted: c.is_deleted,
      imageUrl: c.image_url ?? null,
    }));
  });
  const [totalCount, setTotalCount] = useState(initialComments?.comments.length ?? 0);

  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [userReactions, setUserReactions] = useState<Record<string, ReactionState>>(() => {
    const initial: Record<string, ReactionState> = {};
    for (const c of initialComments?.comments ?? []) {
      if (c.user_reaction) initial[c.id] = c.user_reaction;
    }
    return initial;
  });
  const [, setUserHash] = useState<string | null>(null);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [relicDetailOpen, setRelicDetailOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const relicBtnRef = useRef<HTMLButtonElement>(null);
  const relicPcRef = useRef<HTMLDivElement>(null);
  const relicMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!relicDetailOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        relicPcRef.current?.contains(target) ||
        relicMobileRef.current?.contains(target)
      ) return;
      setRelicDetailOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [relicDetailOpen]);
  const { toast, showToast } = useToast();

  // user_hash 取得 + 初期コメントに対する自分のリアクションを取得
  useEffect(() => {
    let cancelled = false;
    fetch("/api/user-hash")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setUserHash(data.user_hash);
      })
      .catch(() => {});

    const ids = (initialComments?.comments ?? []).map((c) => c.id);
    if (ids.length > 0) {
      fetch(`/api/reactions?comment_ids=${ids.join(",")}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          if (data.reactions) {
            setUserReactions((prev) => ({ ...prev, ...data.reactions }));
          }
          // 最新の thumbs counts も同じスナップショットから適用してズレ防止
          if (data.counts) {
            const counts: Record<string, { thumbs_up: number; thumbs_down: number }> =
              data.counts;
            setComments((prev) =>
              prev.map((c) => {
                const cnt = counts[c.id];
                return cnt
                  ? { ...c, thumbsUpCount: cnt.thumbs_up, thumbsDownCount: cnt.thumbs_down }
                  : c;
              })
            );
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [initialComments]);

  // コメント取得
  const fetchComments = useCallback(
    async (sort: SortTab, offset = 0, append = false) => {
      setCommentsLoading(true);
      try {
        const res = await fetch(
          `/api/comments?character_id=${character.id}&sort=${SORT_MAP[sort]}&limit=20&offset=${offset}`
        );
        const data = await res.json();

        const mapped: CommentItem[] = (data.comments ?? []).map(
          (c: Record<string, unknown>) => ({
            id: c.id as string,
            commentType: c.comment_type as "vote" | "board",
            displayName: (c.display_name as string) ?? "名無しの教主",
            body: (c.body as string) ?? "",
            rating: c.rating as number | null,
            thumbsUpCount: c.thumbs_up_count as number,
            thumbsDownCount: c.thumbs_down_count as number,
            createdAt: c.created_at as string,
            isLatestVote: c.is_latest_vote as boolean,
            isDeleted: c.is_deleted as boolean,
            imageUrl: (c.image_url as string | null) ?? null,
          })
        );

        if (append) {
          setComments((prev) => [...prev, ...mapped]);
        } else {
          setComments(mapped);
        }
        setTotalCount(data.total ?? 0);

        // リアクション取得
        const commentIds = mapped.map((c) => c.id).join(",");
        if (commentIds) {
          const reactRes = await fetch(
            `/api/reactions?comment_ids=${commentIds}`
          );
          const reactData = await reactRes.json();
          if (reactData.reactions) {
            setUserReactions((prev) => ({ ...prev, ...reactData.reactions }));
          }
        }
      } catch {
        // エラー無視
      } finally {
        setCommentsLoading(false);
      }
    },
    [character.id]
  );

  const initialFetchDone = useRef(!!initialComments);
  useEffect(() => {
    if (initialFetchDone.current) {
      initialFetchDone.current = false;
      return;
    }
    fetchComments("newest");
  }, [fetchComments]);


  // コメント投稿（multipart/form-data で送信、画像が任意で添付可能）
  const handleSubmit = async (data: {
    displayName: string;
    rating: number | null;
    body: string;
    image: File | null;
  }) => {
    setSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append("character_id", character.id);
      formData.append(
        "comment_type",
        data.rating !== null ? "vote" : "board"
      );
      if (data.rating !== null) formData.append("rating", String(data.rating));
      formData.append("body", data.body);
      formData.append("display_name", data.displayName);
      if (data.image) formData.append("image", data.image);

      const res = await fetch("/api/comments", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData.comment) {
          const newComment: CommentItem = {
            id: resData.comment.id,
            commentType: resData.comment.comment_type,
            displayName: resData.comment.display_name ?? "名無しの教主",
            body: resData.comment.body ?? "",
            rating: resData.comment.rating,
            thumbsUpCount: 0,
            thumbsDownCount: 0,
            createdAt: resData.comment.created_at,
            isLatestVote: true,
            isDeleted: false,
            imageUrl: resData.comment.image_url ?? null,
          };
          setComments((prev) => [newComment, ...prev]);
          setTotalCount((prev) => prev + 1);
        }
        setFormOpen(false);
        showToast("投稿しました！");
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.error ?? "投稿に失敗しました", "error");
      }
    } catch {
      showToast("投稿に失敗しました", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // コメント毎に abort controller を保持
  const reactAbortRef = useRef<Map<string, AbortController>>(new Map());

  const resyncReactionsFromServer = async (commentIds: string[]) => {
    if (commentIds.length === 0) return;
    try {
      const r = await fetch(`/api/reactions?comment_ids=${commentIds.join(",")}`);
      if (!r.ok) return;
      const data = await r.json();
      if (data.reactions) {
        setUserReactions((prev) => ({ ...prev, ...data.reactions }));
      }
    } catch {
      // ignore
    }
  };

  const handleReact = async (commentId: string, reaction: ReactionState) => {
    reactAbortRef.current.get(commentId)?.abort();
    const controller = new AbortController();
    reactAbortRef.current.set(commentId, controller);

    const prevReaction = userReactions[commentId] ?? null;
    setUserReactions((prev) => ({ ...prev, [commentId]: reaction }));
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        let up = c.thumbsUpCount;
        let down = c.thumbsDownCount;
        if (prevReaction === "up") up--;
        if (prevReaction === "down") down--;
        if (reaction === "up") up++;
        if (reaction === "down") down++;
        return {
          ...c,
          thumbsUpCount: Math.max(0, up),
          thumbsDownCount: Math.max(0, down),
        };
      })
    );

    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId, reaction_type: reaction }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (res.ok) {
        const data = await res.json();
        setUserReactions((prev) => ({ ...prev, [commentId]: data.reaction_type }));
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  thumbsUpCount: data.thumbs_up_count,
                  thumbsDownCount: data.thumbs_down_count,
                }
              : c
          )
        );
      } else {
        await resyncReactionsFromServer([commentId]);
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      await resyncReactionsFromServer([commentId]);
    }
  };

  // 通報
  const handleReport = async (commentId: string) => {
    if (!confirm("このコメントを通報しますか？")) return;

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: "comment",
          target_id: commentId,
        }),
      });

      if (res.ok) {
        alert("通報しました");
      } else {
        const data = await res.json();
        alert(data.error ?? "通報に失敗しました");
      }
    } catch {
      alert("通報に失敗しました");
    }
  };

  // ソートタブ変更
  // もっと読む
  const handleLoadMore = () => {
    fetchComments("newest", comments.length, true);
  };

  // スキル情報
  const skills = Array.isArray(character.skills) ? (character.skills as Array<Record<string, unknown>>) : null;

  const elemColors = character.element ? ELEMENT_COLORS[character.element] : null;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ヒーローエリア */}
      <div className="flex items-start gap-4 md:gap-5">
        {/* キャラ画像 モバイル96px / PC224px */}
        <div
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[10px] md:h-56 md:w-56 md:rounded-[16px]"
          style={{
            border: `1.2px solid ${elemColors?.border ?? "rgba(249,168,212,0.2)"}`,
            backgroundColor: elemColors?.bg ?? "transparent",
          }}
        >
          {character.imageUrl ? (
            <Image
              src={character.imageUrl}
              alt={character.name}
              width={224}
              height={224}
              className="h-full w-full object-cover"
              priority
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-bg-tertiary text-lg text-text-tertiary md:text-2xl">
              {character.name.charAt(0)}
            </div>
          )}
        </div>

        {/* キャラ情報 */}
        <div className="min-w-0 flex-1 md:flex-initial">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl md:text-3xl font-bold text-text-primary">
              {character.name}
            </h1>
            {character.element && ELEMENT_ICON_MAP[character.element] && (
              <StaticIcon src={ELEMENT_ICON_MAP[character.element]} alt={character.element} width={22} height={22} className="shrink-0 md:h-7 md:w-7" />
            )}
          </div>

          {/* タグ行 */}
          <div className="mt-1.5 md:mt-3 flex flex-wrap items-center gap-1 md:gap-2">
            {character.role && ROLE_ICON_MAP[character.role] && (
              <span className="flex items-center gap-1 rounded-[4px] bg-bg-tertiary px-1.5 py-0.5 text-[13px] md:px-2.5 md:py-1 md:text-base text-text-tertiary">
                <StaticIcon src={ROLE_ICON_MAP[character.role]} alt={character.role} width={15} height={15} className="md:h-5 md:w-5" />
                {character.role}
              </span>
            )}
            {character.position && POSITION_ICON_MAP[character.position] && (
              <span className="flex items-center gap-1 rounded-[4px] bg-bg-tertiary px-1.5 py-0.5 text-[13px] md:px-2.5 md:py-1 md:text-base text-text-tertiary">
                <StaticIcon src={POSITION_ICON_MAP[character.position]} alt={character.position} width={15} height={15} className="md:h-5 md:w-5" />
                {character.position}
              </span>
            )}
            {character.attackType && ATTACK_TYPE_ICON_MAP[character.attackType] && (
              <span className="flex items-center gap-1 rounded-[4px] bg-bg-tertiary px-1.5 py-0.5 text-[13px] md:px-2.5 md:py-1 md:text-base text-text-tertiary">
                <StaticIcon src={ATTACK_TYPE_ICON_MAP[character.attackType]} alt={character.attackType} width={15} height={15} className="md:h-5 md:w-5" />
                {character.attackType}
              </span>
            )}
            {character.race && (
              <span className="rounded-[4px] bg-bg-tertiary px-1.5 py-0.5 text-[13px] md:px-2.5 md:py-1 md:text-base text-text-tertiary">
                {character.race}
              </span>
            )}

          </div>

          {/* 評価 */}
          {character.avgRating !== null && character.validVotesCount >= 1 ? (
            <div className="mt-2.5 md:mt-4 flex items-center">
              <StarRatingDisplay rating={character.avgRating} size="lg" />
            </div>
          ) : (
            <p className="mt-1.5 text-xs md:text-base text-text-tertiary">
              {character.validVotesCount > 0
                ? `${character.validVotesCount}票（順位対象外）`
                : "まだ投票がありません"}
            </p>
          )}

          {/* PC版 愛用カード（★の下・展開式） */}
          {character.relic && (
            <div ref={relicPcRef} className="relative mt-3 hidden md:mt-5 md:block">
              <button
                ref={relicBtnRef}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[12px] border px-2 py-2 transition-colors",
                  relicDetailOpen
                    ? "border-border-primary bg-bg-card-alpha"
                    : "border-border-primary bg-bg-card-alpha-lighter hover:border-border-primary hover:bg-bg-card-alpha-light"
                )}
                onClick={() => setRelicDetailOpen(!relicDetailOpen)}
              >
                {character.relic.imageUrl && (
                  <img src={character.relic.imageUrl} alt={character.relic.name} width={136} height={136} loading="eager" fetchPriority="high" decoding="sync" className="h-[68px] w-[68px] shrink-0 rounded-lg" />
                )}
                <div className="min-w-0 text-left">
                  <p className="text-sm text-text-tertiary">愛用カード</p>
                  <p className="mt-0.5 text-base font-bold leading-snug text-text-primary">{character.relic.name}</p>
                </div>
                <svg
                  className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${relicDetailOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {relicDetailOpen && (
                <div
                  className="absolute left-0 top-full z-10 mt-1 rounded-[12px] border border-border-primary bg-bg-primary px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
                  style={{ width: relicBtnRef.current?.offsetWidth }}
                >
                  {character.relic.params && (
                    <ul className="space-y-0.5 border-l-2 border-border-primary pl-2.5">
                      {character.relic.params.split("\n").filter(Boolean).map((line, i) => (
                        <li key={i} className="text-sm leading-relaxed text-text-tertiary">
                          <ParamLine text={line} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {character.relic.description && (
                    <p className={`text-sm leading-relaxed text-text-tertiary ${character.relic.params ? "mt-2.5" : ""}`}>{character.relic.description}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PC版 大好物・アルバイト報酬（右側） */}
        {(character.favoriteItem || character.partTimeRewards.length > 0) && (
          <div className="hidden flex-1 flex-col gap-3 pt-[3rem] md:flex">
            {character.favoriteItem && (
              <div className="flex items-start gap-3 rounded-[12px] border border-border-primary bg-bg-card-alpha-lighter px-3 py-2.5">
                {character.favoriteItem.imageUrl && (
                  <img src={character.favoriteItem.imageUrl} alt={character.favoriteItem.name} width={112} height={112} loading="eager" fetchPriority="high" decoding="sync" className="h-14 w-14 shrink-0 rounded-lg" />
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-xs text-text-tertiary">
                    <StaticIcon src="/icons/favorite.png" alt="" width={20} height={20} className="shrink-0" />
                    大好物
                  </p>
                  <p className="mt-0.5 text-base font-bold leading-snug text-text-primary">{character.favoriteItem.name}</p>
                </div>
              </div>
            )}
            {character.partTimeRewards.length > 0 && (
              <div className="rounded-[12px] border border-border-primary bg-bg-card-alpha-lighter px-2 py-2.5">
                <p className="px-0.5 text-xs text-text-tertiary">
                  アルバイト報酬
                  <span className="ml-1.5 text-[10px] text-text-muted">クリックで同報酬のキャラを表示</span>
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {character.partTimeRewards.map((reward, i) => (
                    <Link
                      key={reward.id}
                      href={`/trickcal/rewards?item=${reward.id}`}
                      className="group relative shrink-0 rounded-md transition-all hover:brightness-110"
                    >
                      {reward.imageUrl ? (
                        <img src={reward.imageUrl} alt={reward.name} width={104} height={104} loading="eager" fetchPriority="high" decoding="sync" className="h-[52px] w-[52px] rounded-md" />
                      ) : (
                        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-md bg-[rgba(249,168,212,0.1)] text-[10px] text-text-muted">?</div>
                      )}
                      {i === 0 && (
                        <StaticIcon src="/icons/good.png" alt="" width={16} height={16} className="absolute -left-1 -top-1" />
                      )}
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-bg-input px-2 py-1 text-[11px] text-text-tertiary shadow-lg group-hover:block">
                        {reward.name}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* モバイル版 愛用カード（スキルの上・タップで展開） */}
      {character.relic && (
        <div ref={relicMobileRef} className="relative md:hidden border-t border-border-primary pt-3">
          <button
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-[10px] border px-2 py-1.5 transition-colors",
              relicDetailOpen
                ? "border-border-primary bg-bg-card-alpha"
                : "border-border-primary bg-bg-card-alpha-light"
            )}
            onClick={() => setRelicDetailOpen(!relicDetailOpen)}
          >
            {character.relic.imageUrl && (
              <img src={character.relic.imageUrl} alt={character.relic.name} width={104} height={104} loading="eager" fetchPriority="high" decoding="sync" className="h-[52px] w-[52px] shrink-0 rounded-md" />
            )}
            <div className="min-w-0 text-left flex-1">
              <p className="text-[10px] text-text-tertiary">愛用カード</p>
              <p className="text-sm font-bold text-text-primary">{character.relic.name}</p>
            </div>
            <svg
              className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform ${relicDetailOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {relicDetailOpen && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-[10px] border border-border-primary bg-bg-primary px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
              {character.relic.params && (
                <ul className="space-y-0.5 border-l-2 border-border-primary pl-2.5">
                  {character.relic.params.split("\n").filter(Boolean).map((line, i) => (
                    <li key={i} className="text-xs leading-relaxed text-text-tertiary">
                      <ParamLine text={line} />
                    </li>
                  ))}
                </ul>
              )}
              {character.relic.description && (
                <p className={`text-xs leading-relaxed text-text-tertiary ${character.relic.params ? "mt-2" : ""}`}>{character.relic.description}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* モバイル版 大好物・アルバイト報酬 */}
      {(character.favoriteItem || character.partTimeRewards.length > 0) && (
        <div className="md:hidden !mt-2">
          <div className="flex items-stretch gap-2">
            {character.favoriteItem && (
              <div className="flex flex-1 flex-col justify-center rounded-[10px] border border-border-primary bg-bg-card-alpha-light px-2.5 py-2">
                <p className="flex items-center gap-1 text-[10px] text-text-muted">
                  <StaticIcon src="/icons/favorite.png" alt="" width={16} height={16} className="shrink-0" />
                  大好物
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {character.favoriteItem.imageUrl && (
                    <img src={character.favoriteItem.imageUrl} alt={character.favoriteItem.name} width={72} height={72} loading="eager" fetchPriority="high" decoding="sync" className="h-9 w-9 shrink-0 rounded-md" />
                  )}
                  <p className="text-xs font-bold leading-snug text-text-primary">{character.favoriteItem.name}</p>
                </div>
              </div>
            )}
            {character.partTimeRewards.length > 0 && (
              <div className="flex flex-1 flex-col justify-center rounded-[10px] border border-border-primary bg-bg-card-alpha-light px-2.5 py-2">
                <p className="text-[10px] text-text-muted">アルバイト報酬</p>
                <div className="mt-1 flex items-center gap-1">
                  {character.partTimeRewards.map((reward, i) => (
                    <Link
                      key={reward.id}
                      href={`/trickcal/rewards?item=${reward.id}`}
                      className="relative shrink-0 rounded transition-all hover:brightness-110"
                    >
                      {reward.imageUrl ? (
                        <img src={reward.imageUrl} alt={reward.name} width={72} height={72} loading="eager" fetchPriority="high" decoding="sync" className="h-9 w-9 rounded" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-[rgba(249,168,212,0.1)] text-[10px] text-text-muted">?</div>
                      )}
                      {i === 0 && (
                        <StaticIcon src="/icons/good.png" alt="" width={12} height={12} className="absolute -left-0.5 -top-0.5" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* スキル (チラ見せ + 展開) */}
      <section className="border-t border-border-primary pt-3">
        {/* モバイル: 見出しタップで展開 */}
        <button
          className="flex w-full cursor-pointer items-center justify-between pr-2 mb-3 md:hidden"
          onClick={() => setSkillsOpen(!skillsOpen)}
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm font-bold text-text-primary">スキル</span>
          </span>
          <svg
            className={`h-3.5 w-3.5 text-text-muted transition-transform ${skillsOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {/* PC: 見出しのみ（展開ボタンは下） */}
        <div className="hidden items-center gap-2 mb-3 md:flex">
          <svg className="h-5 w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-base font-bold text-text-primary">スキル</span>
        </div>
        <div className="relative">
          <div
            className={cn(
              "overflow-hidden",
              skillsOpen ? "max-h-none pb-3" : "max-h-0 md:max-h-28"
            )}
          >
            {/* PC: 2列グリッド / モバイル: 縦積み */}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {/* 上段: 低学年スキル / 高学年スキル */}
              {SKILL_CATEGORIES.map((cat) => {
                const skillData = skills?.find((s) => s.category === cat.key) as Record<string, unknown> | undefined;
                if (!skillData) return (
                  <div key={cat.key} className="flex flex-col overflow-hidden rounded-[10px] border border-border-primary">
                    <div className="flex items-center gap-2 bg-bg-inset px-3 py-2">
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[11px] md:text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: SKILL_LABEL_COLOR }}
                      >{cat.label}</span>
                      <span className="text-xs text-text-muted">—</span>
                    </div>
                    <div className="flex-1 bg-bg-card" />
                  </div>
                );
                return (
                  <div key={cat.key} className="flex flex-col overflow-hidden rounded-[10px] border border-border-primary">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 bg-bg-inset px-3 py-2">
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[11px] md:text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: SKILL_LABEL_COLOR }}
                      >{cat.label}</span>
                      {cat.hasName && typeof skillData.name === "string" && (
                        <span className="text-sm font-bold text-text-primary">{skillData.name}</span>
                      )}
                      {cat.hasCooltime && typeof skillData.cooltime === "number" && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] md:text-xs font-bold text-text-secondary">
                          CT {skillData.cooltime}秒
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-[10px] md:text-xs text-text-muted">Lv12効果</span>
                    </div>
                    {/* 説明文エリア */}
                    <div className="bg-bg-card px-3 py-2.5">
                      {typeof skillData.description === "string" && (
                        <p className="whitespace-pre-line text-xs md:text-sm leading-relaxed text-text-tertiary">
                          <StyledText text={skillData.description as string} />
                        </p>
                      )}
                    </div>
                    {/* パラメータエリア */}
                    <div className="border-t border-border-secondary bg-bg-card px-3 py-2">
                      {typeof skillData.params === "string" && skillData.params !== "" ? (
                        <ul className="space-y-0.5 border-l-2 border-border-primary pl-2.5">
                          {(skillData.params as string).split("\n").filter(Boolean).map((line, i) => (
                            <li key={i} className="text-[11px] md:text-xs leading-relaxed text-text-tertiary"><ParamLine text={line} /></li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </div>
                    {/* 余白（パラメータが少ない方を下に伸ばす） */}
                    <div className="flex-1 bg-bg-card" />
                  </div>
                );
              })}

              {/* 下段: 普通攻撃（1カード内で基本・強化を横並び） — グリッド2列分使う */}
              {(() => {
                const basicAttack = skills?.find((s) => s.category === "normal_attack_basic") as Record<string, unknown> | undefined;
                const enhancedAttack = skills?.find((s) => s.category === "normal_attack_enhanced") as Record<string, unknown> | undefined;
                if (!basicAttack && !enhancedAttack) {
                  return (
                    <div className="flex flex-col overflow-hidden rounded-[10px] border border-border-primary">
                      <div className="flex items-center gap-2 bg-bg-inset px-3 py-2">
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] md:text-xs font-bold text-white shadow-sm" style={{ backgroundColor: SKILL_LABEL_COLOR }}>普通攻撃</span>
                        <span className="text-xs text-text-muted">—</span>
                      </div>
                      <div className="flex-1 bg-bg-card" />
                    </div>
                  );
                }
                const renderAttackDesc = (data: Record<string, unknown>) => (
                  typeof data.description === "string" ? (
                    <p className="whitespace-pre-line text-xs leading-relaxed text-text-tertiary">
                      <StyledText text={data.description as string} />
                    </p>
                  ) : null
                );
                const renderAttackParams = (data: Record<string, unknown>) => (
                  typeof data.params === "string" && data.params !== "" ? (
                    <ul className="space-y-0.5 border-l-2 border-border-primary pl-2.5">
                      {(data.params as string).split("\n").filter(Boolean).map((line, i) => (
                        <li key={i} className="text-[10px] md:text-[11px] leading-relaxed text-text-tertiary"><ParamLine text={line} /></li>
                      ))}
                    </ul>
                  ) : <span className="text-xs text-text-muted">—</span>
                );
                return (
                  <div className="flex flex-col overflow-hidden rounded-[10px] border border-border-primary">
                    <div className="flex items-center bg-bg-inset px-3 py-2">
                      <span className="rounded px-1.5 py-0.5 text-[11px] md:text-xs font-bold text-white shadow-sm" style={{ backgroundColor: SKILL_LABEL_COLOR }}>普通攻撃</span>
                    </div>
                    {/* 基本・強化を独立カラムで横並び、各カラム内で説明→パラメータの順 */}
                    <div className="flex-1 bg-bg-card">
                      <div className="flex flex-col md:flex-row">
                        {basicAttack && (
                          <div className="flex flex-1 flex-col md:border-r md:border-border-primary">
                            <div className="px-3 pt-1 pb-2.5">
                              <div className="mb-1.5">
                                <span className="rounded border border-border-primary px-1.5 py-0.5 text-[10px] font-bold text-text-primary/70">基本</span>
                              </div>
                              {renderAttackDesc(basicAttack)}
                            </div>
                            <div className="border-t border-border-secondary px-3 py-2">
                              {renderAttackParams(basicAttack)}
                            </div>
                            <div className="flex-1" />
                          </div>
                        )}
                        {enhancedAttack && (
                          <div className="flex flex-1 flex-col border-t border-border-secondary md:border-t-0">
                            <div className="px-3 pt-1 pb-2.5">
                              <div className="mb-1.5">
                                <span className="rounded border border-border-primary px-1.5 py-0.5 text-[10px] font-bold text-text-primary/70">強化</span>
                              </div>
                              {renderAttackDesc(enhancedAttack)}
                            </div>
                            <div className="border-t border-border-secondary px-3 py-2">
                              {renderAttackParams(enhancedAttack)}
                            </div>
                            <div className="flex-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          {/* グラデーションオーバーレイ（閉じてる時のみ） */}
          {!skillsOpen && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-bg-card-alpha-heavy to-transparent md:block md:h-16" />
          )}
        </div>
        <button
          className="mt-2 hidden w-full cursor-pointer items-center justify-center gap-1 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-tertiary md:flex"
          onClick={() => setSkillsOpen(!skillsOpen)}
        >
          {skillsOpen ? "スキルを閉じる" : "スキルをすべて表示"}
          <svg
            className={`h-3.5 w-3.5 transition-transform ${skillsOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </section>

      {/* 投稿フォーム */}
      <section className="-mt-1.5 md:mt-0">
        {!formOpen ? (
          <div className="rounded-[14px] bg-gradient-to-r from-[rgba(246,51,154,0.1)] to-[rgba(255,32,86,0.1)] border border-accent-active/30 px-4 py-2.5 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 shrink-0 text-star" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
                </svg>
                <span className="text-sm md:text-lg font-bold text-text-primary">
                  {character.name}を評価する
                </span>
                <span className="hidden text-base text-text-tertiary md:inline md:ml-3"><span className="text-star">★</span>評価とコメントを投稿できます</span>
              </div>
              <button
                onClick={() => setFormOpen(true)}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-accent/80 px-4 md:px-6 py-2 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                投稿する
              </button>
            </div>
          </div>
        ) : (
          <CommentForm
            onSubmit={handleSubmit}
            onClose={() => setFormOpen(false)}
            showRating
            loading={submitLoading}
          />
        )}
      </section>

      {/* コメント一覧 */}
      <SortableCharacterCommentList
        comments={comments}
        totalCount={totalCount}
        commentsLoading={commentsLoading}
        onLoadMore={handleLoadMore}
        userReactions={userReactions}
        onReact={handleReact}
        onReport={handleReport}
        onImageClick={setLightboxUrl}
      />

      {/* 回遊エリア: 関連キャラ */}
      {relatedCharacters.length > 0 && (
        <section className="!mt-10 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 md:h-5 md:w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm md:text-base font-bold text-text-primary">次に見る</span>
            </div>
            <p className="mt-0.5 text-xs md:text-sm text-text-muted">同じ性格・レアリティのキャラ</p>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {relatedCharacters.map((c) => (
              <CharacterCard
                key={c.id}
                slug={c.slug}
                name={c.name}
                imageUrl={c.imageUrl}
                avgRating={c.avgRating}
                lazy
              />
            ))}
          </div>
        </section>
      )}

      {/* 一覧へ戻る */}
      <Link
        href="/trickcal/ranking"
        className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-border-primary bg-bg-card py-3 text-sm font-medium text-text-primary transition-colors hover:bg-bg-card-hover"
      >
        <svg className="h-5 w-5 text-[#ffb900]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
        </svg>
        人気キャラランキングに戻る
      </Link>

      {/* ページ下部ナビリンク */}
      <section className="!mt-10 space-y-3">
        <p className="text-xs md:text-sm font-bold text-text-tertiary">他のランキングもチェック</p>
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

      <Toast message={toast.message} visible={toast.visible} />
      <CommentImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}

import { memo } from "react";

const SORT_TABS_COMMENT = [
  { value: "newest" as SortTab, label: "新着順" },
  { value: "thumbs_up" as SortTab, label: "人気順" },
];

const SortableCharacterCommentList = memo(function SortableCharacterCommentList({
  comments,
  totalCount,
  commentsLoading,
  onLoadMore,
  userReactions,
  onReact,
  onReport,
  onImageClick,
}: {
  comments: CommentItem[];
  totalCount: number;
  commentsLoading: boolean;
  onLoadMore: () => void;
  userReactions: Record<string, ReactionState>;
  onReact: (commentId: string, reaction: ReactionState) => void;
  onReport: (commentId: string) => void;
  onImageClick: (url: string) => void;
}) {
  const [sortTab, setSortTab] = useState<SortTab>("newest");

  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    if (sortTab === "thumbs_up") {
      sorted.sort((a, b) => {
        const netA = a.thumbsUpCount - a.thumbsDownCount;
        const netB = b.thumbsUpCount - b.thumbsDownCount;
        if (netB !== netA) return netB - netA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [comments, sortTab]);

  return (
    <section className="md:-mt-1">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 md:h-5 md:w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm md:text-base font-bold text-text-primary">
            コメント ({totalCount})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {SORT_TABS_COMMENT.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSortTab(tab.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs md:text-sm md:px-3 md:py-1.5 font-medium transition-colors cursor-pointer",
                sortTab === tab.value
                  ? "border-accent-active/40 bg-accent-active/12 text-accent-active"
                  : "border-[rgba(139,122,171,0.3)] text-text-muted hover:text-text-tertiary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <CommentList
        comments={sortedComments}
        totalCount={totalCount}
        sortTab={sortTab}
        onSortChange={setSortTab}
        onLoadMore={onLoadMore}
        loading={commentsLoading}
        userReactions={userReactions}
        onReact={onReact}
        onReport={onReport}
        onImageClick={onImageClick}
        accentColor="#22a870"
        hideTab
      />
    </section>
  );
});
