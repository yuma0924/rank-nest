import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "みんなで決めるトリッカルランキング";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1523",
          color: "white",
          padding: "60px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* バッジ */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 32,
          }}
        >
          {[
            { label: "純粋", color: "#22c55e" },
            { label: "冷静", color: "#3b82f6" },
            { label: "狂気", color: "#ef4444" },
            { label: "活発", color: "#eab308" },
            { label: "憂鬱", color: "#a855f7" },
          ].map((e) => (
            <div
              key={e.label}
              style={{
                background: e.color,
                color: "white",
                fontSize: 20,
                fontWeight: 700,
                padding: "8px 20px",
                borderRadius: 999,
                display: "flex",
              }}
            >
              {e.label}
            </div>
          ))}
        </div>

        {/* メインタイトル */}
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#e05aa8",
            fontWeight: 700,
            letterSpacing: 4,
            marginBottom: 8,
          }}
        >
          みんなで決める
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 80,
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 24,
            background: "linear-gradient(90deg, #e05aa8, #f08a9a)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          トリッカルランキング
        </div>

        {/* タグライン */}
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#cbd5e1",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          人気キャラ・編成・ティア表をみんなの投票で
        </div>

        {/* フッター */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontSize: 22,
            color: "#64748b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#e05aa8", fontWeight: 700 }}>rank</span>
            <span>-</span>
            <span style={{ color: "white" }}>nest.com/trickcal</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
