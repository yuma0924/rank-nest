import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StaticIcon } from "@/components/ui/static-icon";
import { createAdminClient } from "@/lib/supabase/admin";
import { StarRatingDisplay } from "@/components/ui/star-rating";
import { CharacterCard } from "@/components/trickcal/character/character-card";
import type { Element } from "@/lib/trickcal/constants";
import { ROLE_ICON_MAP, POSITION_ICON_MAP, ATTACK_TYPE_ICON_MAP } from "@/lib/trickcal/constants";
import { HomeSearchSection } from "./home-search-section";
import { HomeBuildsSection } from "./home-builds-section";
import { getRewardItemsCached } from "@/lib/trickcal/cached-queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "みんなで決めるトリッカルランキング - キャラ評価・編成・ティア表",
  description:
    "トリッカル・もちもちほっぺ大作戦の非公式ファンサイト。全キャラの性能・評価・スキル、人気編成、みんなのティア表を、みんなの投票で共有できます。",
  alternates: {
    canonical: "/trickcal",
  },
  openGraph: {
    title: "みんなで決めるトリッカルランキング",
    description:
      "トリッカルの全キャラ評価・人気編成・ティア表を、みんなの投票で共有できる非公式ファンサイト。",
    url: "https://rank-nest.com/trickcal",
  },
};

interface RankedChar {
  id: string;
  slug: string;
  name: string;
  element: Element | null;
  role: string | null;
  position: string | null;
  attackType: string | null;
  race: string | null;
  rarity: string | null;
  imageUrl: string | null;
  avgRating: number;
  validVotesCount: number;
  boardCommentsCount: number;
  rank: number;
  featuredComment: string | null;
  featuredCommentAuthor: string | null;
  featuredCommentThumbsUp: number;
}

const ELEMENT_ICON_MAP: Record<string, string> = {
  純粋: "/icons/pure.png",
  冷静: "/icons/calm.png",
  狂気: "/icons/madness.png",
  活発: "/icons/lively.png",
  憂鬱: "/icons/melancholy.png",
};


interface TrendingChar {
  id: string;
  slug: string;
  name: string;
  element: Element | null;
  imageUrl: string | null;
  commentCount: number;
  avgRating: number | null;
  validVotesCount: number;
  latestComment: string | null;
  latestCommentAuthor: string | null;
  latestCommentThumbsUp: number;
}

