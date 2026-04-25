export default function Loading() {
  return (
    <div className="animate-pulse space-y-3 md:space-y-4">
      {/* タイトル + サブタイトル */}
      <div>
        <div className="h-6 w-48 rounded bg-bg-card md:h-7" />
        <div className="mt-1 h-3.5 w-72 rounded bg-bg-card" />
      </div>

      {/* アイテムグリッド: モバイル3行×横スクロール、PC 12列 */}
      <div className="relative -mx-4 md:mx-0">
        <div className="px-4 pb-2 pt-1.5 md:px-0 md:pb-0 md:pt-0">
          <div className="grid grid-flow-col grid-rows-3 auto-cols-[3.5rem] gap-1.5 md:grid-flow-row md:grid-rows-none md:grid-cols-12 md:auto-cols-auto">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-bg-card" />
            ))}
          </div>
        </div>
      </div>

      {/* 他のページもチェック */}
      <section className="!mt-10 space-y-3">
        <div className="h-4 w-32 rounded bg-bg-card" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-[14px] border border-border-primary bg-bg-card" />
        ))}
      </section>
    </div>
  );
}
