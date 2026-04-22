interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * JSON-LD を <script type="application/ld+json"> として埋め込む。
 * Server Component で使用。
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
