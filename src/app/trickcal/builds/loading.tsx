export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* ページタイトル */}
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-[14px] bg-bg-card" />
        <div className="h-6 w-48 rounded bg-bg-card" />
      </div>
      <div className="h-4 w-64 rounded bg-bg-card" />

      {/* モード選択 + 投稿ボタン */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-bg-card" />
          ))}
        </div>
        <div className="h-10 w-24 rounded-xl bg-bg-card" />
      </div>

      {/* 編成カードグリッド */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-44 rounded-2xl border border-border-primary bg-bg-card" />
        ))}
      </div>
    </div>
  );
}
