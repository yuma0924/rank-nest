import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIER_LABELS, TIER_COLORS } from "@/lib/trickcal/constants";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "みんなのティア表 | みんなで決めるトリッカルランキング";

async function loadImageAsDataUrl(raw: string | null): Promise<string | null> {
  if (!raw) return null;
  try {
    let buf: Buffer;
    let ct = "image/webp";
    if (raw.startsWith("http")) {
      const res = await fetch(raw);
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
      ct = res.headers.get("content-type") || "image/webp";
    } else {
      buf = await readFile(path.join(process.cwd(), "public", raw));
      const ext = path.extname(raw).slice(1).toLowerCase();
      ct = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/webp";
    }
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

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
  let charMap = new Map<string, string | null>();
  try {
    const supabase = createAdminClient();
    const res = await supabase
      .from("tiers")
      .select("title, display_name, data")
      .eq("id", id)
      .eq("is_deleted", false)
      .maybeSingle();
    tier = (res.data as TierRow | null) ?? null;
    if (tier) {
      const allCharIds = Array.from(new Set(Object.values(tier.data ?? {}).flat()));
      if (allCharIds.length > 0) {
        const charRes = await supabase
          .from("characters")
          .select("id, image_url")
          .in("id", allCharIds);
        charMap = new Map((charRes.data ?? []).map((c) => [c.id, c.image_url]));
      }
    }
  } catch {
    return fallback("みんなのティア表");
  }

  if (!tier) return fallback("ティアが見つかりません");

  const tierData = tier.data ?? {};
  // 各ティアごとに最大 12 キャラまで画像を解決
  const tierImages = await Promise.all(
    TIER_LABELS.map(async (label) => {
      const ids = (tierData[label] ?? []).slice(0, 12);
      const srcs = await Promise.all(
        ids.map((cid) => loadImageAsDataUrl(charMap.get(cid) ?? null))
      );
      return { label, srcs, total: (tierData[label] ?? []).length };
    })
  );

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
          padding: "32px 40px",
          fontFamily: "sans-serif",
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 12 }}>
          <div style={{ fontSize: 18, color: "#e05aa8", fontWeight: 700, letterSpacing: 2, display: "flex" }}>
            TIER LIST
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              marginTop: 2,
              maxWidth: 1100,
              display: "flex",
            }}
          >
            {tier.title || "無題のティア"}
          </div>
          {tier.display_name && (
            <div style={{ fontSize: 18, color: "#94a3b8", marginTop: 2, display: "flex" }}>
              by {tier.display_name}
            </div>
          )}
        </div>

        {/* ランク行 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {tierImages.map(({ label, srcs, total }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                padding: "6px 10px",
                height: 60,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: TIER_COLORS[label],
                  color: "white",
                  fontSize: 28,
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
              <div style={{ display: "flex", gap: 4, marginLeft: 12, overflow: "hidden", flex: 1 }}>
                {srcs.map((src, i) =>
                  src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt=""
                      width={48}
                      height={48}
                      style={{ borderRadius: 6, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      key={i}
                      style={{
                        width: 48,
                        height: 48,
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 6,
                      }}
                    />
                  )
                )}
                {total > 12 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginLeft: 4,
                      fontSize: 16,
                      color: "#94a3b8",
                    }}
                  >
                    +{total - 12}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            fontSize: 16,
            color: "#64748b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
