import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUILD_MODE_LABEL_MAP } from "@/lib/trickcal/constants";
import type { BuildMode } from "@/lib/trickcal/constants";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "人気編成ランキング | みんなで決めるトリッカルランキング";

// 段階的復元: Supabase fetch を戻す（画像はまだ）
export default async function Image({ params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;

  const fallback = (text: string) =>
    new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #0f1523 0%, #1a2236 100%)",
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

  type BuildRow = {
    title: string | null;
    display_name: string | null;
    mode: string;
    element_label: string | null;
    members: (string | null)[];
  };
  let build: BuildRow | null = null;
  let debugInfo = "";
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    debugInfo = `URL:${url.slice(0, 30)}... KEY:${key ? "set" : "NULL"}`;
    const supabase = createAdminClient();
    const res = await supabase
      .from("builds")
      .select("title, display_name, mode, element_label, members")
      .eq("id", buildId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (res.error) debugInfo += ` ERR:${res.error.message}`;
    build = (res.data as BuildRow | null) ?? null;
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return fallback(`ERR ${msg.slice(0, 80)}`);
  }

  if (!build) return fallback(`編成なし ${debugInfo.slice(0, 60)}`);

  const modeLabel = BUILD_MODE_LABEL_MAP[build.mode as BuildMode] ?? build.mode;
  const buildTitle =
    build.title || `${build.element_label ?? ""}${modeLabel}`;
  const memberCount = (build.members ?? []).filter((m) => !!m).length;

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

        {/* メンバープレースホルダー（画像はまだ戻していない） */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: "auto",
            marginBottom: 24,
            justifyContent: "center",
          }}
        >
          {Array.from({ length: Math.min(memberCount, 9) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 120,
                height: 120,
                background: "rgba(255,255,255,0.08)",
                border: "3px solid rgba(255,255,255,0.15)",
                borderRadius: 16,
              }}
            />
          ))}
        </div>

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
