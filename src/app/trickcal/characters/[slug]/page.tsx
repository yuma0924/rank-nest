import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCharacterBySlugCached,
  getItemsByIdsCached,
  getRelatedCharactersCached,
} from "@/lib/trickcal/cached-queries";
import { CharacterDetailClient } from "./character-detail-client";
import { JsonLd } from "@/components/seo/json-ld";
import type { Element } from "@/lib/trickcal/constants";
import type { Item } from "@/types/trickcal";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

const getCharacter = getCharacterBySlugCached;

// キャラは admin が追加する時しか増えないので、ビルド時に全件 pre-render して
// 初回訪問も即時配信。ビルド後に追加されたキャラは on-demand ISR で生成される。
export async function generateStaticParams() {
  const supabase = (await import("@/lib/supabase/admin")).createAdminClient();
  const { data } = await supabase
    .from("characters")
    .select("slug")
    .eq("is_hidden", false);
  return (data ?? []).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const character = await getCharacter(slug);

  if (!character) {
    return { title: "キャラクター | みんなで決めるトリッカルランキング" };
  }

  return {
    title: `${character.name} | みんなで決めるトリッカルランキング`,
    description: `${character.name}の性能・評価・みんなのコメント`,
    alternates: {
      canonical: `/trickcal/characters/${slug}`,
    },
    openGraph: {
      images: character.image_url ? [{ url: character.image_url }] : undefined,
    },
  };
}

export interface RelicInfo {
  name: string;
  imageUrl: string | null;
  description: string;
  params: string;
}

export interface ItemInfo {
  name: string;
  imageUrl: string | null;
}

export interface CharacterDetail {
  id: string;
  slug: string;
  name: string;
  rarity: string | null;
  element: Element | null;
  role: string | null;
  race: string | null;
  position: string | null;
  attackType: string | null;
  stats: Record<string, number | null>;
  skills: unknown;
  metadata: unknown;
  imageUrl: string | null;
  avgRating: number | null;
  validVotesCount: number;
  boardCommentsCount: number;
  rank: number | null;
  relic: RelicInfo | null;
  favoriteItem: ItemInfo | null;
  partTimeRewards: ItemInfo[];
}

export interface RelatedCharacter {
  id: string;
  slug: string;
  name: string;
  element: Element | null;
  imageUrl: string | null;
  avgRating: number | null;
  validVotesCount: number;
}

