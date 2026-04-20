import type { Metadata } from "next";
import { Header } from "@/components/trickcal/layout/header";
import { Footer } from "@/components/trickcal/layout/footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { SidebarCharacters } from "@/components/trickcal/layout/sidebar-characters";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const supabase = createAdminClient();
  const { data: characters } = await supabase
    .from("characters")
    .select("id, slug, name, element, image_url")
    .eq("is_hidden", false)
    .order("name");

  return (
    <div className="flex min-h-dvh flex-col">
      <NavigationProgress />
      <ScrollToTop />
      <Header characters={characters ?? []} />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-12 md:px-8 md:pt-6 md:pb-16 lg:grid lg:grid-cols-[1fr_240px] lg:gap-6">
        <main className="bg-bg-primary">{children}</main>
        <aside className="hidden lg:block">
          <div className="space-y-4">
            <div className="flex h-[600px] items-center justify-center rounded-2xl border border-border-primary bg-bg-card">
              <span className="text-xs text-text-muted">AD</span>
            </div>
            <SidebarCharacters characters={characters ?? []} />
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}
