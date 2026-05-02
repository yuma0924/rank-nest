import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { RankingClient } from "./ranking-client";
import type { Element } from "@/lib/trickcal/constants";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "人気キャラランキング | みんなで決めるトリッカルランキング",
  description:
    "トリッカルの人気キャラランキング。みんなの投票と評価で順位が決まる",
  alternates: {
    canonical: "/trickcal/ranking",
  },
};

export interface RankedCharacter {
  id: string;
  slug: string;
  name: string;
  element: Element | null;
  imageUrl: string | null;
  avgRating: number;
  validVotesCount: number;
  boardCommentsCount: number;
  rank: number | null;
}

export interface UnrankedCharacter {
  id: string;
  slug: string;
  name: string;
  element: Element | null;
  imageUrl: string | null;
  avgRating: number;
  validVotesCount: number;
}

export interface TrendingCharacter {
  id: string;
  slug: string;
  name: string;
  element: Element | null;
  imageUrl: string | null;
  avgRating: number | null;
  validVotesCount: number;
  commentCount: number;
  latestComment: string | null;
  latestCommentAuthor: string | null;
  latestCommentThumbsUp: number;
}

export default async function RankingPage() {
  const supabase = createAdminClient();

  // ランキング + キャラ + 注目コメントを全て並列取得
  const [{ data: rankings }, { data: characters }, { data: recentComments }] =
    await Promise.all([
      supabase
        .from("character_rankings")
        .select("character_id, avg_rating, valid_votes_count, board_comments_count, rank")
        .order("rank", { ascending: true, nullsFirst: false }),
      supabase
        .from("characters")
        .select("id, slug, name, element, image_url")
        .eq("is_hidden", false),
      supabase
        .from("comments")
        .select("character_id, user_hash, body, display_name, thumbs_up_count")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  // キャラマップ
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

  // ランク付きキャラ（有効票1件以上）
  const rankedCharacters: RankedCharacter[] = [];
  // ランクなしキャラ（有効票0〜3件）
  const unrankedCharacters: UnrankedCharacter[] = [];

  if (rankings) {
    for (const r of rankings) {
      const char = charMap.get(r.character_id);
      if (!char) continue;

      if (r.rank !== null && r.valid_votes_count >= 1) {
        rankedCharacters.push({
          id: r.character_id,
          slug: char.slug,
          name: char.name,
          element: char.element as Element | null,
          imageUrl: char.imageUrl,
          avgRating: r.avg_rating,
          validVotesCount: r.valid_votes_count,
          boardCommentsCount: r.board_comments_count,
          rank: r.rank,
        });
      } else {
        unrankedCharacters.push({
          id: r.character_id,
          slug: char.slug,
          name: char.name,
          element: char.element as Element | null,
          imageUrl: char.imageUrl,
          avgRating: r.avg_rating,
          validVotesCount: r.valid_votes_count,
        });
      }
    }
  }

  // 未ランクのソート: 有効票数降順 -> 平均点降順
  unrankedCharacters.sort((a, b) => {
    if (b.validVotesCount !== a.validVotesCount)
      return b.validVotesCount - a.validVotesCount;
    return b.avgRating - a.avgRating;
  });

  // --- 注目のキャラクター集計 ---
  // recentComments は Wave1 で取得済み
  // 連投ガード: 1キャラにつき同一 user_hash は最大3件まで
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

  // ランキングマップ（話題キャラの評価情報用）
  const rankingLookup = new Map<string, { avgRating: number; validVotesCount: number }>();
  if (rankings) {
    for (const r of rankings) {
      rankingLookup.set(r.character_id, {
        avgRating: r.avg_rating,
        validVotesCount: r.valid_votes_count,
      });
    }
  }

  const trendingEntries = Array.from(trendingMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const trendingCharacters: TrendingCharacter[] = trendingEntries
    .map(([id, count]) => {
      const char = charMap.get(id);
      if (!char) return null;
      const rr = rankingLookup.get(id);
      return {
        id,
        slug: char.slug,
        name: char.name,
        element: char.element as Element | null,
        imageUrl: char.imageUrl,
        avgRating: rr?.avgRating ?? null,
        validVotesCount: rr?.validVotesCount ?? 0,
        commentCount: count,
        latestComment: trendingCommentMap.get(id)?.body ?? null,
        latestCommentAuthor: trendingCommentMap.get(id)?.author ?? null,
        latestCommentThumbsUp: trendingCommentMap.get(id)?.thumbsUp ?? 0,
      };
    })
    .filter((c): c is TrendingCharacter => c !== null);

  return (
    <div className="space-y-6">
      {/* ページタイトル */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px]"
              style={{ backgroundImage: "linear-gradient(135deg, #ffb900, #e87080)" }}
            >
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
              </svg>
            </span>
            <h1 className="text-lg font-bold text-text-primary">
              人気キャラランキング
            </h1>
          </div>
          <span className="rounded bg-bg-card-alpha-light border border-border-primary px-2 py-1 text-[10px] md:text-xs text-text-muted">
            集計：毎日0時
          </span>
        </div>
        <p className="mt-1 pl-[42px] text-xs md:text-sm text-text-muted">
          みんなの投票と評価で順位が決まる
        </p>
      </div>

      <RankingClient
        rankedCharacters={rankedCharacters}
        unrankedCharacters={unrankedCharacters}
        trendingCharacters={trendingCharacters}
      />

    </div>
  );
}
