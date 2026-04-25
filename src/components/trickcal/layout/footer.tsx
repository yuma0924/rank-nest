import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-bg-secondary pb-20">
      {/* Gradient top border */}
      <div
        className="h-px w-full"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, #e05aa8 30%, #f08a9a 70%, transparent 100%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-4 md:px-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="トリッカルランキング"
              width={28}
              height={28}
              sizes="28px"
              loading="eager"
              className="rounded-[10px]"
            />
            <span className="text-base md:text-lg font-bold text-text-primary">
              トリッカルランキング
            </span>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-text-tertiary">
            トリッカル・もちもちほっぺ大作戦の非公式ファンサイトです。みんなのキャラへの投票で人気ランキングが決まり、ティア表や編成を共有したり、コメントで語り合えます。
          </p>
          <Link
            href="/trickcal/guidelines"
            className="text-base font-medium text-text-tertiary transition-colors hover:text-accent"
          >
            ガイドライン・利用規約
          </Link>
          <div className="mt-2 w-full border-t border-border-secondary pt-4">
            <p className="text-xs md:text-sm text-text-muted">
              &copy; 2026 トリッカルランキング. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
