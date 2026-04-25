function SectionHeadingSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-[14px] bg-bg-card" />
        <div className="h-5 w-40 rounded bg-bg-card" />
      </div>
      <div className="h-4 w-20 rounded bg-bg-card" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="animate-pulse space-y-12 md:space-y-16">
      {/* 人気キャラランキング */}
      <section className="space-y-4">
        <SectionHeadingSkeleton />
        <div className="h-5 w-64 rounded bg-bg-card" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-border-primary bg-bg-card" />
          ))}
        </div>
        <div className="mx-auto h-12 w-full max-w-sm rounded-2xl bg-bg-card" />
      </section>

      {/* みんなのティア表 */}
      <section className="space-y-4">
        <SectionHeadingSkeleton />
        <div className="h-4 w-56 rounded bg-bg-card" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl border border-border-primary bg-bg-card" />
          ))}
        </div>
      </section>

      {/* キャラクターを探す */}
      <section className="space-y-4">
        <SectionHeadingSkeleton />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-16 rounded-[10px] bg-bg-card" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-[14px] border border-border-primary bg-bg-card" />
          ))}
        </div>
      </section>

      {/* 人気編成ランキング */}
      <section className="space-y-4">
        <SectionHeadingSkeleton />
        <div className="h-4 w-48 rounded bg-bg-card" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl border border-border-primary bg-bg-card" />
          ))}
        </div>
      </section>
    </div>
  );
}
