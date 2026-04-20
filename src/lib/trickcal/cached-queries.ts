import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Character, Item } from "@/types/trickcal";

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
 * 同属性・同レアリティの関連キャラ一覧を5分キャッシュ取得。
 * キャラの所属は admin 更新時のみ変わる。
 */
export type RelatedCharacterRow = {
  id: string;
  slug: string;
  name: string;
  element: string | null;
  image_url: string | null;
};

export const getRelatedCharactersCached = unstable_cache(
  async (
    excludeId: string,
    element: string | null,
    rarity: string | null
  ): Promise<RelatedCharacterRow[]> => {
    const supabase = createAdminClient();
    let q = supabase
      .from("characters")
      .select("id, slug, name, element, image_url")
      .eq("is_hidden", false)
      .neq("id", excludeId);
    if (element) q = q.eq("element", element);
    if (rarity) q = q.eq("rarity", rarity);
    const { data } = await q.returns<RelatedCharacterRow[]>();
    return data ?? [];
  },
  ["trickcal-related-characters"],
  { revalidate: 300, tags: ["characters"] }
);
