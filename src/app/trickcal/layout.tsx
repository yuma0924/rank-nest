import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/trickcal/layout/header";
import { Footer } from "@/components/trickcal/layout/footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { SidebarCharacters } from "@/components/trickcal/layout/sidebar-characters";
import { getAllVisibleCharacters } from "@/lib/trickcal/cached-queries";

export const metadata: Metadata = {
  title: {
    default: "みんなで決めるトリッカルランキング",
    template: "%s | みんなで決めるトリッカルランキング",
  },
  description:
    "トリッカル・もちもちほっぺ大作戦の非公式ファンサイト。みんなのキャラへの投票で人気ランキングが決まり、ティア表や編成を共有したり、コメントで語り合えます。",
  openGraph: {
    type: "website",
    siteName: "みんなで決めるトリッカルランキング",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
};

async function getSortedCharacters() {
  const allChars = await getAllVisibleCharacters();
  return [...allChars]
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      element: c.element,
      image_url: c.image_url,
    }));
}

async function HeaderWithData() {
  const characters = await getSortedCharacters();
  return <Header characters={characters} />;
}

async function SidebarCharactersWithData() {
  const characters = await getSortedCharacters();
  return <SidebarCharacters characters={characters} />;
}

function HeaderSkeleton() {
  return (
    <header className="bg-bg-primary pt-[env(safe-area-inset-top)] shadow-lg shadow-black/10">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[10px] bg-bg-card" />
          <div className="flex flex-col gap-1">
            <div className="h-2.5 w-16 rounded bg-bg-card" />
            <div className="h-3.5 w-32 rounded bg-bg-card" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-4 mr-2">
            <div className="h-4 w-12 rounded bg-bg-card" />
            <div className="h-4 w-10 rounded bg-bg-card" />
            <div className="h-4 w-10 rounded bg-bg-card" />
          </div>
          <div className="h-8 w-8 rounded-full bg-bg-card" />
          <div className="h-8 w-8 rounded-full bg-bg-card" />
        </div>
      </div>
      <div
        className="h-px w-full"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, rgba(224,90,168,0.4) 30%, rgba(240,138,154,0.3) 70%, transparent 100%)",
        }}
      />
    </header>
  );
}

function SidebarCharactersSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border-primary bg-bg-card p-3">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <div className="mb-2 h-3 w-16 rounded bg-bg-card-hover" />
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="aspect-square rounded-lg bg-bg-card-hover" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrickcalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <NavigationProgress />
      <ScrollToTop />
      <Suspense fallback={<HeaderSkeleton />}>
        <HeaderWithData />
      </Suspense>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-12 md:px-8 md:pt-6 md:pb-16 lg:grid lg:grid-cols-[1fr_240px] lg:gap-6">
        <main className="bg-bg-primary">{children}</main>
        <aside className="hidden lg:block">
          <Suspense fallback={<SidebarCharactersSkeleton />}>
            <SidebarCharactersWithData />
          </Suspense>
        </aside>
      </div>
      <Footer />
    </div>
  );
}
