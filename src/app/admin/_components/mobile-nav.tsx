"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/characters", label: "キャラ管理" },
  { href: "/admin/items", label: "アイテム管理" },
  { href: "/admin/builds", label: "編成管理" },
  { href: "/admin/comments", label: "コメント管理" },
  { href: "/admin/reports", label: "通報管理" },
  { href: "/admin/blacklist", label: "BAN管理" },
  { href: "/admin/settings", label: "サイト設定" },
] as const;

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const currentPage =
    navItems.find((item) =>
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(item.href)
    )?.label ?? "管理ダッシュボード";

  return (
    <div className="lg:hidden">
      {/* ヘッダーバー */}
      <div className="flex items-center justify-between border-b border-border-primary bg-bg-secondary px-4 py-3">
        <div>
          <span className="text-xs text-text-tertiary">管理ダッシュボード</span>
          <span className="ml-2 text-sm font-bold text-text-primary">
            {currentPage}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer rounded-lg p-1.5 text-text-secondary hover:bg-bg-tertiary"
          aria-label="メニューを開く"
        >
          {isOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="border-b border-border-primary bg-bg-secondary px-2 py-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                )}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="my-1 border-t border-border-secondary" />

          <Link
            href="/trickcal"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          >
            サイトへ戻る
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-tertiary hover:text-thumbs-down"
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
