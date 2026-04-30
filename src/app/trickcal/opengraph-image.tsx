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

async function loadFont(text: string, weight: 400 | 700): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => r.text());
    const match = css.match(/src:\s*url\(([^)]+)\)/);
    if (!match) return null;
    const buf = await fetch(match[1]).then((r) => r.arrayBuffer());
    return buf;
  } catch {
    return null;
  }
}

export default async function Image() {
  const textAll =
    "みんなで決める！トリッカルランキング" +
    "みんなのキャラへの投票で人気ランキングが決まりティア表や編成を共有したり、コメントで語り合えます。" +
    "rank-nest.com/trickcal";

  const [logo, font400, font700] = await Promise.all([
    loadLogoDataUrl(),
    loadFont(textAll, 400),
    loadFont(textAll, 700),
  ]);

  const fonts = [
    font400 && {
      name: "ZenMaruGothic",
      data: font400,
      weight: 400 as const,
      style: "normal" as const,
    },
    font700 && {
      name: "ZenMaruGothic",
      data: font700,
      weight: 700 as const,
      style: "normal" as const,
    },
  ].filter((f): f is NonNullable<typeof f> => !!f);

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
          fontFamily: "ZenMaruGothic",
          position: "relative",
          padding: "60px 80px",
        }}
      >
        {/* メインロゴ + タイトル */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 36,
          }}
        >
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              width={150}
              height={150}
              style={{
                flexShrink: 0,
                objectFit: "contain",
              }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                color: "#e05aa8",
              }}
            >
              みんなで決める！
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 68,
                fontWeight: 700,
                color: "white",
                lineHeight: 1.05,
              }}
            >
              トリッカルランキング
            </div>
          </div>
        </div>

        {/* 説明文 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 24,
            fontWeight: 400,
            color: "#cbd5e1",
            marginTop: 50,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: "flex" }}>
            みんなのキャラへの投票で人気ランキングが決まり
          </div>
          <div style={{ display: "flex" }}>
            ティア表や編成を共有したり、コメントで語り合えます。
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontSize: 20,
            color: "#64748b",
            fontWeight: 400,
          }}
        >
          rank-nest.com/trickcal
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined }
  );
}
