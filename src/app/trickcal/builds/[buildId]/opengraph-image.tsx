import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "人気編成ランキング | みんなで決めるトリッカルランキング";

// 一時的に最小化: Supabase fetch なし、画像なし、テキストのみ。
// これが 200 になればルート/ImageResponse 自体は健全と確定し、
// 段階的に supabase と画像を戻して原因を追える。
export default async function Image() {
  return new ImageResponse(
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
          fontSize: 64,
          fontFamily: "sans-serif",
          fontWeight: 700,
        }}
      >
        人気編成ランキング
      </div>
    ),
    { ...size }
  );
}
