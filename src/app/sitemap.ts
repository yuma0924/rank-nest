import type { MetadataRoute } from "next";
import { SITE_DOMAIN } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = `https://${SITE_DOMAIN}`;

  // 静的ページ
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/trickcal`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/trickcal/ranking`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/trickcal/tiers`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/trickcal/builds`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/trickcal/guidelines`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // キャラクター個別ページ
  const supabase = createAdminClient();
  const { data: characters } = await supabase
    .from("characters")
    .select("slug, updated_at")
    .eq("is_hidden", false);

  const characterPages: MetadataRoute.Sitemap = (characters ?? []).map(
    (char) => ({
      url: `${baseUrl}/trickcal/characters/${char.slug}`,
      lastModified: new Date(char.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  );

  return [...staticPages, ...characterPages];
}
