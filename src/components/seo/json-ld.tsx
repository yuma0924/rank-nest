interface JsonLdProps {
  data: Record<string, unknown>;
}

// JSON.stringify は `<` `>` `&` `\u2028` `\u2029` をエスケープしないため、
// ユーザー投稿文字列に `</script>` が含まれると script タグが破られ XSS になる。
function serializeForScriptTag(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * JSON-LD を <script type="application/ld+json"> として埋め込む。
 * Server Component で使用。
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeForScriptTag(data) }}
    />
  );
}
