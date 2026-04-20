export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* タイトル */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 pl-2">
          <div className="h-5 w-5 rounded bg-bg-card" />
          <div className="h-6 w-40 rounded bg-bg-card" />
        </div>
      </div>

      {/* ティア表 */}
      <div className="overflow-hidden rounded-2xl border border-border-primary bg-bg-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex h-16 items-center border-b border-border-primary px-3">
            <div className="h-8 w-8 shrink-0 rounded bg-bg-tertiary" />
            <div className="ml-3 flex gap-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-10 w-10 rounded-md bg-bg-tertiary" />
              ))}
            </div>
          </div>
        ))}
        {/* フッター */}
        <div className="flex items-center justify-between border-t border-border-primary bg-bg-tertiary/50 px-4 py-3">
          <div className="h-3 w-24 rounded bg-bg-card" />
          <div className="h-7 w-14 rounded-lg bg-bg-card" />
        </div>
      </div>

      {/* コメント */}
      <div className="space-y-3">
        <div className="h-12 rounded-[14px] bg-bg-card" />
        <div className="h-5 w-28 rounded bg-bg-card" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border-primary bg-bg-card" />
        ))}
      </div>
    </div>
  );
}
