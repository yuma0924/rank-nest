/**
 * OpenAI Moderation API による画像コンテンツ判定。
 * omni-moderation-latest はマルチモーダル対応で、画像を直接渡せる。
 *
 * 環境変数: OPENAI_API_KEY
 *
 * 戻り値:
 *   { flagged: true }  → 不適切と判定された
 *   { flagged: false } → OK
 *
 * 例外:
 *   throw new Error("moderation_unavailable")
 *     - 本番で API キー未設定
 *     - API 呼び出しがネットワーク／HTTP エラーで失敗
 *   呼び出し側はこれを catch して 503 を返すなど安全側に倒すこと。
 */
export async function moderateImage(
  webpBuffer: Buffer
): Promise<{ flagged: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("moderation_unavailable");
    }
    // 開発環境ではローカル動作の阻害を避けるため黙認
    return { flagged: false };
  }

  const dataUrl = `data:image/webp;base64,${webpBuffer.toString("base64")}`;

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: [{ type: "image_url", image_url: { url: dataUrl } }],
      }),
    });
  } catch (e) {
    console.error("OpenAI moderation network error:", e);
    throw new Error("moderation_unavailable");
  }

  if (!res.ok) {
    console.error("OpenAI moderation HTTP error:", res.status);
    throw new Error("moderation_unavailable");
  }

  const json = (await res.json()) as {
    results?: Array<{ flagged?: boolean }>;
  };

  return { flagged: !!json.results?.[0]?.flagged };
}
