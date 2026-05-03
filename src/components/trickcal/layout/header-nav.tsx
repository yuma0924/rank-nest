"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/trickcal/ranking",
    label: "ランキング",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
      </svg>
    ),
  },
  {
    href: "/trickcal/tiers",
    label: "ティア",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
        <rect x="0" y="0.5" width="3" height="3" rx="0.5" opacity="0.6" />
        <rect x="4" y="0.5" width="12" height="3" rx="0.5" />
        <rect x="0" y="4.5" width="3" height="3" rx="0.5" opacity="0.6" />
        <rect x="4" y="4.5" width="9" height="3" rx="0.5" />
        <rect x="0" y="8.5" width="3" height="3" rx="0.5" opacity="0.6" />
        <rect x="4" y="8.5" width="6" height="3" rx="0.5" />
        <rect x="0" y="12.5" width="3" height="3" rx="0.5" opacity="0.6" />
        <rect x="4" y="12.5" width="4" height="3" rx="0.5" />
      </svg>
    ),
  },
  {
    href: "/trickcal/builds",
    label: "編成",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
      </svg>
    ),
  },
];

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <div className="mr-4 hidden items-center gap-4 md:flex">
      {NAV_ITEMS.map((item) => {
        const active = pathname?.startsWith(item.href) ?? false;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-1.5 text-sm md:text-base transition-colors",
              active
                ? "text-accent after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-[#e05aa8] after:to-[#f08a9a]"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
