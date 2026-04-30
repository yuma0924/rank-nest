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
          background: "#0a0e1a",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 装飾円: 右上ピンク */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 500,
            height: 500,
            borderRadius: 250,
            background: "rgba(224,90,168,0.25)",
            filter: "blur(100px)",
            display: "flex",
          }}
        />
        {/* 装飾円: 左下ブルー */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -200,
            width: 500,
            height: 500,
            borderRadius: 250,
            background: "rgba(56,189,248,0.18)",
            filter: "blur(100px)",
            display: "flex",
          }}
        />

        {/* 中央コンテンツ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: "80px 60px",
            position: "relative",
          }}
        >
          {/* タグ */}
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#e05aa8",
              fontWeight: 700,
              letterSpacing: 8,
              marginBottom: 24,
            }}
          >
            TRICKCAL FAN SITE
          </div>

          {/* メインタイトル */}
          <div
            style={{
              display: "flex",
              fontSize: 110,
              fontWeight: 900,
              lineHeight: 1,
              background: "linear-gradient(90deg, #e05aa8 0%, #f08a9a 50%, #ffb85e 100%)",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: -2,
            }}
          >
            rank-nest
          </div>

          {/* サブタイトル */}
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 800,
              marginTop: 24,
              color: "white",
            }}
          >
            みんなで決めるトリッカルランキング
          </div>

          {/* ディバイダー */}
          <div
            style={{
              display: "flex",
              width: 80,
              height: 4,
              background: "linear-gradient(90deg, #e05aa8, #f08a9a)",
              borderRadius: 2,
              marginTop: 32,
            }}
          />

          {/* タグライン */}
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#94a3b8",
              marginTop: 28,
              fontWeight: 500,
            }}
          >
            キャラ評価・人気編成・ティア表をみんなの投票で
          </div>
        </div>

        {/* 下部 URL バー */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontSize: 22,
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          rank-nest.com/trickcal
        </div>
      </div>
    ),
    { ...size }
  );
}
