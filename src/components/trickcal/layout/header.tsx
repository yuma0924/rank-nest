import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HeaderSearch, type SearchCharacter } from "@/components/trickcal/layout/header-search";
import { HeaderLogo } from "@/components/trickcal/layout/header-logo";
import { HeaderNav } from "@/components/trickcal/layout/header-nav";

interface HeaderProps {
  characters: SearchCharacter[];
}

export function Header({ characters }: HeaderProps) {
  return (
    <header className="bg-bg-primary pt-[env(safe-area-inset-top)] shadow-lg shadow-black/10">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-8">
        <HeaderLogo />
        <nav className="flex items-center gap-2">
          <HeaderNav />
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
