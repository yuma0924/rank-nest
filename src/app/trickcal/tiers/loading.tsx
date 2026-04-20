export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* ページタイトル */}
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-[14px] bg-bg-card" />
        <div className="h-6 w-48 rounded bg-bg-card" />
      </div>
      <div className="h-4 w-64 rounded bg-bg-card" />

      {/* ソート + 作成ボタン */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-bg-card" />
          ))}
        </div>
        <div className="h-9 w-20 rounded-xl bg-bg-card" />
      </div>

      {/* ティアカードグリッド */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-52 rounded-2xl border border-border-primary bg-bg-card" />
        ))}
      </div>
    </div>
  );
}
