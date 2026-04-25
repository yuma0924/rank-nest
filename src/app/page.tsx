import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "rank-nest - みんなで決めるゲームキャラ・編成ランキング",
  description:
    "みんなの投票で決まる、ゲームキャラ・編成のランキングポータル。キャラ評価・ティア表・編成共有を通じて、遊んでいる仲間と人気ランキングをつくるサイト群。",
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
  accent?: string;
}[] = [
  {
    slug: "trickcal",
    title: "トリッカルランキング",
    lead: "みんなで決める！",
    description:
      "トリッカル・もちもちほっぺ大作戦の非公式ファンサイト。みんなのキャラへの投票で人気ランキングが決まり、ティア表や編成を共有したり、コメントで語り合えます。",
    href: "/trickcal",
    status: "active",
    logo: "/logo.png",
    accent: "#e05aa8",
  },
];

export default function PortalPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="border-b border-border-primary">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 md:px-8">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="h-6 w-6 text-text-secondary md:h-7 md:w-7"
          >
            <path
              d="M2.5 11.5 Q 12 22 21.5 11.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.35"
            />
            <path
              d="M5 11.5 Q 12 19 19 11.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <ellipse cx="7" cy="11.5" rx="1.5" ry="1.9" fill="currentColor" opacity="0.55" />
            <ellipse cx="17" cy="11.5" rx="1.5" ry="1.9" fill="currentColor" opacity="0.55" />
            <ellipse cx="12" cy="8.5" rx="1.8" ry="2.3" fill="#e05aa8" />
          </svg>
          <span className="text-base font-bold md:text-lg">
            <span className="text-accent">rank</span>
            <span className="text-text-muted">-</span>
            <span>nest</span>
          </span>
        </div>
      </header>

      <main className="relative flex-1">
        {/* Hero with decorative pink glow */}
        <section className="relative mx-auto max-w-3xl px-4 pt-12 pb-8 text-center md:pt-20 md:pb-12 md:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 md:h-96"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 30%, rgba(224, 90, 168, 0.18) 0%, rgba(240, 138, 154, 0.06) 40%, transparent 75%)",
            }}
          />
          <h1 className="text-2xl font-bold leading-tight md:text-4xl">
            <span className="bg-gradient-to-r from-[#e05aa8] to-[#f08a9a] bg-clip-text text-transparent">
              みんなで決める
            </span>
            <br />
            ゲームキャラ・編成ランキング
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary md:mt-5 md:text-base">
            みんなの投票でランキングが決まる、
            <br className="md:hidden" />
            非公式のファンサイトを公開しています。
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
                className="group relative block overflow-hidden rounded-2xl border border-border-primary bg-bg-card p-4 pl-5 transition-colors hover:bg-bg-card-hover md:p-5 md:pl-6"
              >
                {site.accent && (
                  <>
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ backgroundColor: site.accent }}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background: `radial-gradient(120% 80% at 0% 50%, ${site.accent}14 0%, transparent 60%)`,
                      }}
                    />
                  </>
                )}
                <div className="relative flex items-start gap-3 md:gap-4">
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
                    <h3 className="mt-0.5 text-base font-bold leading-snug md:text-lg">
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

        {/* About */}
        <section className="mx-auto max-w-3xl px-4 pb-14 md:px-8">
          <div className="rounded-2xl border border-border-primary bg-bg-card-alpha-light p-5 md:p-6">
            <h2 className="text-sm font-bold md:text-base">rank-nest について</h2>
            <div className="mt-2 space-y-0.5 text-xs leading-relaxed text-text-tertiary md:text-sm">
              <p>rank-nest は、ゲームごとに「みんなの投票で決まるランキング」を共有するポータルです。</p>
              <p>各ゲームのキャラ評価・ティア表・編成投稿が1つの場所に集まり、みんなの声を見つけやすくします。</p>
              <p>すべて非公式のファンサイトで、運営元・権利保持者とは無関係です。</p>
            </div>
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
