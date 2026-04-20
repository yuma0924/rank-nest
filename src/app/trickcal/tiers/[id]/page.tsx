import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAllVisibleCharacters,
  getTierByIdCached,
} from "@/lib/trickcal/cached-queries";
import { notFound } from "next/navigation";
import { TierDetailClient } from "./tier-detail-client";

export const revalidate = 60;

type CharacterInfo = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  image_url: string | null;
};

const getTier = getTierByIdCached;

// ISR: ビルド時に何も pre-render しないがオンデマンドで ISR を有効化
export function generateStaticParams() {
  return [];
}

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

  const [tier, allChars] = await Promise.all([
    getTier(id),
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

  const { data: commentsRaw } = await supabase
    .from("tier_comments")
    .select("id, tier_id, display_name, body, thumbs_up_count, thumbs_down_count, created_at, is_deleted")
    .eq("tier_id", id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(21);

  const commentsData = (commentsRaw ?? []).slice(0, 20);
  const hasMoreComments = (commentsRaw ?? []).length > 20;

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
      initialUserLiked={false}
      initialIsOwner={false}
      initialComments={{
        comments: commentsData.map((c) => ({
          id: c.id,
          tier_id: c.tier_id,
          display_name: c.display_name,
          body: c.body,
          thumbs_up_count: c.thumbs_up_count,
          thumbs_down_count: c.thumbs_down_count,
          created_at: c.created_at,
          user_reaction: null,
        })),
        hasMore: hasMoreComments,
      }}
    />
  );
}
