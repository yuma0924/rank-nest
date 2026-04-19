import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CharacterCardProps {
  slug: string;
  name: string;
  imageUrl: string | null;
  avgRating?: number | null;
  rank?: number | null;
  className?: string;
  lazy?: boolean;
}

export function CharacterCard({
  slug,
  name,
  imageUrl,
  avgRating,
  rank,
  className,
  lazy = false,
}: CharacterCardProps) {
  const rankDisplay = rank !== null && rank !== undefined;

  return (
    <Link
      href={`/characters/${slug}`}
      className={cn(
        "flex flex-col overflow-clip bg-bg-card shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)] transition-all hover:scale-[1.02] hover:brightness-110 cursor-pointer",
        className
      )}
    >
      <div className="relative bg-bg-tertiary">
        {imageUrl ? (
          lazy ? (
            <img
              src={imageUrl}
              alt={name}
              width={164}
              height={164}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full object-cover"
            />
          ) : (
            <Image
              src={imageUrl}
              alt={name}
              width={164}
              height={164}
              className="aspect-square w-full object-cover"
              sizes="(max-width: 768px) 25vw, 14vw"
              loading="eager"
              unoptimized
            />
          )
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-bg-tertiary text-sm text-text-muted">
            {name.charAt(0)}
          </div>
        )}
        {/* 順位バッジ (左上) */}
        {rankDisplay && rank !== null && rank !== undefined && (
          <div
            className={cn(
              "absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border shadow-[0px_10px_15px_rgba(0,0,0,0.1)]",
              rank === 1 && "bg-gradient-to-br from-[#fde68a] to-[#d97706] border-[#b45309]",
              rank === 2 && "bg-gradient-to-br from-[#e2e8f0] to-[#94a3b8] border-[#64748b]",
              rank === 3 && "bg-gradient-to-br from-[#fcd9b6] to-[#b4622c] border-[#92400e]",
              rank > 3 && "bg-bg-card-alpha border-border-primary"
            )}
          >
            <span
              className={cn(
                "text-[11px] md:text-[13px] font-black leading-none",
                rank <= 3 ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" : "text-text-tertiary"
              )}
            >
              {rank}
            </span>
          </div>
        )}
        {/* ★評価オーバーレイ (左下) */}
        {avgRating !== null && avgRating !== undefined && (
          <div
            className="absolute bottom-1 left-0.5 flex items-center justify-center gap-0.5 rounded-[10px] px-1.5 py-[1px] shadow-[0px_10px_15px_rgba(0,0,0,0.1)] bg-bg-card-alpha border border-border-primary"
          >
            <svg className="h-3 w-3 text-star" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="-translate-y-px text-[11px] md:text-xs font-bold leading-none text-star">
              {avgRating.toFixed(1)}
            </span>
          </div>
        )}
      </div>
      <div className="bg-bg-card-alpha-heavy px-1 py-1.5">
        <p className="truncate text-center text-[11px] md:text-xs font-bold leading-tight text-text-primary">
          {name}
        </p>
      </div>
    </Link>
  );
}
