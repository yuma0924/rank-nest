import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllVisibleCharacters } from "@/lib/trickcal/cached-queries";
import { TiersClient } from "./tiers-client";

type CharacterInfo = {
  id: string;
  name: string;
  image_url: string | null;
};

export const revalidate = 60;

export const metadata: Metadata = {
  title: "みんなのティア表 | みんなで決めるトリッカルランキング",
  description: "トリッカルのキャラクターをS〜Eの6段にランク付け。自分だけのティア表を作成・共有しよう",
  alternates: {
    canonical: "/trickcal/tiers",
  },
};

export default async function TiersPage() {
  const supabase = createAdminClient();

  // キャラクター（キャッシュ）+ 全ティアデータを並列取得
  const [allChars, tiersResult] = await Promise.all([
    getAllVisibleCharacters(),
    supabase
      .from("tiers")
      .select("id, title, display_name, data, likes_count, created_at, tier_comments(count)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
  ]);

  const characters: Record<string, CharacterInfo> = {};
  for (const c of allChars) {
    characters[c.id] = { id: c.id, name: c.name, image_url: c.image_url };
  }

  const allTiers = tiersResult.data;

  const tiersData = (allTiers ?? []).map((t) => {
    const commentCount = Array.isArray(t.tier_comments) && t.tier_comments.length > 0
      ? (t.tier_comments[0] as { count: number }).count
      : 0;
    return {
      id: t.id,
      title: t.title as string | null,
      display_name: t.display_name as string | null,
      data: t.data as Record<string, string[]>,
      likes_count: t.likes_count,
      created_at: t.created_at,
      comment_count: commentCount,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/trickcal/tiers"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px]"
            style={{ backgroundImage: "linear-gradient(135deg, #9048d4, #d4408a)" }}
          >
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
          </span>
          <h1 className="text-lg font-bold text-text-primary">みんなのティア表</h1>
        </Link>
        <p className="mt-1 pl-[42px] text-xs md:text-sm text-text-muted">
          キャラクターをランク付けして共有しよう
        </p>
      </div>

      <TiersClient characters={characters} allTiers={tiersData} />
    </div>
  );
}
