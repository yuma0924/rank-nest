import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "rank-nest - みんなで決めるゲームランキング",
  description:
    "プレイヤーの投票で決まるゲームランキングポータル。キャラ評価・ティア表・編成共有を通じて、遊んでいる仲間とリアルな順位を形にするサイト群。",
  alternates: {
    canonical: "/",
  },
};

type SiteStatus = "active" | "planned";

const SITES: {
  slug: string;
  title: string;
  lead: string;
  description: string;
  href: string;
  status: SiteStatus;
  logo?: string;
}[] = [
  {
    slug: "trickcal",
    title: "みんなで決めるトリッカルランキング",
    lead: "みんなで決める！",
    description:
      "トリッカル・もちもちほっぺ大作戦の全キャラ性能を数値で比較し、プレイヤーの投票でリアルな順位を決定する非公式データベース。",
    href: "/trickcal",
    status: "active",
    logo: "/logo.png",
  },
];

const PLANNED_GAMES = ["他ゲームも順次追加予定"];

export default function PortalPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="border-b border-border-primary">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 md:px-8">
          <span className="text-base font-bold md:text-lg">
            <span className="text-accent">rank</span>
            <span className="text-text-muted">-</span>
            <span>nest</span>
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 pt-12 pb-8 text-center md:pt-20 md:pb-12 md:px-8">
          <h1 className="text-2xl font-bold leading-tight md:text-4xl">
            みんなで決める、
            <br className="md:hidden" />
            ゲームの評価ポータル
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary md:mt-5 md:text-base">
            プレイヤーの投票でリアルな順位が決まる、
            <br className="md:hidden" />
            非公式ランキングサイトを集めた場所です。
          </p>
        </section>

        {/* 運営中のサイト */}
        <section className="mx-auto max-w-3xl px-4 pb-10 md:px-8">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
            運営中のサイト
          </h2>
          <div className="space-y-3">
            {SITES.map((site) => (
              <Link
                key={site.slug}
                href={site.href}
                className="group block rounded-2xl border border-border-primary bg-bg-card p-4 transition-colors hover:bg-bg-card-hover md:p-5"
              >
                <div className="flex items-start gap-3 md:gap-4">
                  {site.logo && (
                    <Image
                      src={site.logo}
                      alt=""
                      width={56}
                      height={56}
                      sizes="56px"
                      loading="eager"
                      className="h-12 w-12 shrink-0 rounded-xl md:h-14 md:w-14"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-accent/80 md:text-xs">
                        {site.lead}
                      </span>
                    </div>
                    <h3 className="mt-0.5 truncate text-base font-bold md:text-lg">
                      {site.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-text-tertiary md:text-sm">
                      {site.description}
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 md:h-5 md:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 準備中 */}
        <section className="mx-auto max-w-3xl px-4 pb-14 md:px-8">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Coming soon
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {PLANNED_GAMES.map((title) => (
              <div
                key={title}
                className="rounded-2xl border border-dashed border-border-primary bg-bg-card/40 px-4 py-6 text-center"
              >
                <span className="text-xs text-text-muted md:text-sm">{title}</span>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="mx-auto max-w-3xl px-4 pb-14 md:px-8">
          <div className="rounded-2xl border border-border-primary bg-bg-card-alpha-light p-5 md:p-6">
            <h2 className="text-sm font-bold md:text-base">rank-nest について</h2>
            <p className="mt-2 text-xs leading-relaxed text-text-tertiary md:text-sm">
              rank-nest は、ゲームごとに「みんなの投票で決まるランキング」を共有するポータルです。
              各ゲームのキャラ評価・ティア表・編成投稿が1つの場所に集まり、プレイヤー同士の声を見つけやすくします。
              すべて非公式のファンサイトで、運営元・権利保持者とは無関係です。
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>© 2026 rank-nest</p>
          <p>
            お問い合わせ:{" "}
            <a
              href="mailto:contact@rank-nest.com"
              className="text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
            >
              contact@rank-nest.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
