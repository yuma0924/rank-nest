import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { StaticIcon } from "@/components/ui/static-icon";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllVisibleCharacters } from "@/lib/trickcal/cached-queries";
import { BuildsClient } from "./builds-client";
import type { BuildMode } from "@/lib/trickcal/constants";

const ELEMENT_ICON_MAP: Record<string, string> = {
  純粋: "/icons/pure.png",
  冷静: "/icons/calm.png",
  狂気: "/icons/madness.png",
  活発: "/icons/lively.png",
  憂鬱: "/icons/melancholy.png",
};

export const revalidate = 60;

export const metadata: Metadata = {
  title: "人気編成ランキング | みんなで決めるトリッカルランキング",
  description:
    "トリッカルの人気編成ランキング。コンテンツ別の人気編成をチェック",
  alternates: {
    canonical: "/trickcal/builds",
  },
};

export default async function BuildsPage() {
  const supabase = createAdminClient();

  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  // recentComments / rankings / characters / initialBuilds を全て Wave1 で並列
  const [
    { data: recentComments },
    { data: rankings },
    allCharsCached,
    { data: initialBuilds },
  ] = await Promise.all([
    supabase
      .from("comments")
      .select("character_id, user_hash, body, display_name, thumbs_up_count")
      .eq("is_deleted", false)
      .gte("created_at", twentyFourHoursAgo)
      .limit(200),
    supabase
      .from("character_rankings")
      .select("character_id, avg_rating, valid_votes_count"),
    getAllVisibleCharacters(),
    supabase
      .from("builds")
      .select("id, mode, members, element_label, title, display_name, comment, likes_count, dislikes_count, created_at, updated_at, user_hash, build_comments(count)")
      .eq("is_deleted", false)
      .eq("mode", "general")
      .order("likes_count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(21),
  ]);

  // --- 話題のキャラクター集計（直近24時間） ---
  const trendingMap = new Map<string, number>();
  const userCharCountMap = new Map<string, number>();
  const trendingCommentMap = new Map<string, { body: string; author: string; thumbsUp: number }>();

  if (recentComments) {
    for (const rc of recentComments) {
      const key = `${rc.character_id}:${rc.user_hash}`;
      const currentCount = userCharCountMap.get(key) ?? 0;
      userCharCountMap.set(key, currentCount + 1);
      if (currentCount < 3) {
        trendingMap.set(
          rc.character_id,
          (trendingMap.get(rc.character_id) ?? 0) + 1
        );
      }
      if (!trendingCommentMap.has(rc.character_id) && rc.body) {
        trendingCommentMap.set(rc.character_id, {
          body: rc.body,
          author: rc.display_name || "名無しの教主",
          thumbsUp: rc.thumbs_up_count ?? 0,
        });
      }
    }
  }

  const characters = allCharsCached.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    element: c.element,
    image_url: c.image_url,
  }));
  const buildCharMap = new Map(allCharsCached.map((c) => [c.id, c]));

  const initialBuildsData = {
    builds: (initialBuilds ?? []).slice(0, 20).map((b) => {
      // 実メンバー数で party_size を計算（alias は 6 / 9 が混在し得る）
      const actualMembersCount = (b.members as (string | null)[]).filter(
        (id): id is string => id !== null
      ).length;
      const partySize =
        b.mode === "dimension"
          ? 9
          : b.mode === "alias"
            ? actualMembersCount === 9
              ? 9
              : 6
            : 6;
      return {
      id: b.id,
      mode: b.mode as BuildMode,
      party_size: partySize,
      members: b.members as string[],
      members_detail: (b.members as (string | null)[]).filter((id): id is string => id !== null).map((id) => {
        const c = buildCharMap.get(id);
        return c ?? { id, name: "不明", slug: "", element: null, position: null, image_url: null, is_hidden: false };
      }),
      element_label: b.element_label,
      title: b.title,
      display_name: b.display_name,
      comment: b.comment,
      likes_count: b.likes_count,
      dislikes_count: b.dislikes_count,
      is_deleted: false,
      created_at: b.created_at,
      updated_at: b.updated_at,
      user_reaction: null as "up" | "down" | null,
      comments_count: Array.isArray(b.build_comments) && b.build_comments.length > 0
        ? (b.build_comments[0] as { count: number }).count
        : 0,
      };
    }),
    hasMore: (initialBuilds ?? []).length > 20,
    nextCursor: (initialBuilds ?? []).length > 20 ? (initialBuilds ?? [])[19]?.id ?? null : null,
  };

  const charMap = new Map<
    string,
    { slug: string; name: string; element: string | null; imageUrl: string | null }
  >();
  if (characters) {
    for (const c of characters) {
      charMap.set(c.id, {
        slug: c.slug,
        name: c.name,
        element: c.element,
        imageUrl: c.image_url,
      });
    }
  }

  const trendingEntries = Array.from(trendingMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // ランキングマップ
  const rankingLookup = new Map<string, { avgRating: number; validVotesCount: number }>();
  if (rankings) {
    for (const r of rankings) {
      rankingLookup.set(r.character_id, {
        avgRating: r.avg_rating,
        validVotesCount: r.valid_votes_count,
      });
    }
  }

  interface TrendingChar {
    id: string;
    slug: string;
    name: string;
    element: string | null;
    imageUrl: string | null;
    commentCount: number;
    avgRating: number | null;
    validVotesCount: number;
    latestComment: string | null;
    latestCommentAuthor: string | null;
    latestCommentThumbsUp: number;
  }

  const trendingCharacters: TrendingChar[] = trendingEntries
    .map(([id, count]) => {
      const char = charMap.get(id);
      if (!char) return null;
      const rr = rankingLookup.get(id);
      return {
        id,
        slug: char.slug,
        name: char.name,
        element: char.element,
        imageUrl: char.imageUrl,
        commentCount: count,
        avgRating: rr?.avgRating ?? null,
        validVotesCount: rr?.validVotesCount ?? 0,
        latestComment: trendingCommentMap.get(id)?.body ?? null,
        latestCommentAuthor: trendingCommentMap.get(id)?.author ?? null,
        latestCommentThumbsUp: trendingCommentMap.get(id)?.thumbsUp ?? 0,
      };
    })
    .filter((c): c is TrendingChar => c !== null);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px]"
            style={{ backgroundImage: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </span>
          <h1 className="text-lg font-bold text-text-primary">人気編成ランキング</h1>
        </div>
        <p className="mt-1 pl-[42px] text-xs md:text-sm text-text-muted">
          人気のパーティ編成をチェック・投稿しよう
        </p>
      </div>

      <BuildsClient initialBuilds={initialBuildsData} />

      {/* 話題のキャラクター（直近24時間） */}
      {trendingCharacters.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px]"
                  style={{ backgroundImage: "linear-gradient(135deg, #e05aa8, #ff8904)" }}
                >
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </span>
                <h2 className="text-base md:text-lg font-bold text-text-primary">
                  話題のキャラクター
                </h2>
              </div>
              <span className="text-xs md:text-sm text-text-muted">最近の注目</span>
            </div>
            <p className="text-xs md:text-sm text-text-tertiary">今注目されているキャラクターをチェック！</p>
          </div>
          <div className="-mx-4 grid grid-cols-2 md:grid-cols-3 gap-2 px-2">
            {trendingCharacters.map((char) => (
              <Link
                key={char.id}
                href={`/trickcal/characters/${char.slug}`}
                className="flex flex-col overflow-hidden rounded-[14px] border border-border-primary bg-bg-card-alpha-light transition-colors hover:bg-bg-card-alpha cursor-pointer"
              >
                {/* キャラ情報 */}
                <div className="flex items-center gap-2.5 p-2.5">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-bg-tertiary">
                    {char.imageUrl ? (
                      <Image
                        src={char.imageUrl}
                        alt={char.name}
                        width={56}
                        height={56}
                        sizes="56px"
                        className="h-full w-full object-cover"
                        loading="eager"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-bg-tertiary text-sm text-text-muted">
                        {char.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm font-bold text-text-primary">
                        {char.name}
                      </p>
                      {char.element && ELEMENT_ICON_MAP[char.element] && (
                        <StaticIcon src={ELEMENT_ICON_MAP[char.element]} alt={char.element} width={16} height={16} className="shrink-0" />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {char.avgRating !== null && char.validVotesCount >= 1 ? (
                        <span className="text-sm font-bold text-star">
                          ★{char.avgRating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs md:text-sm text-text-muted">
                          未評価
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 rounded bg-[rgba(246,51,154,0.8)] px-1.5 py-0.5 text-[10px] md:text-xs font-bold text-white">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        +{char.commentCount}
                      </span>
                    </div>
                  </div>
                </div>
                {/* コメント */}
                {char.latestComment && (
                  <div className="mx-2 mb-2 flex flex-col rounded-[10px] bg-bg-inset border border-border-secondary px-2.5 py-2 min-h-[76px]">
                    <p className="line-clamp-2 text-[11px] md:text-xs leading-relaxed text-text-primary">
                      {char.latestComment}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-1">
                      {char.latestCommentAuthor && (
                        <span className="text-[10px] md:text-xs text-text-muted">
                          — {char.latestCommentAuthor}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 text-[10px] md:text-xs text-thumbs-up">
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
                        </svg>
                        {char.latestCommentThumbsUp}
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 他のランキングもチェック */}
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
    </div>
  );
}
