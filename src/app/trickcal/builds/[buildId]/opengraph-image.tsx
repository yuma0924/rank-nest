import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUILD_MODE_LABEL_MAP } from "@/lib/trickcal/constants";
import type { BuildMode } from "@/lib/trickcal/constants";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "人気編成ランキング | みんなで決めるトリッカルランキング";

function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `https://rank-nest.com${url}`;
}

export default async function Image({ params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;
  const supabase = createAdminClient();

  const { data: build } = await supabase
    .from("builds")
    .select("title, display_name, mode, element_label, members")
    .eq("id", buildId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!build) {
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
          編成が見つかりません
        </div>
      ),
      { ...size }
    );
  }

  const memberIds = ((build.members as (string | null)[]) ?? []).filter(
    (id): id is string => !!id
  );
  const { data: chars } = memberIds.length > 0
    ? await supabase
        .from("characters")
        .select("id, image_url")
        .in("id", memberIds)
    : { data: [] };

  const charMap = new Map<string, string | null>(
    (chars ?? []).map((c) => [c.id, c.image_url])
  );

  const modeLabel = BUILD_MODE_LABEL_MAP[build.mode as BuildMode] ?? build.mode;
  const buildTitle =
    build.title || `${build.element_label ?? ""}${modeLabel}`;

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
          padding: "48px 56px",
          fontFamily: "sans-serif",
        }}
      >
        {/* ヘッダー: モード + 属性 バッジ */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              background: "#3b82f6",
              color: "white",
              fontSize: 20,
              fontWeight: 700,
              padding: "6px 16px",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
            }}
          >
            {modeLabel}
          </div>
          {build.element_label && (
            <div
              style={{
                background: "#e05aa8",
                color: "white",
                fontSize: 20,
                fontWeight: 700,
                padding: "6px 16px",
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
              }}
            >
              {build.element_label}
            </div>
          )}
        </div>

        {/* タイトル */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 8,
            maxWidth: 1100,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {buildTitle}
        </div>
        {build.display_name && (
          <div style={{ fontSize: 24, color: "#94a3b8" }}>
            by {build.display_name}
          </div>
        )}

        {/* メンバー横並び */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: "auto",
            marginBottom: 24,
            justifyContent: "center",
          }}
        >
          {memberIds.slice(0, 9).map((cid, i) => {
            const url = toAbsoluteUrl(charMap.get(cid) ?? null);
            if (!url) {
              return (
                <div
                  key={i}
                  style={{
                    width: 120,
                    height: 120,
                    background: "#1a2236",
                    borderRadius: 16,
                  }}
                />
              );
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                width={120}
                height={120}
                style={{
                  borderRadius: 16,
                  objectFit: "cover",
                  border: "3px solid rgba(255,255,255,0.1)",
                }}
              />
            );
          })}
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            color: "#64748b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#e05aa8", fontWeight: 700 }}>rank</span>
            <span>-</span>
            <span style={{ color: "white" }}>nest.com/trickcal</span>
          </div>
          <div>人気編成ランキング</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
