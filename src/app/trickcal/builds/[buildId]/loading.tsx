export default function Loading() {
  return (
    <div className="animate-pulse pt-2 space-y-6">
      {/* 編成情報カード */}
      <div className="rounded-2xl border border-border-primary bg-bg-card p-4 md:max-w-xl">
        {/* タイトル + 属性アイコン + モード */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="h-5 w-40 rounded bg-bg-tertiary" />
          <div className="flex items-center gap-1.5">
            <div className="h-[18px] w-[18px] rounded bg-bg-tertiary" />
            <div className="h-5 w-12 rounded-md bg-bg-tertiary" />
          </div>
        </div>
        {/* 3x3 編成グリッド */}
        <div className="mb-2 overflow-hidden rounded-[14px] border border-border-primary">
          <div className="grid grid-cols-3 bg-bg-inset">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 border-r border-border-primary last:border-r-0" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-3 border-b border-border-primary last:border-b-0">
              {Array.from({ length: 3 }).map((_, colIdx) => (
                <div key={colIdx} className="aspect-square border-r border-border-primary last:border-r-0 bg-bg-tertiary" />
              ))}
            </div>
          ))}
        </div>
        {/* コメントブロック */}
        <div className="mx-0.5 rounded-[10px] border border-border-primary bg-bg-inset px-2.5 py-2 min-h-[76px]">
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-bg-tertiary" />
            <div className="h-3 w-3/4 rounded bg-bg-tertiary" />
          </div>
        </div>
        {/* フッター */}
        <div className="mt-2 flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-bg-tertiary" />
          <div className="h-7 w-24 rounded-full bg-bg-tertiary" />
        </div>
      </div>

      {/* コメント投稿バナー */}
      <div className="h-20 rounded-[14px] border border-accent-active/30 bg-bg-card" />

      {/* コメント一覧 */}
      <div className="space-y-3">
        <div className="h-5 w-28 rounded bg-bg-card" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border-primary bg-bg-card" />
        ))}
      </div>

      {/* 似ている編成 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-bg-card" />
          <div className="h-7 w-40 rounded bg-bg-card" />
        </div>
        <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl border border-border-primary bg-bg-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
