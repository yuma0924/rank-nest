import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HeaderSearch, type SearchCharacter } from "@/components/layout/header-search";
import { HeaderLogo } from "@/components/layout/header-logo";

interface HeaderProps {
  characters: SearchCharacter[];
}

export function Header({ characters }: HeaderProps) {
  return (
    <header className="bg-bg-primary pt-[env(safe-area-inset-top)] shadow-lg shadow-black/10">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-8">
        <HeaderLogo />
        <nav className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-4 mr-4">
            <Link href="/ranking" className="text-sm md:text-base text-text-secondary hover:text-text-primary transition-colors">
              ランキング
            </Link>
            <Link href="/tiers" className="text-sm md:text-base text-text-secondary hover:text-text-primary transition-colors">
              ティア
            </Link>
            <Link href="/builds" className="text-sm md:text-base text-text-secondary hover:text-text-primary transition-colors">
              編成
            </Link>
          </div>
          <HeaderSearch characters={characters} />
          <ThemeToggle />
        </nav>
      </div>
      {/* Gradient bottom border */}
      <div
        className="h-px w-full"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, rgba(224,90,168,0.4) 30%, rgba(240,138,154,0.3) 70%, transparent 100%)",
        }}
      />
    </header>
  );
}
