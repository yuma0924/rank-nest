import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.11.4", "192.168.11.19"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wtlowwvlnojahpiuixla.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // OG 画像生成 function に logo.png を同梱する。
  // serverless function のファイルシステムから fs.readFile で読み込むため必要。
  outputFileTracingIncludes: {
    "/trickcal/opengraph-image": ["./public/logo.png"],
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    viewTransition: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
