import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { RewardsClient } from "./rewards-client";
import { JsonLd } from "@/components/seo/json-ld";
import type { Element } from "@/lib/trickcal/constants";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "アルバイト報酬から探す | みんなで決めるトリッカルランキング",
  description:
    "トリッカルの各アルバイト報酬アイテムを獲得できるキャラクターを一覧表示。欲しい素材からキャラを逆引きできます。",
  alternates: {
    canonical: "/trickcal/rewards",
  },
};

export interface RewardCharacter {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  element: Element | null;
  // そのキャラにとってこの報酬が sort_order=0 の優先報酬か
  isPriority: boolean;
}

export interface RewardItem {
  id: string;
  name: string;
  imageUrl: string | null;
  characters: RewardCharacter[];
}

export default async function RewardsPage() {
  const supabase = createAdminClient();

  const [itemsResult, rewardsResult] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, image_url")
      .eq("item_type", "reward")
      .order("name", { ascending: true }),
    supabase
      .from("character_rewards")
      .select(
        "item_id, sort_order, character:characters!inner(id, slug, name, image_url, element, is_hidden)"
      )
      .eq("characters.is_hidden", false)
      .order("sort_order", { ascending: true }),
  ]);

  type RewardRow = {
    item_id: string;
    sort_order: number | null;
    character: {
      id: string;
      slug: string;
      name: string;
      image_url: string | null;
      element: string | null;
    } | null;
  };

  const charsByItemId = new Map<string, RewardCharacter[]>();
  for (const row of (rewardsResult.data ?? []) as RewardRow[]) {
    if (!row.character) continue;
    const list = charsByItemId.get(row.item_id) ?? [];
    if (list.some((c) => c.id === row.character!.id)) continue;
    list.push({
      id: row.character.id,
      slug: row.character.slug,
      name: row.character.name,
      imageUrl: row.character.image_url,
      element: row.character.element as Element | null,
      isPriority: row.sort_order === 0,
    });
    charsByItemId.set(row.item_id, list);
  }

  // 優先キャラを先頭に並べる
  for (const list of charsByItemId.values()) {
    list.sort((a, b) => {
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
      return 0;
    });
  }

  const items: RewardItem[] = (itemsResult.data ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    imageUrl: i.image_url,
    characters: charsByItemId.get(i.id) ?? [],
  }));

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
        name: "アルバイト報酬から探す",
        item: "https://rank-nest.com/trickcal/rewards",
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <RewardsClient items={items} />
    </>
  );
}
