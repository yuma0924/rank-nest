export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse pb-12">
      {/* タイトル */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-bg-card" />
          <div className="h-8 w-48 rounded bg-bg-card" />
        </div>
        <div className="mt-2 h-3 w-32 rounded bg-bg-card pl-4" />
      </div>

      {/* 冒頭メッセージ */}
      <div className="h-20 rounded-2xl border border-border-primary bg-bg-card" />

      {/* セクション */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mt-8 space-y-3">
          <div className="h-6 w-40 rounded bg-bg-card" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-bg-card" />
            <div className="h-4 w-5/6 rounded bg-bg-card" />
            <div className="h-4 w-4/6 rounded bg-bg-card" />
          </div>
        </div>
      ))}
    </div>
  );
}
