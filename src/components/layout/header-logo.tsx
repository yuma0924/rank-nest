"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderLogo() {
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent) => {
    if (pathname === "/trickcal") {
      e.preventDefault();
      window.location.reload();
    }
  };

  return (
    <Link href="/trickcal" onClick={handleClick} className="group flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="トリッカルランキング"
        width={32}
        height={32}
        sizes="32px"
        loading="eager"
        className="rounded-[10px]"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[9px] md:text-[11px] font-bold leading-none text-accent/80">
          みんなで決める！
        </span>
        <span className="text-[15px] md:text-lg font-bold leading-none text-text-primary">
          トリッカルランキング
        </span>
      </span>
    </Link>
  );
}
