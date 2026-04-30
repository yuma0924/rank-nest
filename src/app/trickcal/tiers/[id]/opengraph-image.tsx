import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIER_LABELS, TIER_COLORS } from "@/lib/trickcal/constants";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "みんなのティア表 | みんなで決めるトリッカルランキング";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const fallback = (text: string) =>
    new ImageResponse(
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
            fontFamily: "sans-serif",
          }}
        >
          {text}
        </div>
      ),
      { ...size }
    );

  type TierRow = {
    title: string | null;
    display_name: string | null;
    data: Record<string, string[]>;
  };
  let tier: TierRow | null = null;
  try {
    const supabase = createAdminClient();
    const res = await supabase
      .from("tiers")
      .select("title, display_name, data")
      .eq("id", id)
      .eq("is_deleted", false)
      .maybeSingle();
    tier = (res.data as TierRow | null) ?? null;
  } catch {
    return fallback("みんなのティア表");
  }

  if (!tier) return fallback("ティアが見つかりません");

  const tierData = tier.data ?? {};

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0f1523",
          color: "white",
          padding: "40px 48px",
          fontFamily: "sans-serif",
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
          <div style={{ fontSize: 20, color: "#e05aa8", fontWeight: 700, letterSpacing: 2, display: "flex" }}>
            TIER LIST
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              marginTop: 4,
              maxWidth: 1100,
              display: "flex",
            }}
          >
            {tier.title || "無題のティア"}
          </div>
          {tier.display_name && (
            <div style={{ fontSize: 22, color: "#94a3b8", marginTop: 4, display: "flex" }}>
              by {tier.display_name}
            </div>
          )}
        </div>

        {/* ランク行（バッジ + キャラ数のみ表示） */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
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
                  padding: "10px 16px",
                  height: 64,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    background: TIER_COLORS[label],
                    color: "white",
                    fontSize: 32,
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
                    marginLeft: 18,
                    fontSize: 20,
                    color: "#94a3b8",
                  }}
                >
                  {ids.length}キャラ
                </div>
                {/* キャラスロットのプレースホルダー */}
                <div style={{ display: "flex", gap: 6, marginLeft: 24, flex: 1 }}>
                  {Array.from({ length: Math.min(ids.length, 12) }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 40,
                        height: 40,
                        background: "rgba(255,255,255,0.08)",
                        border: "2px solid rgba(255,255,255,0.12)",
                        borderRadius: 6,
                      }}
                    />
                  ))}
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
