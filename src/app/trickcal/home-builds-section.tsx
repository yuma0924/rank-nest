"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { StaticIcon } from "@/components/ui/static-icon";
import { cn } from "@/lib/utils";
import { ELEMENT_ICONS, BUILD_MODE_OPTIONS, BUILD_MODE_LABEL_MAP } from "@/lib/trickcal/constants";
import type { BuildMode } from "@/lib/trickcal/constants";

function readBuildFiltersFromURL() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return {
    mode: (params.get("bmode") as BuildMode) || "general",
    element: params.get("belement") || null,
  };
}

function writeBuildFiltersToURL(mode: BuildMode, element: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (mode === "general") params.delete("bmode"); else params.set("bmode", mode);
  if (element) params.set("belement", element); else params.delete("belement");
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}



interface CharInfo {
  name: string;
  element: string | null;
  imageUrl: string | null;
}

interface BuildData {
  id: string;
  mode: string | null;
  members: (string | null)[];
  elementLabel: string | null;
  title: string | null;
  displayName: string | null;
  comment: string | null;
  likesCount: number;
  dislikesCount: number;
  commentCount: number;
  memberElements: string[];
}

interface HomeuildsSectionProps {
  builds: BuildData[];
  charMap: Record<string, CharInfo>;
}

const PREVIEW_COUNT = 2;

