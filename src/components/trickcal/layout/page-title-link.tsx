"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PageTitleLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

// 各メインページのタイトル用リンク。同じパスにいる時はフルリロード
// (Next.js の Link は同パスでデータ再取得のみで見た目に変化が出ない事故防止)
export function PageTitleLink({ href, className, children }: PageTitleLinkProps) {
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent) => {
    if (pathname === href) {
      e.preventDefault();
      window.location.reload();
    }
  };

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
