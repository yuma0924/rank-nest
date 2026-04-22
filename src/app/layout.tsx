import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

const GA_ID = "G-7R71E4VSZ0";

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
    default: "rank-nest - みんなで決めるゲームランキング",
    template: "%s | rank-nest",
  },
  description:
    "プレイヤーの投票で決まるゲームランキングポータル。複数ゲームのキャラ評価・編成・ティア表を集約。",
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