export function HomeBuildsSection({ builds, charMap }: HomeuildsSectionProps) {
  const [modeFilter, setModeFilterRaw] = useState<BuildMode>("general");
  const [elementFilter, setElementFilterRaw] = useState<string | null>(null);

  // URLからフィルター復元（初回マウント時）— HomeSearchSectionと同じパターン
  useEffect(() => {
    const saved = readBuildFiltersFromURL();
    if (!saved) return;
    setModeFilterRaw(saved.mode);
    setElementFilterRaw(saved.element);
  }, []);

  // フィルター変更時にURL更新
  const syncURL = useCallback(() => {
    writeBuildFiltersToURL(modeFilter, elementFilter);
  }, [modeFilter, elementFilter]);

  useEffect(() => {
    syncURL();
  }, [syncURL]);

  const setModeFilter = useCallback((m: BuildMode) => {
    setModeFilterRaw(m);
    setElementFilterRaw(null);
  }, []);

  const setElementFilter = useCallback((elem: string | null) => {
    setElementFilterRaw(elem);
  }, []);

  const filtered = useMemo(() => {
    let result = builds.filter((b) => b.mode === modeFilter);
    if (elementFilter) {
      result = result.filter((b) => b.memberElements.includes(elementFilter));
    }
    return result.slice(0, PREVIEW_COUNT);
  }, [builds, modeFilter, elementFilter]);

  return (
    <div className="space-y-3">
      {/* フィルター: プルダウン + 属性 */}
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="relative shrink-0">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as BuildMode)}
            className="appearance-none rounded-[14px] border border-border-primary bg-bg-card-alpha px-4 py-2.5 pr-9 text-sm font-bold text-text-primary cursor-pointer focus:border-accent/50 focus:outline-none lg:w-48"
          >
            {BUILD_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* 属性フィルター */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide lg:gap-2">
          {Object.keys(ELEMENT_ICONS).map((elem) => {
            const active = elementFilter === elem;
            return (
              <button
                key={elem}
                onClick={() => setElementFilter(elementFilter === elem ? null : elem)}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-[10px] p-1.5 transition-colors cursor-pointer",
                  active
                    ? "bg-[rgba(255,99,126,0.15)] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
                    : "bg-bg-input"
                )}
                style={{
                  border: `1.2px solid ${active ? "rgba(255,99,126,0.4)" : "var(--border-primary)"}`,
                }}
                title={elem}
              >
                <StaticIcon
                  src={ELEMENT_ICONS[elem]}
                  alt={elem}
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 編成リスト */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          該当する編成がありません
        </p>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {filtered.map((build) => {
            const uniqueElements = [...new Set(build.memberElements)];
            // 9スロット固定配列からスロット位置を再現
            const slots = [...build.members];
            while (slots.length < 9) slots.push(null);
            const rowCount = 3;
            const hasContent = (rowIdx: number) =>
              [0, 1, 2].some((colIdx) => slots[colIdx * rowCount + rowIdx] !== null);

            return (
              <Link
                key={build.id}
                href={`/trickcal/builds/${build.id}`}
                className="block rounded-2xl border border-border-primary bg-gradient-to-b from-bg-card-alpha to-bg-card-alpha-lighter p-4 transition-colors hover:from-bg-card-alpha hover:to-bg-card-alpha-light cursor-pointer"
              >
                {/* タイトル + 属性アイコン + モード */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-bold text-text-primary">
                    {build.title || (build.mode ? (BUILD_MODE_LABEL_MAP[build.mode as BuildMode] ?? build.mode) : "")}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {uniqueElements.map((elem) => (
                      ELEMENT_ICONS[elem] ? (
                        <StaticIcon
                          key={elem}
                          src={ELEMENT_ICONS[elem]}
                          alt={elem}
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px]"
                        />
                      ) : null
                    ))}
                    {build.mode && (
                      <span className="rounded-md bg-bg-card-alpha-light px-2 py-0.5 text-[10px] font-bold text-text-muted">
                        {BUILD_MODE_LABEL_MAP[build.mode as BuildMode] ?? build.mode}
                      </span>
                    )}
                  </div>
                </div>

                {/* キャラ編成グリッド */}
                <div className="mb-2 overflow-hidden rounded-[14px] border border-border-primary">
                  <div className="grid grid-cols-3 bg-bg-inset">
                    <span className="border-r border-border-primary py-1 text-center text-[10px] font-bold text-text-tertiary">後列</span>
                    <span className="border-r border-border-primary py-1 text-center text-[10px] font-bold text-text-tertiary">中列</span>
                    <span className="py-1 text-center text-[10px] font-bold text-text-tertiary">前列</span>
                  </div>
                  {Array.from({ length: rowCount }).map((_, rowIdx) => {
                    const empty = !hasContent(rowIdx);
                    return (
                      <div key={rowIdx} className={cn("grid grid-cols-3", "border-b border-border-primary last:border-b-0", empty && "hidden md:grid")}>
                        {[0, 1, 2].map((colIdx) => {
                          const mId = slots[colIdx * rowCount + rowIdx];
                          const char = mId ? charMap[mId] : null;
                          return (
                            <div key={colIdx} className={cn(
                              "flex flex-col items-center gap-0.5 pt-2 pb-1.5",
                              colIdx < 2 && "border-r border-border-primary"
                            )}>
                              {char ? (
                                <>
                                  <div className="h-12 w-12 overflow-hidden rounded-lg bg-bg-tertiary">
                                    {char.imageUrl ? (
                                      <Image src={char.imageUrl} alt={char.name} width={96} height={96} className="h-full w-full object-cover" loading="eager" unoptimized />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-bg-tertiary text-xs text-text-muted">{char.name.charAt(0)}</div>
                                    )}
                                  </div>
                                  <span className="max-w-20 truncate text-center text-[10px] font-bold text-text-tertiary">{char.name}</span>
                                </>
                              ) : (
                                <>
                                  <div className="h-12 w-12" />
                                  <span className="text-[10px]">&nbsp;</span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* コメント */}
                {build.comment && (
                  <div className="mx-0.5 mb-1 flex flex-col rounded-[10px] bg-bg-inset border border-border-secondary px-2.5 py-2 min-h-[76px]">
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-text-primary">
                      {build.comment}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-1">
                      {build.displayName && (
                        <span className="text-[10px] text-text-muted">
                          — {build.displayName}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-thumbs-up">
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
                        </svg>
                        {build.likesCount}
                      </span>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