/* ===== セクション見出し共通 ===== */
function SectionHeading({
  icon,
  title,
  subtitle,
  href,
  linkLabel,
  gradientFrom,
  gradientTo,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  gradientFrom: string;
  gradientTo: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px]"
            style={{ backgroundImage: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
          >
            {icon}
          </span>
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        </div>
        {href && linkLabel && (
          <Link
            href={href}
            className="flex shrink-0 items-center gap-0.5 text-sm md:text-base text-accent-muted transition-colors hover:text-accent cursor-pointer"
          >
            {linkLabel}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
      {subtitle && (
        <p className="mt-1.5 pl-2.5 text-xs md:text-sm text-text-muted">{subtitle}</p>
      )}
    </div>
  );
}

/* ===== アルバイト報酬から探すバナー ===== */
function RewardsBanner({
  imageUrl,
  className = "",
  compact = false,
}: {
  imageUrl: string | null;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/trickcal/rewards"
      className={`group items-center rounded-2xl border border-border-primary bg-bg-card transition-colors hover:bg-bg-card-hover ${compact ? "gap-2.5 p-2.5" : "gap-3 p-4"} ${className}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          className={`shrink-0 ${compact ? "h-9 w-9 rounded-[10px]" : "h-12 w-12 rounded-[14px]"}`}
        />
      ) : (
        <span
          className={`shrink-0 bg-bg-card-hover ${compact ? "h-9 w-9 rounded-[10px]" : "h-12 w-12 rounded-[14px]"}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <h2 className={`font-bold text-text-primary ${compact ? "text-sm leading-tight" : "text-base"}`}>
          アルバイト報酬から探す
        </h2>
        <p className={`text-text-tertiary ${compact ? "mt-0.5 text-[10px] leading-tight" : "mt-0.5 text-xs"}`}>
          素材を獲得できるキャラを確認
        </p>
      </div>
      <svg
        className={`shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 ${compact ? "h-4 w-4" : "h-5 w-5"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

/* ===== セクション末尾ワイドボタン ===== */
function SectionFooterButton({
  href,
  label,
  gradientFrom,
  gradientTo,
}: {
  href: string;
  label: string;
  gradientFrom: string;
  gradientTo: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-center gap-1 rounded-2xl py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90 cursor-pointer lg:max-w-sm lg:mx-auto"
      style={{
        backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
      }}
    >
      {label}
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

/* ===== アイコン ===== */
function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
    </svg>
  );
}

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
    </svg>
  );
}


export default async function Home() {
  const supabase = createAdminClient();
  const rewardItemsPromise = getRewardItemsCached();

  // --- 依存関係のないクエリを全て Wave1 で並列発火 ---
  // (rankings, characters, 全コメント, 人気ティア, 人気編成)
  // 以前は Wave2,4,5 が直列で 5 往復になっていた。iad1→Tokyo の
  // 片道レイテンシ ~100ms × 5 = 500ms 以上を短縮。
  const [
    { data: rankings },
    { data: characters },
    { data: allComments },
    { data: topTiers },
    { data: topBuilds },
  ] = await Promise.all([
    supabase
      .from("character_rankings")
      .select("character_id, avg_rating, valid_votes_count, board_comments_count, rank")
      .not("rank", "is", null)
      .gte("valid_votes_count", 1)
      .order("rank", { ascending: true })
      .limit(15),
    supabase
      .from("characters")
      .select("id, slug, name, element, role, position, attack_type, race, rarity, image_url")
      .eq("is_hidden", false),
    supabase
      .from("comments")
      .select("character_id, user_hash, body, display_name, thumbs_up_count, created_at")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("tiers")
      .select("id, title, display_name, data, likes_count, created_at")
      .eq("is_deleted", false)
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("builds")
      .select("id, mode, members, element_label, title, display_name, comment, likes_count, dislikes_count, updated_at, build_comments(count)")
      .eq("is_deleted", false)
      .order("likes_count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  const charMap = new Map<
    string,
    {
      slug: string;
      name: string;
      element: string | null;
      role: string | null;
      position: string | null;
      attackType: string | null;
      race: string | null;
      rarity: string | null;
      imageUrl: string | null;
    }
  >();
  if (characters) {
    for (const c of characters) {
      charMap.set(c.id, {
        slug: c.slug,
        name: c.name,
        element: c.element,
        role: c.role,
        position: c.position,
        attackType: c.attack_type,
        race: c.race,
        rarity: c.rarity,
        imageUrl: c.image_url,
      });
    }
  }

  // 注目コメント取得（各キャラの上位1件）
  const rankedCharIds = (rankings ?? []).map((r) => r.character_id);

  const { data: featuredComments } =
    rankedCharIds.length > 0
      ? await supabase
          .from("comments")
          .select("character_id, body, display_name, thumbs_up_count")
          .in("character_id", rankedCharIds)
          .eq("comment_type", "vote")
          .eq("is_latest_vote", true)
          .eq("is_deleted", false)
          .gte("rating", 3.0)
          .order("created_at", { ascending: false })
      : { data: [] };

  const featuredMap = new Map<string, { body: string; author: string; thumbsUp: number }>();
  if (featuredComments) {
    for (const fc of featuredComments) {
      if (!featuredMap.has(fc.character_id) && fc.body) {
        featuredMap.set(fc.character_id, {
          body: fc.body,
          author: fc.display_name || "名無し",
          thumbsUp: fc.thumbs_up_count ?? 0,
        });
      }
    }
  }

  // フォールバック
  const missingIds = rankedCharIds.filter((id) => !featuredMap.has(id));
  if (missingIds.length > 0) {
    const { data: fallbackComments } = await supabase
      .from("comments")
      .select("character_id, body, display_name, thumbs_up_count")
      .in("character_id", missingIds)
      .eq("is_deleted", false)
      .order("thumbs_up_count", { ascending: false })
      .order("created_at", { ascending: false });

    if (fallbackComments) {
      for (const fc of fallbackComments) {
        if (!featuredMap.has(fc.character_id) && fc.body) {
          featuredMap.set(fc.character_id, {
            body: fc.body,
            author: fc.display_name || "名無し",
            thumbsUp: fc.thumbs_up_count ?? 0,
          });
        }
      }
    }
  }

  const rankedCharacters: RankedChar[] = (rankings ?? [])
    .map((r) => {
      const char = charMap.get(r.character_id);
      if (!char || r.rank === null) return null;
      const featured = featuredMap.get(r.character_id);
      return {
        id: r.character_id,
        slug: char.slug,
        name: char.name,
        element: char.element as Element | null,
        role: char.role,
        position: char.position,
        attackType: char.attackType,
        race: char.race,
        rarity: char.rarity,
        imageUrl: char.imageUrl,
        avgRating: r.avg_rating,
        validVotesCount: r.valid_votes_count,
        boardCommentsCount: r.board_comments_count,
        rank: r.rank,
        featuredComment: featured?.body ?? null,
        featuredCommentAuthor: featured?.author ?? null,
        featuredCommentThumbsUp: featured?.thumbsUp ?? 0,
      };
    })
    .filter((c): c is RankedChar => c !== null);

  const topChar = rankedCharacters[0] ?? null;

  // --- 話題のキャラクター集計（直近7日優先）---
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentCountMap = new Map<string, number>();
  const totalCountMap = new Map<string, number>();
  const trendingCommentMap = new Map<
    string,
    { body: string; author: string; thumbsUp: number }
  >();

  if (allComments) {
    const userCharCountMap = new Map<string, number>();
    for (const rc of allComments) {
      const key = `${rc.character_id}:${rc.user_hash}`;
      const currentCount = userCharCountMap.get(key) ?? 0;
      userCharCountMap.set(key, currentCount + 1);

      if (currentCount < 3) {
        totalCountMap.set(
          rc.character_id,
          (totalCountMap.get(rc.character_id) ?? 0) + 1
        );
        if (rc.created_at >= sevenDaysAgo) {
          recentCountMap.set(
            rc.character_id,
            (recentCountMap.get(rc.character_id) ?? 0) + 1
          );
        }
      }

      if (!trendingCommentMap.has(rc.character_id) && rc.body) {
        trendingCommentMap.set(rc.character_id, {
          body: rc.body,
          author: rc.display_name || "名無し",
          thumbsUp: rc.thumbs_up_count ?? 0,
        });
      }
    }
  }

  const trendingEntries = Array.from(totalCountMap.entries())
    .sort((a, b) => {
      const recentA = recentCountMap.get(a[0]) ?? 0;
      const recentB = recentCountMap.get(b[0]) ?? 0;
      if (recentA !== recentB) return recentB - recentA;
      return b[1] - a[1];
    })
    .slice(0, 6);

  // ランキングマップ（話題キャラの評価表示用）
  const rankingMapForTrending = new Map<string, { avgRating: number; validVotesCount: number }>();
  if (rankings) {
    for (const r of rankings) {
      rankingMapForTrending.set(r.character_id, {
        avgRating: r.avg_rating,
        validVotesCount: r.valid_votes_count,
      });
    }
  }

  const trendingCharacters: TrendingChar[] = trendingEntries
    .map(([id, totalCount]) => {
      const char = charMap.get(id);
      if (!char) return null;
      const comment = trendingCommentMap.get(id);
      const rr = rankingMapForTrending.get(id);
      return {
        id,
        slug: char.slug,
        name: char.name,
        element: char.element as Element | null,
        imageUrl: char.imageUrl,
        commentCount: totalCount,
        avgRating: rr?.avgRating ?? null,
        validVotesCount: rr?.validVotesCount ?? 0,
        latestComment: comment?.body ?? null,
        latestCommentAuthor: comment?.author ?? null,
        latestCommentThumbsUp: comment?.thumbsUp ?? 0,
      };
    })
    .filter((c): c is TrendingChar => c !== null);

  // topTiers / topBuilds は Wave1 で取得済み
  type TierPreview = {
    id: string;
    title: string | null;
    displayName: string | null;
    data: Record<string, string[]>;
    likesCount: number;
    createdAt: string;
  };

  const tiersData: TierPreview[] = (topTiers ?? []).map((t) => ({
    id: t.id,
    title: t.title as string | null,
    displayName: t.display_name as string | null,
    data: t.data as Record<string, string[]>,
    likesCount: t.likes_count,
    createdAt: t.created_at,
  }));

  const searchCharacters = (characters ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    element: c.element,
    role: c.role,
    rarity: c.rarity,
    race: c.race,
    position: c.position,
    imageUrl: c.image_url,
  }));

  // 編成ランキング用データ変換
  const buildsData = (topBuilds ?? []).map((build) => {
    const memberIds = build.members as (string | null)[];
    const memberElements = memberIds
      .filter((id): id is string => id !== null)
      .map((mId) => charMap.get(mId)?.element)
      .filter((e): e is string => e !== null && e !== undefined);
    const commentCount = Array.isArray(build.build_comments) && build.build_comments.length > 0
      ? (build.build_comments[0] as { count: number }).count
      : 0;
    return {
      id: build.id,
      mode: build.mode,
      members: memberIds,
      elementLabel: build.element_label,
      title: build.title,
      displayName: build.display_name,
      comment: build.comment,
      likesCount: build.likes_count,
      dislikesCount: build.dislikes_count,
      commentCount,
      memberElements,
    };
  });

  const charMapPlain: Record<string, { name: string; element: string | null; imageUrl: string | null }> = {};
  charMap.forEach((v, k) => {
    charMapPlain[k] = { name: v.name, element: v.element, imageUrl: v.imageUrl };
  });

  const rewardItems = await rewardItemsPromise;
  const recycledPlastic = rewardItems.find((i) => i.name === "再生プラスチック");

  return (
    <div className="space-y-12 md:space-y-16">
      {/* ====== 第1段: 人気キャラランキング ====== */}
      <section>
        <SectionHeading
          icon={<CrownIcon className="h-5 w-5 text-white" />}
          title="人気キャラランキング"
          href="/trickcal/ranking"
          linkLabel="もっと見る"
          gradientFrom="#ffb900"
          gradientTo="#e87080"
        />

        {topChar && (
          <>
            <div className="mt-2 flex items-baseline pl-4 lg:justify-between">
              <div className="text-base lg:text-lg">
                <span className="text-text-tertiary">現在の総合1位は</span>
                <span className="ml-1 text-lg font-bold text-text-primary lg:text-xl">{topChar.name}</span>
                <span className="ml-1 inline-flex -translate-y-[2px] items-center gap-0.5 align-middle text-base lg:text-lg">
                  <svg className="h-4 w-4 text-star lg:h-5 lg:w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="-translate-y-px font-bold text-star">{topChar.avgRating.toFixed(1)}</span>
                </span>
              </div>
              <span className="hidden lg:inline text-xs md:text-sm text-text-muted">みんなの評価で算出 · 毎日 0:00 更新</span>
            </div>
            <p className="mt-1 pl-4 text-xs md:text-sm text-text-muted lg:hidden">みんなの評価で算出 · 毎日 0:00 更新</p>
          </>
        )}

        {rankedCharacters.length === 0 ? (
          <p className="mt-4 py-8 text-center text-sm text-text-tertiary">
            まだランキングデータがありません
          </p>
        ) : (
          <>
            {/* ヒーロー表示 (1-3位) */}
            <div className="mt-3 space-y-3">
              {rankedCharacters.slice(0, 3).map((char) => {
                const rank = char.rank as 1 | 2 | 3;

                // 順位ごとのカラー設定（トロフィーアイコン統一、色のみ変化）
                const trophyPath = (
                  <path d="M5 4h14v2h2v3.5a4.5 4.5 0 0 1-4.5 4.5h-.3a6 6 0 0 1-3.2 3.2V18h3v2H8v-2h3v-.8a6 6 0 0 1-3.2-3.2H7.5A4.5 4.5 0 0 1 3 9.5V6h2V4zm0 4v1.5A2.5 2.5 0 0 0 7.5 12V8H5zm12 0v4a2.5 2.5 0 0 0 2.5-2.5V8H17z" fill="currentColor" />
                );
                const rankConfig = {
                  1: {
                    borderColor: "#d4a017",
                    bannerBg: "rgba(255,185,0,0.15)",
                    rankText: "var(--star)",
                    badge: (
                      <svg className="h-7 w-7 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" style={{ color: "#eab308" }} viewBox="0 0 24 24" fill="none">
                        {trophyPath}
                      </svg>
                    ),
                  },
                  2: {
                    borderColor: "#9ca3af",
                    bannerBg: "rgba(144,161,185,0.1)",
                    rankText: "var(--rank-silver)",
                    badge: (
                      <svg className="h-7 w-7 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" style={{ color: "#94a3b8" }} viewBox="0 0 24 24" fill="none">
                        {trophyPath}
                      </svg>
                    ),
                  },
                  3: {
                    borderColor: "#b45309",
                    bannerBg: "rgba(225,113,0,0.1)",
                    rankText: "#fe9a00",
                    badge: (
                      <svg className="h-7 w-7 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" style={{ color: "#c2410c" }} viewBox="0 0 24 24" fill="none">
                        {trophyPath}
                      </svg>
                    ),
                  },
                } as const;

                const cfg = rankConfig[rank];

                return (
                  <Link
                    key={char.id}
                    href={`/trickcal/characters/${char.slug}`}
                    className="block overflow-clip rounded-[16px] bg-bg-card-alpha-heavy transition-colors hover:brightness-110 cursor-pointer"
                    style={{
                      border: `1.5px solid ${cfg.borderColor}`,
                    }}
                  >
                    {/* 順位バナー */}
                    <div
                      className="flex h-[38px] items-center gap-1.5 pl-3.5"
                      style={{ backgroundColor: cfg.bannerBg }}
                    >
                      {cfg.badge}
                      <span
                        className="text-sm md:text-base font-bold"
                        style={{ color: cfg.rankText }}
                      >
                        {rank}位
                      </span>
                    </div>

                    <div className="lg:flex">
                      {/* キャラ情報 */}
                      <div className="flex gap-3 px-3.5 py-2.5 lg:flex-1 lg:min-w-0 lg:py-4 lg:px-4 lg:gap-4">
                        {/* キャラ画像 */}
                        <div className="h-20 w-20 shrink-0 overflow-hidden lg:h-24 lg:w-24">
                          {char.imageUrl ? (
                            <Image
                              src={char.imageUrl}
                              alt={char.name}
                              width={96}
                              height={96}
                              sizes="(max-width: 1024px) 80px, 96px"
                              loading="eager"
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-bg-tertiary text-lg text-text-muted">
                              {char.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* 名前・ロール・評価 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-base font-bold text-text-primary lg:text-lg">
                              {char.name}
                            </p>
                            {char.element && ELEMENT_ICON_MAP[char.element] && (
                              <StaticIcon src={ELEMENT_ICON_MAP[char.element]} alt={char.element} width={16} height={16} className="shrink-0 lg:h-5 lg:w-5" />
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1 lg:mt-1.5">
                            {char.role && ROLE_ICON_MAP[char.role] && (
                              <span className="flex items-center gap-0.5 rounded-[4px] bg-bg-tertiary px-1.5 py-0.5 text-[11px] md:text-xs text-text-tertiary">
                                <StaticIcon src={ROLE_ICON_MAP[char.role]} alt={char.role} width={13} height={13} />
                                {char.role}
                              </span>
                            )}
                            {char.position && POSITION_ICON_MAP[char.position] && (
                              <span className="flex items-center gap-0.5 rounded-[4px] bg-bg-tertiary px-1.5 py-0.5 text-[11px] md:text-xs text-text-tertiary">
                                <StaticIcon src={POSITION_ICON_MAP[char.position]} alt={char.position} width={13} height={13} />
                                {char.position}
                              </span>
                            )}
                            {char.attackType && ATTACK_TYPE_ICON_MAP[char.attackType] && (
                              <span className="flex items-center gap-0.5 rounded-[4px] bg-bg-tertiary px-1.5 py-0.5 text-[11px] md:text-xs text-text-tertiary">
                                <StaticIcon src={ATTACK_TYPE_ICON_MAP[char.attackType]} alt={char.attackType} width={13} height={13} />
                                {char.attackType}
                              </span>
                            )}
                            {char.race && (
                              <span className="rounded-[4px] bg-bg-tertiary px-1.5 py-0.5 text-[11px] md:text-xs text-text-tertiary">
                                {char.race}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1 lg:mt-2">
                            {/* 評価ピル */}
                            <span className="inline-flex items-center gap-1 rounded-full bg-bg-tertiary py-0.5 pl-1.5 pr-2 lg:py-1 lg:pl-2 lg:pr-2.5">
                              <span className="lg:hidden">
                                <StarRatingDisplay rating={char.avgRating} size="sm" showValue />
                              </span>
                              <span className="hidden lg:inline-flex">
                                <StarRatingDisplay rating={char.avgRating} size="md" showValue />
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 注目コメント */}
                      {char.featuredComment && (
                        <div className="mx-2.5 mb-2.5 lg:mb-0 lg:flex-1 lg:min-w-0 lg:self-start lg:pt-2.5">
                          <p className="mb-1 flex items-center gap-1 px-0.5 text-[10px] md:text-xs font-bold text-[#38bdf8]">
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                            </svg>
                            注目コメント
                          </p>
                          <div className="rounded-[10px] border border-border-primary bg-bg-inset px-3 py-3 min-h-[72px] flex flex-col lg:min-h-[88px]">
                            <p className="line-clamp-2 whitespace-pre-wrap text-xs md:text-sm leading-relaxed text-text-primary lg:line-clamp-4">
                              {char.featuredComment}
                            </p>
                            <div className="mt-auto flex items-center justify-between pt-1">
                              {char.featuredCommentAuthor && (
                                <span className="text-[10px] md:text-xs text-text-muted">
                                  — {char.featuredCommentAuthor}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-0.5 text-[10px] md:text-xs text-thumbs-up">
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
                                </svg>
                                {char.featuredCommentThumbsUp}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 4位以降: グリッド表示 (4列) */}
            <div className="mt-6 grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {rankedCharacters.slice(3).map((char) => (
                <CharacterCard
                  key={char.id}
                  slug={char.slug}
                  name={char.name}
                  imageUrl={char.imageUrl}
                  avgRating={char.avgRating}
                  rank={char.rank}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-6">
          <SectionFooterButton
            href="/trickcal/ranking"
            label="キャラランキングをすべて見る"
            gradientFrom="#e05aa8"
            gradientTo="#f08a9a"
          />
        </div>
      </section>

      {/* ====== みんなのティア表 ====== */}
      <section className="space-y-4">
        <SectionHeading
          icon={
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <rect x="0" y="0.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="0.5" width="12" height="3" rx="0.5" fill="white" />
              <rect x="0" y="4.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="4.5" width="9" height="3" rx="0.5" fill="white" />
              <rect x="0" y="8.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="8.5" width="6" height="3" rx="0.5" fill="white" />
              <rect x="0" y="12.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="12.5" width="4" height="3" rx="0.5" fill="white" />
            </svg>
          }
          title="みんなのティア表"
          subtitle="キャラクターをランク付けして共有しよう"
          href="/trickcal/tiers"
          linkLabel="もっと見る"
          gradientFrom="#9048d4"
          gradientTo="#d4408a"
        />

        {tiersData.length > 0 ? (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {tiersData.map((tier) => {
              const tierLabels = ["S", "A", "B", "C"] as const;
              return (
                <Link
                  key={tier.id}
                  href={`/trickcal/tiers/${tier.id}`}
                  className="block rounded-2xl border border-border-primary bg-gradient-to-b from-bg-card-alpha to-bg-card-alpha-lighter p-4 transition-colors hover:from-bg-card-alpha hover:to-bg-card-alpha-light cursor-pointer"
                >
                  {/* タイトル + 投稿者 */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-bold text-text-primary">
                      {tier.title || "無題のティア"}
                    </span>
                    {tier.displayName && (
                      <span className="shrink-0 text-[10px] md:text-xs text-text-muted">
                        by {tier.displayName}
                      </span>
                    )}
                  </div>

                  {/* ティアプレビュー（S〜C） */}
                  <div className="relative mb-2">
                    <div className="overflow-hidden rounded-lg border border-border-primary">
                      {tierLabels.map((label) => {
                        const charIds = tier.data[label] ?? [];
                        const isEmpty = charIds.length === 0 && label !== "S";
                        const colors: Record<string, string> = {
                          S: "#ef4444", A: "#f97316", B: "#eab308", C: "#22c55e",
                        };
                        return (
                          <div
                            key={label}
                            className={`flex border-b border-border-primary last:border-b-0${isEmpty ? " hidden md:flex" : ""}`}
                          >
                            <div
                              className="flex w-8 shrink-0 items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: colors[label] }}
                            >
                              {label}
                            </div>
                            <div className="flex min-h-[36px] flex-1 flex-wrap items-center gap-0.5 px-1 py-0.5">
                              {charIds.slice(0, 8).map((charId) => {
                                const char = charMap.get(charId);
                                if (!char) return null;
                                return (
                                  <div key={charId} className="h-8 w-8 shrink-0 overflow-hidden rounded bg-bg-tertiary">
                                    {char.imageUrl ? (
                                      <Image
                                        src={char.imageUrl}
                                        alt={char.name}
                                        width={64}
                                        height={64}
                                        sizes="32px"
                                        className="pointer-events-none h-full w-full object-cover"
                                        loading="eager"
                              unoptimized
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-bg-tertiary text-[10px] text-text-muted">
                                        {char.name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {charIds.length > 8 && (
                                <span className="text-[10px] text-text-muted">+{charIds.length - 8}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-b-lg bg-gradient-to-t from-bg-card-alpha-heavy to-transparent" />
                  </div>
                  <p className="mb-1 text-center text-[10px] md:text-xs text-text-muted">このティア表を見る ▼</p>

                  {/* フッター */}
                  <div className="flex items-center justify-between text-[10px] md:text-xs text-text-muted">
                    <span>{Object.values(tier.data).flat().length}キャラ配置</span>
                    <span className="inline-flex items-center gap-0.5 text-thumbs-up">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
                      </svg>
                      {tier.likesCount}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border-primary bg-gradient-to-b from-bg-card-alpha to-bg-card-alpha-lighter py-8 text-center">
            <p className="text-sm text-text-muted">まだティアが投稿されていません</p>
            <Link
              href="/trickcal/tiers/new"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#e05aa8] to-[#e87080] px-5 py-2.5 text-sm font-bold text-white shadow-[0px_10px_15px_0px_rgba(224,90,168,0.12),0px_4px_6px_0px_rgba(224,90,168,0.12)] transition-opacity hover:opacity-90"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              最初のティアを作成する
            </Link>
          </div>
        )}

        <div className="mt-6">
        <SectionFooterButton
          href="/trickcal/tiers"
          label="みんなのティア表を見る"
          gradientFrom="#9048d4"
          gradientTo="#d4408a"
        />
        </div>
      </section>

      {/* ====== 第2段: キャラクターを探す ====== */}
      <section className="space-y-4">
        <div className="lg:flex lg:items-start lg:justify-between lg:gap-4">
          <SectionHeading
            icon={
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            title="キャラクターを探す"
            subtitle="性格・タイプ・種族などで絞り込み"
            gradientFrom="#8b5cf6"
            gradientTo="#a78bfa"
          />
          {/* PC: 見出し右にバナー */}
          <RewardsBanner
            imageUrl={recycledPlastic?.image_url ?? null}
            compact
            className="hidden lg:flex lg:w-[300px] lg:shrink-0"
          />
        </div>

        <HomeSearchSection characters={searchCharacters} />

        {/* モバイル: 検索結果の直下にバナー */}
        <RewardsBanner
          imageUrl={recycledPlastic?.image_url ?? null}
          className="flex lg:hidden"
        />
      </section>

      {/* ====== 第3段: 注目キャラクター ====== */}
      {trendingCharacters.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
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
            {trendingCharacters.map((char) => {
              return (
                <Link
                  key={char.id}
                  href={`/trickcal/characters/${char.slug}`}
                  className="flex flex-col overflow-hidden rounded-[14px] border border-border-primary bg-bg-card-alpha-light transition-colors hover:bg-bg-card-alpha cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 p-2.5">
                    {/* キャラアイコン */}
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
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-bg-tertiary text-sm text-text-muted">
                          {char.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* 情報 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm md:text-base font-bold text-text-primary">
                          {char.name}
                        </p>
                        {char.element && ELEMENT_ICON_MAP[char.element] && (
                          <StaticIcon src={ELEMENT_ICON_MAP[char.element]} alt={char.element} width={16} height={16} className="shrink-0" />
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {char.avgRating !== null && char.validVotesCount >= 1 ? (
                          <span className="text-sm md:text-base font-bold text-star">
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
                  {/* コメントブロック */}
                  {char.latestComment && (
                    <div className="mx-2 mb-2 flex flex-1 flex-col rounded-[10px] bg-bg-inset border border-border-secondary px-2.5 py-2 min-h-[76px]">
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
              );
            })}
          </div>
        </section>
      )}

      {/* ====== 第4段: 編成ランキング ====== */}
      <section className="space-y-4">
        <SectionHeading
          icon={<TeamIcon className="h-4 w-4 text-white" />}
          title="人気編成ランキング"
          subtitle="人気のパーティ編成をチェック・投稿しよう"
          href="/trickcal/builds"
          linkLabel="もっと見る"
          gradientFrom="#3b82f6"
          gradientTo="#06b6d4"
        />

        <HomeBuildsSection builds={buildsData} charMap={charMapPlain} />

        <div className="mt-6">
        <SectionFooterButton
          href="/trickcal/builds"
          label="人気編成ランキングをすべて見る"
          gradientFrom="#3b82f6"
          gradientTo="#06b6d4"
        />
        </div>
      </section>

    </div>
  );
}
