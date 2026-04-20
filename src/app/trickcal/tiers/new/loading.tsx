export default function Loading() {
  return (
    <div className="animate-pulse -mx-4 space-y-4 md:mx-0">
      {/* タイトル */}
      <div className="px-4 md:px-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[14px] bg-bg-card" />
          <div className="h-6 w-40 rounded bg-bg-card" />
        </div>
        <div className="mt-2 h-4 w-56 rounded bg-bg-card pl-[42px]" />
      </div>

      {/* ティア作成エリア */}
      <div className="px-1 md:px-0">
        <div className="space-y-1">
          {["S", "A", "B", "C", "D", "E"].map((label) => (
            <div key={label} className="flex h-16 items-center rounded-lg border border-border-primary bg-bg-card px-3">
              <div className="h-8 w-8 shrink-0 rounded bg-bg-tertiary" />
            </div>
          ))}
        </div>

        {/* キャラクターグリッド */}
        <div className="mt-4">
          <div className="h-5 w-32 rounded bg-bg-card" />
          <div className="mt-2 grid grid-cols-6 gap-2 md:grid-cols-8">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-[10px] bg-bg-card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
