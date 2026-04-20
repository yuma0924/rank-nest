import type { Metadata } from "next";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserHashFromCookies } from "@/app/api/_helpers";
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

type TierData = {
  id: string;
  title: string | null;
  display_name: string | null;
  description: string | null;
  data: Record<string, string[]>;
  likes_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_hash: string;
};

const getTier = cache(async (id: string) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tiers")
    .select("*")
    .eq("id", id)
    .single();
  return data as TierData | null;
});

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

  const tier = await getTier(id);

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

  // ティアに含まれる全キャラクター情報を取得
  const allCharIds = Object.values(tier.data).flat();
  let characters: Record<string, CharacterInfo> = {};

  if (allCharIds.length > 0) {
    const { data: chars } = await supabase
      .from("characters")
      .select("id, name, slug, element, image_url")
      .in("id", allCharIds);

    if (chars) {
      characters = Object.fromEntries(
        (chars as CharacterInfo[]).map((c) => [c.id, c])
      );
    }
  }

  // コメント + ユーザー固有状態を並列取得
  const userHash = await getUserHashFromCookies();

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

  // 各コメントに対するユーザーのリアクションを取得
  let userCommentReactions = new Map<string, "up" | "down">();
  if (userHash && commentsData.length > 0) {
    const { data: reactions } = await supabase
      .from("tier_comment_reactions")
      .select("tier_comment_id, reaction_type")
      .eq("user_hash", userHash)
      .in("tier_comment_id", commentsData.map((c) => c.id));
    if (reactions) {
      userCommentReactions = new Map(
        (reactions as { tier_comment_id: string; reaction_type: "up" | "down" }[]).map(
          (r) => [r.tier_comment_id, r.reaction_type]
        )
      );
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
