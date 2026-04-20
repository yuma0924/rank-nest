export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* ヒーロー */}
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <div className="aspect-square w-full rounded-2xl bg-bg-card md:w-56" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-40 rounded bg-bg-card" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 w-16 rounded-full bg-bg-card" />
            ))}
          </div>
          <div className="h-4 w-48 rounded bg-bg-card" />
        </div>
      </div>

      {/* スキル */}
      <div className="space-y-3">
        <div className="h-5 w-24 rounded bg-bg-card" />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 rounded-[10px] border border-border-primary bg-bg-card" />
          ))}
        </div>
        <div className="h-48 rounded-[10px] border border-border-primary bg-bg-card" />
      </div>

      {/* 関連キャラ */}
      <div className="space-y-3">
        <div className="h-5 w-32 rounded bg-bg-card" />
        <div className="grid grid-cols-4 gap-2 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-[14px] border border-border-primary bg-bg-card" />
          ))}
        </div>
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
