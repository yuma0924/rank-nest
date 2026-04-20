import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserHashFromCookies } from "@/app/api/_helpers";
import {
  getAllVisibleCharacters,
  getTierByIdCached,
} from "@/lib/trickcal/cached-queries";
import { notFound } from "next/navigation";
import { TierDetailClient } from "./tier-detail-client";

export const dynamic = "force-dynamic";

type CharacterInfo = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  image_url: string | null;
};

const getTier = getTierByIdCached;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tier = await getTier(id);

  if (!tier) {
    return {
      title: "ティアが見つかりません | みんなで決めるトリッカルランキング",
    };
  }

  const title = tier.title || "無題のティア";
  return {
    title: `${title} | みんなのティア表 | みんなで決めるトリッカルランキング`,
    description: `トリッカルのティア表「${title}」を見る`,
    alternates: {
      canonical: `/trickcal/tiers/${id}`,
    },
  };
}

export default async function TierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Wave 1: tier + userHash + 全キャラ（キャッシュ）を全て並列開始
  const [tier, userHash, allChars] = await Promise.all([
    getTier(id),
    getUserHashFromCookies(),
    getAllVisibleCharacters(),
  ]);

  if (!tier) {
    notFound();
  }

  if (tier.is_deleted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-text-secondary">このティアは削除されました</p>
      </div>
    );
  }

  // Wave 2: tier 確定後、コメントと user_liked を並列取得
  const [commentsResult, userLikedResult] = await Promise.all([
    supabase
      .from("tier_comments")
      .select("id, tier_id, display_name, body, thumbs_up_count, thumbs_down_count, created_at, is_deleted")
      .eq("tier_id", id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(21),
    userHash
      ? supabase
          .from("tier_reactions")
          .select("id")
          .eq("tier_id", id)
          .eq("user_hash", userHash)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const commentsRaw = commentsResult.data;
  const commentsData = (commentsRaw ?? []).slice(0, 20);
  const hasMoreComments = (commentsRaw ?? []).length > 20;

  // Wave 3: user_comment_reactions を取得（コメントIDs が必要なので別ウェーブ）
  const userCommentReactionsArr: { tier_comment_id: string; reaction_type: "up" | "down" }[] =
    userHash && commentsData.length > 0
      ? await supabase
          .from("tier_comment_reactions")
          .select("tier_comment_id, reaction_type")
          .eq("user_hash", userHash)
          .in("tier_comment_id", commentsData.map((c) => c.id))
          .then((r) => (r.data ?? []) as { tier_comment_id: string; reaction_type: "up" | "down" }[])
      : [];

  const userCommentReactions = new Map(
    userCommentReactionsArr.map((r) => [r.tier_comment_id, r.reaction_type])
  );

  // ティアに含まれるキャラだけをキャッシュ結果から抽出
  const allCharIds = new Set(Object.values(tier.data).flat());
  const characters: Record<string, CharacterInfo> = {};
  for (const c of allChars) {
    if (allCharIds.has(c.id)) {
      characters[c.id] = {
        id: c.id,
        name: c.name,
        slug: c.slug,
        element: c.element,
        image_url: c.image_url,
      };
    }
  }

  const initialUserLiked = !!userLikedResult.data;
  const initialIsOwner = !!userHash && tier.user_hash === userHash;

  return (
    <TierDetailClient
      tier={{
        id: tier.id,
        title: tier.title,
        display_name: tier.display_name,
        description: tier.description,
        data: tier.data,
        likes_count: tier.likes_count,
        created_at: tier.created_at,
      }}
      characters={characters}
      initialUserLiked={initialUserLiked}
      initialIsOwner={initialIsOwner}
      initialComments={{
        comments: commentsData.map((c) => ({
          id: c.id,
          tier_id: c.tier_id,
          display_name: c.display_name,
          body: c.body,
          thumbs_up_count: c.thumbs_up_count,
          thumbs_down_count: c.thumbs_down_count,
          created_at: c.created_at,
          user_reaction: userCommentReactions.get(c.id) ?? null,
        })),
        hasMore: hasMoreComments,
      }}
    />
  );
}
