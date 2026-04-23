import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIER_LABELS, TIER_COLORS } from "@/lib/trickcal/constants";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "みんなのティア表 | みんなで決めるトリッカルランキング";

// キャラ image_url が相対パス (`/characters/xxx.webp`) の場合は絶対 URL に。
function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `https://rank-nest.com${url}`;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: tier } = await supabase
    .from("tiers")
    .select("title, display_name, data")
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!tier) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#0f1523",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
          }}
        >
          ティアが見つかりません
        </div>
      ),
      { ...size }
    );
  }

  const tierData = tier.data as Record<string, string[]>;
  const allCharIds = Array.from(new Set(Object.values(tierData).flat()));
  const { data: chars } = await supabase
    .from("characters")
    .select("id, image_url")
    .in("id", allCharIds);

  const charMap = new Map<string, string | null>(
    (chars ?? []).map((c) => [c.id, c.image_url])
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f1523 0%, #1a2236 100%)",
          color: "white",
          padding: "40px 48px",
          fontFamily: "sans-serif",
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
          <div style={{ fontSize: 20, color: "#e05aa8", fontWeight: 700, letterSpacing: 2 }}>
            TIER LIST
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              marginTop: 4,
              maxWidth: 1100,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tier.title || "無題のティア"}
          </div>
          {tier.display_name && (
            <div style={{ fontSize: 22, color: "#94a3b8", marginTop: 4 }}>
              by {tier.display_name}
            </div>
          )}
        </div>

        {/* ランク行 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {TIER_LABELS.map((label) => {
            const ids = tierData[label] ?? [];
            return (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  padding: "6px 12px",
                  height: 62,
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    background: TIER_COLORS[label],
                    color: "white",
                    fontSize: 30,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    flexShrink: 0,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginLeft: 14,
                    overflow: "hidden",
                  }}
                >
                  {ids.slice(0, 16).map((cid) => {
                    const url = toAbsoluteUrl(charMap.get(cid) ?? null);
                    if (!url) return null;
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={cid}
                        src={url}
                        alt=""
                        width={50}
                        height={50}
                        style={{ borderRadius: 6, objectFit: "cover" }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            fontSize: 18,
            color: "#64748b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#e05aa8", fontWeight: 700 }}>rank</span>
            <span>-</span>
            <span style={{ color: "white" }}>nest.com/trickcal</span>
          </div>
          <div>みんなで決めるトリッカルランキング</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
