export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* ページタイトル */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[14px] bg-bg-card" />
            <div className="h-6 w-48 rounded bg-bg-card" />
          </div>
          <div className="h-6 w-20 rounded bg-bg-card" />
        </div>
        <div className="mt-1 ml-[42px] h-4 w-56 rounded bg-bg-card" />
      </div>

      {/* 性格フィルター: 全性格(幅広) + 5属性アイコン */}
      <div className="flex items-center gap-1.5 lg:gap-2">
        <div className="h-8 w-16 rounded-[10px] bg-bg-card" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-8 rounded-[10px] bg-bg-card" />
        ))}
      </div>

      {/* 1位アナウンスバー */}
      <div className="-mt-3 flex items-stretch justify-between gap-4">
        <div className="h-12 flex-1 max-w-md rounded-2xl border border-border-primary bg-bg-card" />
        <div className="hidden lg:block h-12 w-64 rounded-2xl border border-border-primary bg-bg-card" />
      </div>

      {/* ランキンググリッド */}
      <div className="grid grid-cols-4 gap-2 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-[14px] border border-border-primary bg-bg-card" />
        ))}
      </div>

      {/* もっと表示ボタン */}
      <div className="flex justify-center">
        <div className="h-10 w-56 rounded-xl bg-bg-card" />
      </div>
    </div>
  );
}
