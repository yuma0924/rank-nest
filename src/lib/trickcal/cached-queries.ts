import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Character, Item, Tier, Build } from "@/types/trickcal";

export type CharacterInfoCache = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  position: string | null;
  image_url: string | null;
  is_hidden: boolean;
};

/**
 * 全キャラクター（非表示除く）を5分キャッシュで取得。
 * 編成/ティア画面のメンバー表示などで繰り返し参照されるが、
 * キャラ情報自体は admin が手動追加する時しか変わらない。
 */
export const getAllVisibleCharacters = unstable_cache(
  async (): Promise<CharacterInfoCache[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("characters")
      .select("id, name, slug, element, position, image_url, is_hidden")
      .eq("is_hidden", false);
    return (data as CharacterInfoCache[] | null) ?? [];
  },
  ["trickcal-all-visible-characters"],
  { revalidate: 300, tags: ["characters"] }
);

/**
 * キャラクター詳細を slug で5分キャッシュ取得。
 * stats/skills/metadata 等のゲームデータは admin 更新時のみ変わる。
 */
export const getCharacterBySlugCached = unstable_cache(
  async (slug: string): Promise<Character | null> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("characters")
      .select(
        "id, slug, name, rarity, element, role, race, position, attack_type, stats, skills, metadata, image_url, favorite_item_id, is_hidden, created_at, updated_at"
      )
      .eq("slug", slug)
      .eq("is_hidden", false)
      .returns<Character[]>()
      .single();
    return data ?? null;
  },
  ["trickcal-character-by-slug"],
  { revalidate: 300, tags: ["characters"] }
);

/**
 * アイテム詳細を id で10分キャッシュ取得。大好物・報酬の表示用。
 * items テーブルは admin の手動追加・編集時のみ変わる。
 */
export const getItemsByIdsCached = unstable_cache(
  async (ids: string[]): Promise<Item[]> => {
    if (ids.length === 0) return [];
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("items")
      .select("id, name, image_url, item_type, created_at, updated_at")
      .in("id", ids)
      .returns<Item[]>();
    return data ?? [];
  },
  ["trickcal-items-by-ids"],
  { revalidate: 600, tags: ["items"] }
);

/**
 * アルバイト報酬アイテム一覧を10分キャッシュ。
 * サイドバー / ホームのコンパクト表示で繰り返し参照される。
 */
export type RewardItemCache = {
  id: string;
  name: string;
  image_url: string | null;
};

export const getRewardItemsCached = unstable_cache(
  async (): Promise<RewardItemCache[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("items")
      .select("id, name, image_url")
      .eq("item_type", "reward")
      .order("name", { ascending: true });
    return (data as RewardItemCache[] | null) ?? [];
  },
  ["trickcal-reward-items"],
  { revalidate: 600, tags: ["items"] }
);

/**
 * 同属性・同レアリティの関連キャラ一覧 + 各キャラのランキング情報を
 * FK join で1クエリに取得して2分キャッシュ。
 * キャラの所属は admin 更新時のみ、ランキングは1日1回の再集計なので2分で十分。
 */
export type RelatedCharacterRow = {
  id: string;
  slug: string;
  name: string;
  element: string | null;
  image_url: string | null;
  avg_rating: number | null;
  valid_votes_count: number;
};

type RawRelatedRow = {
  id: string;
  slug: string;
  name: string;
  element: string | null;
  image_url: string | null;
  character_rankings:
    | { avg_rating: number | null; valid_votes_count: number | null }
    | { avg_rating: number | null; valid_votes_count: number | null }[]
    | null;
};

/**
 * ティア本体を 10 秒キャッシュ。likes_count は頻繁に変わるが、
 * クライアント側はいいね POST のレスポンスで即同期するので
 * サーバー取得は 10 秒の staleness を許容してバースト負荷を緩和。
 */
export const getTierByIdCached = unstable_cache(
  async (id: string): Promise<Tier | null> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("tiers")
      .select("*")
      .eq("id", id)
      .single();
    return (data as Tier | null) ?? null;
  },
  ["trickcal-tier-by-id"],
  { revalidate: 10, tags: ["tiers"] }
);

/**
 * 編成本体を 10 秒キャッシュ。同上の理由。
 */
export const getBuildByIdCached = unstable_cache(
  async (id: string): Promise<Build | null> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("builds")
      .select("*")
      .eq("id", id)
      .single();
    return (data as Build | null) ?? null;
  },
  ["trickcal-build-by-id"],
  { revalidate: 10, tags: ["builds"] }
);

export const getRelatedCharactersCached = unstable_cache(
  async (
    excludeId: string,
    element: string | null,
    rarity: string | null
  ): Promise<RelatedCharacterRow[]> => {
    const supabase = createAdminClient();
    let q = supabase
      .from("characters")
      .select(
        "id, slug, name, element, image_url, character_rankings(avg_rating, valid_votes_count)"
      )
      .eq("is_hidden", false)
      .neq("id", excludeId);
    if (element) q = q.eq("element", element);
    if (rarity) q = q.eq("rarity", rarity);
    const { data } = await q.returns<RawRelatedRow[]>();
    return (data ?? []).map((c) => {
      const rank = Array.isArray(c.character_rankings)
        ? c.character_rankings[0] ?? null
        : c.character_rankings;
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        element: c.element,
        image_url: c.image_url,
        avg_rating: rank?.avg_rating ?? null,
        valid_votes_count: rank?.valid_votes_count ?? 0,
      };
    });
  },
  ["trickcal-related-characters-with-rankings"],
  { revalidate: 120, tags: ["characters", "rankings"] }
);
