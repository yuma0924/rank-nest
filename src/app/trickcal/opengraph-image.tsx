import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "みんなで決めるトリッカルランキング";

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "logo.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image() {
  const logo = await loadLogoDataUrl();

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
          background: "#0a0e1a",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
          padding: "48px 60px",
        }}
      >
        {/* 装飾円: 右上ピンク */}
        <div
          style={{
            position: "absolute",
            top: -250,
            right: -250,
            width: 600,
            height: 600,
            borderRadius: 300,
            background: "rgba(224,90,168,0.30)",
            filter: "blur(110px)",
            display: "flex",
          }}
        />
        {/* 装飾円: 左下ブルー */}
        <div
          style={{
            position: "absolute",
            bottom: -250,
            left: -250,
            width: 600,
            height: 600,
            borderRadius: 300,
            background: "rgba(56,189,248,0.18)",
            filter: "blur(110px)",
            display: "flex",
          }}
        />

        {/* メインロゴ + タイトル */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 36,
            zIndex: 1,
          }}
        >
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              width={200}
              height={200}
              style={{
                borderRadius: 36,
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                fontSize: 36,
                fontWeight: 700,
                color: "#e05aa8",
                letterSpacing: 1,
              }}
            >
              みんなで決める！
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 900,
                color: "white",
                lineHeight: 1.05,
                letterSpacing: -1,
              }}
            >
              トリッカルランキング
            </div>
          </div>
        </div>

        {/* 説明 */}
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#cbd5e1",
            marginTop: 56,
            textAlign: "center",
            maxWidth: 980,
            lineHeight: 1.5,
            zIndex: 1,
          }}
        >
          全キャラ評価・人気編成・みんなのティア表を、投票で共有できる非公式ファンサイト
        </div>

        {/* URL バー */}
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
