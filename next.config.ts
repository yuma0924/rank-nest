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
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    viewTransition: true,
  },
};

export default nextConfig;
