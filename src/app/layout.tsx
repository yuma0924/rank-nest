import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { JsonLd } from "@/components/seo/json-ld";
import "./globals.css";

const GA_ID = "G-7R71E4VSZ0";

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "rank-nest",
  alternateName: "みんなで決めるゲームキャラ・編成ランキング",
  url: "https://rank-nest.com",
  description:
    "みんなの投票で決まる、ゲームキャラ・編成のランキングポータル。複数ゲームのキャラ評価・編成・ティア表を集約。",
  inLanguage: "ja",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://rank-nest.com/trickcal?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const zenMaruGothic = Zen_Maru_Gothic({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-zen-maru-gothic",
  preload: false,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1523",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://rank-nest.com"),
  title: {
    default: "rank-nest - みんなで決めるゲームキャラ・編成ランキング",
    template: "%s | rank-nest",
  },
  description:
    "みんなの投票で決まる、ゲームキャラ・編成のランキングポータル。複数ゲームのキャラ評価・編成・ティア表を集約。",
  openGraph: {
    type: "website",
    siteName: "rank-nest",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`dark ${zenMaruGothic.variable}`} suppressHydrationWarning>
      <body className={zenMaruGothic.className}>
        {/* リロード時のスクロール位置を正しく保持する。
            ブラウザの自動復元は loading.tsx の短い高さに対して走るとズレるので、
            自前で sessionStorage に保存し、コンテンツ完成後に復元する。
            ・beforeInteractive で React より前に scrollRestoration='manual' をセット
            ・load 後に保存済み Y へ複数回スクロール（画像ロード等で高さが伸びるのに追従）
            ・通常のバック/フォワードには影響しない（reload の場合だけ manual 化）
        */}
        <Script id="reload-scroll-fix" strategy="beforeInteractive">
          {`(function(){try{var n=performance.getEntriesByType('navigation')[0];var isReload=n&&n.type==='reload';var key='rl-y:'+location.pathname+location.search;function save(){try{sessionStorage.setItem(key,String(window.scrollY||window.pageYOffset||0));}catch(e){}}window.addEventListener('scroll',save,{passive:true});window.addEventListener('pagehide',save);if(isReload&&'scrollRestoration' in history){history.scrollRestoration='manual';var saved=parseInt(sessionStorage.getItem(key)||'0',10);if(saved>0){var attempts=0;var tryRestore=function(){window.scrollTo(0,saved);attempts++;if(Math.abs((window.scrollY||0)-saved)>4&&attempts<20){setTimeout(tryRestore,80);}};window.addEventListener('DOMContentLoaded',tryRestore);window.addEventListener('load',tryRestore);}}}catch(e){}})();`}
        </Script>
        <JsonLd data={websiteSchema} />
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.NODE_ENV === "production" && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
