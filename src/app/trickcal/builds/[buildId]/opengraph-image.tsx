import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUILD_MODE_LABEL_MAP } from "@/lib/trickcal/constants";
import type { BuildMode } from "@/lib/trickcal/constants";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "人気編成ランキング | みんなで決めるトリッカルランキング";

export default async function Image({ params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;

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

  type BuildRow = {
    title: string | null;
    display_name: string | null;
    mode: string;
    element_label: string | null;
    members: (string | null)[];
  };
  let build: BuildRow | null = null;
  try {
    const supabase = createAdminClient();
    const res = await supabase
      .from("builds")
      .select("title, display_name, mode, element_label, members")
      .eq("id", buildId)
      .eq("is_deleted", false)
      .maybeSingle();
    build = (res.data as BuildRow | null) ?? null;
  } catch {
    return fallback("人気編成ランキング");
  }

  if (!build) return fallback("編成が見つかりません");

  const modeLabel = BUILD_MODE_LABEL_MAP[build.mode as BuildMode] ?? build.mode;
  const buildTitle = build.title || `${build.element_label ?? ""}${modeLabel}`;
  const memberCount = (build.members ?? []).filter((m): m is string => !!m).length;

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
            display: "flex",
          }}
        >
          {buildTitle}
        </div>
        {build.display_name && (
          <div style={{ fontSize: 24, color: "#94a3b8", display: "flex" }}>
            by {build.display_name}
          </div>
        )}

        {/* メンバー横並び（キャラ画像） */}
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
