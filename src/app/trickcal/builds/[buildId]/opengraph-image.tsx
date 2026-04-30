import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUILD_MODE_LABEL_MAP } from "@/lib/trickcal/constants";
import type { BuildMode } from "@/lib/trickcal/constants";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "人気編成ランキング | みんなで決めるトリッカルランキング";

// 切り分け中: supabase fetch 成功時にもシンプルな fallback テキストを返す。
// これが 200 になればロジック側は健全 → 残るは複雑な JSX (画像/gradient 等) が原因。
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
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return fallback(`ERR ${msg.slice(0, 60)}`);
  }

  if (!build) return fallback("編成が見つかりません");

  const modeLabel = BUILD_MODE_LABEL_MAP[build.mode as BuildMode] ?? build.mode;
  const buildTitle = build.title || `${build.element_label ?? ""}${modeLabel}`;
  return fallback(`OK: ${buildTitle.slice(0, 40)}`);
}