export default async function CharacterPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const character = await getCharacter(slug);

  if (!character) {
    notFound();
  }

  // character に依存する全クエリを並列
  const [rankingResult, rewardsResult, commentsResult, relatedCharsWithRanking] =
    await Promise.all([
      supabase
        .from("character_rankings")
        .select("avg_rating, valid_votes_count, board_comments_count, rank")
        .eq("character_id", character.id)
        .single(),
      supabase
        .from("character_rewards")
        .select("item_id, sort_order")
        .eq("character_id", character.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("comments")
        .select("id, character_id, user_hash, comment_type, rating, body, display_name, is_latest_vote, is_deleted, thumbs_up_count, thumbs_down_count, created_at")
        .eq("character_id", character.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(21),
      getRelatedCharactersCached(character.id, character.element, character.rarity),
    ]);

  const ranking = rankingResult.data;
  const commentsData = (commentsResult.data ?? []).slice(0, 20);
  const hasMoreComments = (commentsResult.data ?? []).length > 20;

  // items のみキャッシュから取得
  const rewardItemIds = (rewardsResult.data ?? []).map((r) => r.item_id);
  const itemIdsToFetch: string[] = [];
  if (character.favorite_item_id) itemIdsToFetch.push(character.favorite_item_id);
  for (const id of rewardItemIds) if (!itemIdsToFetch.includes(id)) itemIdsToFetch.push(id);

  const fetchedItems = await getItemsByIdsCached(itemIdsToFetch);

  const itemMap = new Map(fetchedItems.map((i) => [i.id, i]));
  const favItem = character.favorite_item_id
    ? (itemMap.get(character.favorite_item_id) ?? null)
    : null;
  const rewardItems: Item[] = rewardItemIds
    .map((id) => itemMap.get(id))
    .filter(Boolean) as Item[];

  const relatedCharacters: RelatedCharacter[] = relatedCharsWithRanking.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    element: c.element as Element | null,
    imageUrl: c.image_url,
    avgRating: c.avg_rating,
    validVotesCount: c.valid_votes_count,
  }));

  const rawStats = (character.stats as Record<string, unknown>) ?? {};
  const stats: Record<string, number | null> = {};
  for (const [key, val] of Object.entries(rawStats)) {
    stats[key] = typeof val === "number" ? val : null;
  }

  // 遺物情報を metadata から取得
  const metaObj = (character.metadata as Record<string, unknown>) ?? {};
  const relicRaw = metaObj.relic as { name?: string; image_url?: string | null; description?: string; params?: string } | undefined;
  const relic: RelicInfo | null = relicRaw?.name
    ? { name: relicRaw.name, imageUrl: relicRaw.image_url ?? null, description: relicRaw.description ?? "", params: relicRaw.params ?? "" }
    : null;

  const characterDetail: CharacterDetail = {
    id: character.id,
    slug: character.slug,
    name: character.name,
    rarity: character.rarity,
    element: character.element as Element | null,
    role: character.role,
    race: character.race,
    position: character.position,
    attackType: character.attack_type,
    stats,
    skills: character.skills,
    metadata: character.metadata,
    imageUrl: character.image_url,
    avgRating: ranking?.avg_rating ?? null,
    validVotesCount: ranking?.valid_votes_count ?? 0,
    boardCommentsCount: ranking?.board_comments_count ?? 0,
    rank: ranking?.rank ?? null,
    relic,
    favoriteItem: favItem ? { name: favItem.name, imageUrl: favItem.image_url } : null,
    partTimeRewards: rewardItems.map((i) => ({ name: i.name, imageUrl: i.image_url })),
  };

  const canonicalUrl = `https://rank-nest.com/trickcal/characters/${slug}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "rank-nest", item: "https://rank-nest.com" },
      {
        "@type": "ListItem",
        position: 2,
        name: "みんなで決めるトリッカルランキング",
        item: "https://rank-nest.com/trickcal",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "キャラクター",
        item: "https://rank-nest.com/trickcal/ranking",
      },
      {
        "@type": "ListItem",
        position: 4,
        name: character.name,
        item: canonicalUrl,
      },
    ],
  };

  // ランキングに乗っている（有効票 ≥ 4）キャラのみ AggregateRating を含める
  const hasRating =
    characterDetail.rank !== null &&
    characterDetail.avgRating !== null &&
    characterDetail.validVotesCount >= 4;

  const characterSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoGameCharacter",
    name: character.name,
    url: canonicalUrl,
    image: character.image_url ?? undefined,
    description: `トリッカル・もちもちほっぺ大作戦のキャラクター「${character.name}」の評価・スキル・コメントをまとめたページ。`,
    inGame: {
      "@type": "VideoGame",
      name: "トリッカル・もちもちほっぺ大作戦",
    },
  };
  if (hasRating) {
    characterSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: characterDetail.avgRating,
      ratingCount: characterDetail.validVotesCount,
      reviewCount: characterDetail.boardCommentsCount + characterDetail.validVotesCount,
      bestRating: 5,
      worstRating: 0.5,
    };
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={characterSchema} />
      <CharacterDetailClient
        character={characterDetail}
        relatedCharacters={relatedCharacters}
        initialComments={{
          comments: commentsData.map((c) => ({
            ...c,
            user_reaction: null,
          })),
          hasMore: hasMoreComments,
          nextCursor: hasMoreComments ? commentsData[commentsData.length - 1]?.id ?? null : null,
        }}
      />
    </>
  );
}
