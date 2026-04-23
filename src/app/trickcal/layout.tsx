import type { Metadata } from "next";
import { Header } from "@/components/trickcal/layout/header";
import { Footer } from "@/components/trickcal/layout/footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { SidebarCharacters } from "@/components/trickcal/layout/sidebar-characters";
import { SidebarRewards } from "@/components/trickcal/layout/sidebar-rewards";
import { getAllVisibleCharacters } from "@/lib/trickcal/cached-queries";

export const metadata: Metadata = {
  title: {
    default: "みんなで決めるトリッカルランキング",
    template: "%s | みんなで決めるトリッカルランキング",
  },
  description:
    "トリッカル・もちもちほっぺ大作戦の全キャラクター性能を数値で比較し、プレイヤーの投票でリアルな順位を決定する非公式データベースです。",
  openGraph: {
    type: "website",
    siteName: "みんなで決めるトリッカルランキング",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
};

export default async function TrickcalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const allChars = await getAllVisibleCharacters();
  const characters = [...allChars]
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      element: c.element,
      image_url: c.image_url,
    }));

  return (
    <div className="flex min-h-dvh flex-col">
      <NavigationProgress />
      <ScrollToTop />
      <Header characters={characters} />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-12 md:px-8 md:pt-6 md:pb-16 lg:grid lg:grid-cols-[1fr_240px] lg:gap-6">
        <main className="bg-bg-primary">{children}</main>
        <aside className="hidden lg:block">
          <div className="space-y-4">
            <SidebarCharacters characters={characters} />
            <SidebarRewards />
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}
