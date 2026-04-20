export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* ページタイトル */}
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-[14px] bg-bg-card" />
        <div className="h-6 w-48 rounded bg-bg-card" />
      </div>
      <div className="h-4 w-56 rounded bg-bg-card" />

      {/* フィルター */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-16 rounded-[10px] bg-bg-card" />
        ))}
      </div>

      {/* 1位バナー */}
      <div className="h-14 rounded-2xl border border-border-primary bg-bg-card" />

      {/* ランキンググリッド */}
      <div className="grid grid-cols-4 gap-2 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-[14px] border border-border-primary bg-bg-card" />
        ))}
      </div>
    </div>
  );
}
