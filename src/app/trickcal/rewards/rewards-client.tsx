"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CharacterCard } from "@/components/trickcal/character/character-card";
import { StaticIcon } from "@/components/ui/static-icon";
import { cn } from "@/lib/utils";
import type { RewardItem } from "./page";

interface Props {
  items: RewardItem[];
}

export function RewardsClient({ items }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openItemId = searchParams.get("item");

  const openItem = useMemo(
    () => (openItemId ? items.find((i) => i.id === openItemId) ?? null : null),
    [items, openItemId]
  );

  const setOpen = useCallback(
    (itemId: string | null) => {
      const params = new URLSearchParams(searchParams);
      if (itemId) params.set("item", itemId);
      else params.delete("item");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/trickcal/rewards", { scroll: false });
    },
    [router, searchParams]
  );

  const renderItemButton = (item: RewardItem) => {
    const isOpen = openItemId === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setOpen(isOpen ? null : item.id)}
        title={item.name}
        aria-label={item.name}
        className={cn(
          "group relative aspect-square rounded-md transition-all",
          isOpen
            ? "ring-2 ring-star ring-offset-1 ring-offset-bg-primary"
            : "hover:brightness-110"
        )}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            width={96}
            height={96}
            loading="lazy"
            className="h-full w-full rounded-md object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md bg-bg-tertiary text-xs text-text-muted">
            ?
          </div>
        )}
        {/* デスクトップのホバーツールチップ */}
        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-bg-input px-2 py-1 text-[11px] text-text-tertiary shadow-lg group-hover:block">
          {item.name}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <div>
        <h1 className="text-lg font-bold text-text-primary md:text-xl">
          アルバイト報酬から探す
        </h1>
        <p className="text-[11px] text-text-tertiary md:text-xs">
          素材アイコンを<span className="md:hidden">タップ</span><span className="hidden md:inline">クリック</span>して、獲得できるキャラを表示。
        </p>
      </div>

      {/* 展開パネル（グリッドの上） */}
      {openItem && (
        <div className="rounded-[12px] border border-star/40 bg-bg-card-alpha-lighter p-3 md:p-4">
          <div className="mb-2.5 flex items-center gap-2">
            {openItem.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={openItem.imageUrl}
                alt={openItem.name}
                width={80}
                height={80}
                className="h-10 w-10 shrink-0 rounded-md"
              />
            )}
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">
              {openItem.name}
            </p>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-bg-input hover:text-text-primary"
              aria-label="閉じる"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {openItem.characters.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">
              この報酬を獲得できるキャラはまだ登録されていません
            </p>
          ) : (
            <div className="grid max-h-[220px] grid-cols-5 gap-1.5 overflow-y-auto pl-1.5 pr-1 pt-1.5 md:max-h-none md:grid-cols-8 md:gap-2 md:overflow-visible md:p-0">
              {openItem.characters.map((c) => (
                <div key={c.id} className="relative">
                  <CharacterCard
                    slug={c.slug}
                    name={c.name}
                    imageUrl={c.imageUrl}
                    lazy
                  />
                  {c.isPriority && (
                    <StaticIcon
                      src="/icons/good.png"
                      alt="優先報酬"
                      width={40}
                      height={40}
                      className="pointer-events-none absolute -left-1.5 -top-1.5 z-10 h-7 w-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] md:h-10 md:w-10"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* アイテムグリッド: モバイルは3行×横スクロール、PCは12列 */}
      <div className="relative -mx-4 md:mx-0">
        <div className="overflow-x-auto px-4 pb-2 pt-1.5 md:overflow-visible md:px-0 md:pb-0 md:pt-0">
          <div className="grid grid-flow-col grid-rows-3 auto-cols-[3.5rem] gap-1.5 md:grid-flow-row md:grid-rows-none md:grid-cols-12 md:auto-cols-auto">
            {items.map(renderItemButton)}
          </div>
        </div>
        {/* 右端のフェード（横スクロール可能を示唆） */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg-primary to-transparent md:hidden"
        />
      </div>

      {/* 他のページもチェック */}
      <section className="!mt-10 space-y-3">
        <p className="text-xs md:text-sm font-bold text-text-tertiary">他のページもチェック</p>
        <Link
          href="/trickcal/ranking"
          className="flex items-center gap-3 rounded-[14px] bg-gradient-to-r from-[rgba(255,185,0,0.15)] to-[rgba(255,99,126,0.15)] border border-[rgba(255,185,0,0.1)] px-4 py-3 transition-colors hover:from-[rgba(255,185,0,0.25)] hover:to-[rgba(255,99,126,0.25)] cursor-pointer"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
            style={{ backgroundImage: "linear-gradient(135deg, #ffb900, #e87080)" }}
          >
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
            </svg>
          </span>
          <div className="flex-1">
            <span className="block text-sm md:text-base font-bold text-text-primary">人気キャラランキング</span>
            <span className="text-[10px] md:text-xs text-text-muted">投票で決まる最強キャラをチェック</span>
          </div>
          <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          href="/trickcal/tiers"
          className="flex items-center gap-3 rounded-[14px] bg-gradient-to-r from-[rgba(144,72,212,0.15)] to-[rgba(212,64,138,0.15)] border border-[rgba(144,72,212,0.1)] px-4 py-3 transition-colors hover:from-[rgba(144,72,212,0.25)] hover:to-[rgba(212,64,138,0.25)] cursor-pointer"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
            style={{ backgroundImage: "linear-gradient(135deg, #9048d4, #d4408a)" }}
          >
            <svg className="h-5 w-5 text-white" viewBox="0 0 16 16" fill="none">
              <rect x="0" y="0.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="0.5" width="12" height="3" rx="0.5" fill="white" />
              <rect x="0" y="4.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="4.5" width="9" height="3" rx="0.5" fill="white" />
              <rect x="0" y="8.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="8.5" width="6" height="3" rx="0.5" fill="white" />
              <rect x="0" y="12.5" width="3" height="3" rx="0.5" fill="white" opacity="0.7" />
              <rect x="4" y="12.5" width="4" height="3" rx="0.5" fill="white" />
            </svg>
          </span>
          <div className="flex-1">
            <span className="block text-sm md:text-base font-bold text-text-primary">みんなのティア表</span>
            <span className="text-[10px] md:text-xs text-text-muted">キャラをランク付けして共有</span>
          </div>
          <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          href="/trickcal/builds"
          className="flex items-center gap-3 rounded-[14px] bg-gradient-to-r from-[rgba(59,130,246,0.15)] to-[rgba(6,182,212,0.15)] border border-[rgba(59,130,246,0.1)] px-4 py-3 transition-colors hover:from-[rgba(59,130,246,0.25)] hover:to-[rgba(6,182,212,0.25)] cursor-pointer"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
            style={{ backgroundImage: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </span>
          <div className="flex-1">
            <span className="block text-sm md:text-base font-bold text-text-primary">人気編成ランキング</span>
            <span className="text-[10px] md:text-xs text-text-muted">人気のパーティ編成をチェックしよう</span>
          </div>
          <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
