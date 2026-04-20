export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 rounded bg-bg-card" />
        <div className="h-8 w-16 rounded-lg bg-bg-card" />
      </div>

      {/* 編成メンバー */}
      <div className="rounded-2xl border border-border-primary bg-bg-card p-4">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-[10px] bg-bg-tertiary" />
          ))}
        </div>
      </div>

      {/* 説明 */}
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-bg-card" />
        <div className="h-4 w-3/4 rounded bg-bg-card" />
      </div>

      {/* コメント */}
      <div className="space-y-3">
        <div className="h-5 w-28 rounded bg-bg-card" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border-primary bg-bg-card" />
        ))}
      </div>
    </div>
  );
}
