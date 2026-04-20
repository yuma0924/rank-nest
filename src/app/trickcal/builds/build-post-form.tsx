"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { StaticIcon } from "@/components/ui/static-icon";
import { CharacterIcon } from "@/components/character/character-icon";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn, matchesName } from "@/lib/utils";
import { ELEMENTS, ELEMENT_ICONS, BUILD_MODE_OPTIONS, POSITION_ICON_MAP } from "@/lib/constants";
import type { BuildMode } from "@/lib/constants";


type CharacterInfo = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  rarity: string | null;
  position: string | null;
  image_url: string | null;
  is_hidden: boolean;
};

interface BuildPostFormProps {
  mode?: BuildMode;
  onModeChange?: (mode: BuildMode) => void;
  onPosted: () => void;
  onClose?: () => void;
}



const POSITION_LABELS = ["後列", "中列", "前列"] as const;


function getPartySize(mode: BuildMode): number {
  return mode === "dimension" ? 9 : 6;
}

function getRowCount(): number {
  return 3;
}

// スロットインデックスからポジション列を取得
function getSlotColumn(slotIndex: number, rowCount: number): string {
  const colIdx = Math.floor(slotIndex / rowCount);
  return POSITION_LABELS[colIdx];
}

export function BuildPostForm({ mode: externalMode, onModeChange, onPosted, onClose }: BuildPostFormProps) {
  const [formMode, setBuildMode] = useState<BuildMode>(externalMode ?? "general");
  const [elementFilter, setElementFilter] = useState<string>("");
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [positionFilterManual, setPositionFilterManual] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formation, setFormation] = useState<(CharacterInfo | null)[]>(
    Array(6).fill(null)
  );
  const nameFieldRef = useRef<HTMLDivElement>(null);

  // 外部のモード変更を同期
  useEffect(() => {
    if (externalMode && externalMode !== formMode) {
      setBuildMode(externalMode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMode]);

  // 選択中のキャラ（スロットに配置する前の一時状態）
  const [selectedChar, setSelectedChar] = useState<CharacterInfo | null>(null);
  // 選択中のスロット（＋タップで選択、キャラタップで自動配置）
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // キャラ一覧
  const [allCharacters, setAllCharacters] = useState<CharacterInfo[]>([]);
  const [charsLoaded, setCharsLoaded] = useState(false);

  useEffect(() => {
    if (charsLoaded) return;
    async function loadCharacters() {
      try {
        const supabase = createBrowserClient();
        const { data } = await supabase
          .from("characters")
          .select("id, name, slug, element, rarity, position, image_url, is_hidden")
          .eq("is_hidden", false)
          .order("name");
        if (data) {
          const elementOrder = ["純粋", "冷静", "狂気", "活発", "憂鬱"];
          const rarityOrder = ["★3", "★2", "★1"];
          const sorted = data
            .map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              element: c.element,
              rarity: c.rarity,
              position: c.position,
              image_url: c.image_url,
              is_hidden: c.is_hidden,
            }))
            .sort((a, b) => {
              const ea = elementOrder.indexOf(a.element ?? "");
              const eb = elementOrder.indexOf(b.element ?? "");
              const elemDiff = (ea === -1 ? 999 : ea) - (eb === -1 ? 999 : eb);
              if (elemDiff !== 0) return elemDiff;
              const ra = rarityOrder.indexOf(a.rarity ?? "");
              const rb = rarityOrder.indexOf(b.rarity ?? "");
              return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
            });
          setAllCharacters(sorted);
        }
        setCharsLoaded(true);
      } catch {
        // ignore
      }
    }
    loadCharacters();
  }, [charsLoaded]);

  // モード変更時にformationリセット
  useEffect(() => {
    const size = getPartySize(formMode);
    setFormation(Array(size).fill(null));
    setSelectedChar(null);
    setSelectedSlot(null);
    setPositionFilter("");
    setPositionFilterManual(false);
  }, [formMode]);

  const partySize = getPartySize(formMode);
  const rowCount = getRowCount();

  // 配置済みキャラIDセット
  const placedIds = useMemo(
    () => new Set(formation.filter(Boolean).map((c) => c!.id)),
    [formation]
  );

  // フィルタ済みキャラ一覧
  const filteredCharacters = useMemo(() => {
    let result = allCharacters;
    if (elementFilter) {
      result = result.filter((c) => c.element === elementFilter);
    }
    if (positionFilter) {
      result = result.filter((c) => c.position === positionFilter);
    }
    if (searchQuery.trim()) {
      result = result.filter((c) => matchesName(c.name, searchQuery));
    }
    return result;
  }, [allCharacters, elementFilter, positionFilter, searchQuery]);

  // キャラグリッドタップ
  const handleCharacterTap = (char: CharacterInfo) => {
    // 既に配置済み → 配置から除去
    if (placedIds.has(char.id)) {
      setFormation((prev) =>
        prev.map((slot) => (slot?.id === char.id ? null : slot))
      );
      if (selectedChar?.id === char.id) {
        setSelectedChar(null);
      }
      return;
    }

    // スロットが選択されている → そのスロットに自動配置
    if (selectedSlot !== null) {
      const slotColumn = getSlotColumn(selectedSlot, rowCount);
      if (char.position && char.position !== slotColumn) {
        return; // ポジション不一致
      }
      setFormation((prev) => {
        const next = [...prev];
        next[selectedSlot] = char;
        return next;
      });
      setSelectedSlot(null);
      setSelectedChar(null);
      if (!positionFilterManual) setPositionFilter("");
      return;
    }

    // 既に選択中のキャラを再タップ → キャンセル
    if (selectedChar?.id === char.id) {
      setSelectedChar(null);
      return;
    }

    // 選択状態にする（スロットはまだ決まらない）
    setSelectedChar(char);
    setTimeout(() => {
      nameFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  // スロットタップ
  const handleSlotTap = (slotIndex: number) => {
    // 既にキャラがいるスロットをタップ → そのキャラを除去
    if (formation[slotIndex]) {
      setFormation((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
      return;
    }

    const slotColumn = getSlotColumn(slotIndex, rowCount);

    // スロットを選択してポジションフィルタをかける
    if (selectedSlot === slotIndex) {
      // 同じスロットを再タップ → 解除
      setSelectedSlot(null);
      setPositionFilter("");
      return;
    }

    setSelectedSlot(slotIndex);
    setSelectedChar(null);
    setPositionFilter(slotColumn);

    // キャラが既に選択されている場合は配置を試みる
    if (selectedChar) {
      if (!selectedChar.position || selectedChar.position === slotColumn) {
        setFormation((prev) => {
          const next = [...prev];
          next[slotIndex] = selectedChar;
          return next;
        });
        setSelectedChar(null);
        setSelectedSlot(null);
        if (!positionFilterManual) setPositionFilter("");
      }
    }
  };

  // キャラがスロットに配置可能か判定
  const canPlaceInSlot = (slotIndex: number): boolean => {
    if (!selectedChar) return false;
    if (formation[slotIndex]) return false;
    const slotColumn = getSlotColumn(slotIndex, rowCount);
    if (selectedChar.position && selectedChar.position !== slotColumn) {
      return false;
    }
    return true;
  };

  // キャラがその列に配置可能か判定（スロットの空き関係なく）
  const isMatchingColumn = (slotIndex: number): boolean => {
    if (!selectedChar) return false;
    const slotColumn = getSlotColumn(slotIndex, rowCount);
    if (selectedChar.position && selectedChar.position !== slotColumn) {
      return false;
    }
    return true;
  };

  // 全解除
  const handleClearAll = () => {
    setFormation(Array(partySize).fill(null));
    setSelectedChar(null);
    setSelectedSlot(null);
    setPositionFilter("");
    setPositionFilterManual(false);
  };

  // 投稿
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const filledCount = formation.filter(Boolean).length;
    if (filledCount === 0) {
      setError("キャラクターを1体以上選択してください");
      return;
    }

    if (!comment.trim()) {
      setError("コメントは必須です");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: formMode,
          members: formation.map((c) => c?.id ?? null),
          comment: comment.trim(),
          title: title.trim() || undefined,
          display_name: displayName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "投稿に失敗しました");
        return;
      }

      // リセット
      setFormation(Array(partySize).fill(null));
      setComment("");
      setTitle("");
      setDisplayName("");
      setSelectedChar(null);
      onPosted();
    } catch {
      setError("投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-border-primary bg-bg-card p-3 -mx-2 rounded-lg md:mx-0 md:rounded-2xl md:p-4">
      {/* ヘッダー */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">
          新しい編成を投稿
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-bg-tertiary hover:text-text-primary cursor-pointer"
            aria-label="閉じる"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* モード選択（モバイルのみ） */}
      <div className="mb-4 md:hidden">
        <div className="relative">
          <select
            value={formMode}
            onChange={(e) => {
              const newMode = e.target.value as BuildMode;
              setBuildMode(newMode);
              onModeChange?.(newMode);
            }}
            className="w-full appearance-none rounded-[14px] border border-border-primary bg-bg-card-alpha px-4 py-2.5 pr-9 text-sm font-bold text-text-primary cursor-pointer focus:border-accent focus:outline-none"
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
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 性格フィルター + 検索 */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* PC: モード選択 */}
            <div className="relative hidden md:block">
              <select
                value={formMode}
                onChange={(e) => {
                  const newMode = e.target.value as BuildMode;
                  setBuildMode(newMode);
                  onModeChange?.(newMode);
                }}
                className="appearance-none rounded-[12px] border border-border-primary bg-bg-card-alpha px-4 py-2 pr-9 text-sm font-bold text-text-primary cursor-pointer focus:border-accent focus:outline-none"
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
            <span className="hidden shrink-0 text-sm text-text-muted md:inline">性格</span>
            <div className="flex gap-1.5">
              {ELEMENTS.map((elem) => {
                const active = elementFilter === elem;
                return (
                  <button
                    key={elem}
                    type="button"
                    onClick={() =>
                      setElementFilter(elementFilter === elem ? "" : elem)
                    }
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
            <div className="h-6 w-px bg-[rgba(249,168,212,0.15)]" />
            <span className="hidden shrink-0 text-sm text-text-muted md:inline">配置</span>
            <div className="flex gap-1.5">
              {POSITION_LABELS.map((pos) => {
                const active = positionFilter === pos;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() =>
                    {
                      const next = positionFilter === pos ? "" : pos;
                      setPositionFilter(next);
                      setPositionFilterManual(!!next);
                    }
                    }
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-[10px] p-1.5 transition-colors cursor-pointer",
                      active
                        ? "bg-[rgba(56,189,248,0.15)] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
                        : "bg-bg-input"
                    )}
                    style={{
                      border: `1.2px solid ${active ? "rgba(56,189,248,0.4)" : "var(--border-primary)"}`,
                    }}
                    title={pos}
                  >
                    <StaticIcon
                      src={POSITION_ICON_MAP[pos]}
                      alt={pos}
                      width={20}
                      height={20}
                      className="h-5 w-5"
                    />
                  </button>
                );
              })}
            </div>
            {/* PC: 検索 */}
            <div className="hidden md:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="検索..."
                className="w-48 rounded-[12px] border border-border-primary bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          {/* モバイル: 検索 */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="キャラ名で検索..."
            className="w-full rounded-xl border border-border-primary bg-bg-input px-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none md:hidden"
          />
        </div>

        {/* PC: 上段ヘッダー（選択中案内 | カウンター+全解除） */}
        <div className="hidden md:flex md:items-center md:gap-4 md:mb-2 md:h-[60px]">
          <div className="flex-1">
            {selectedChar ? (
              <div className="flex items-center gap-2 rounded-xl border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.08)] px-3 py-2">
                <CharacterIcon
                  name={selectedChar.name}
                  imageUrl={selectedChar.image_url}
                  size="sm"
                  className="!h-10 !w-10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-bold text-text-primary">{selectedChar.name}</p>
                    {selectedChar.position && POSITION_ICON_MAP[selectedChar.position] && (
                      <StaticIcon src={POSITION_ICON_MAP[selectedChar.position]} alt={selectedChar.position} width={16} height={16} className="shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-text-muted">右のスロットをタップして配置</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedChar(null)}
                  className="shrink-0 text-xs text-text-muted hover:text-text-primary cursor-pointer"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="flex h-full items-center text-sm text-text-muted">キャラクターをタップして選択</div>
            )}
          </div>
          <div className="w-64 shrink-0">
            {selectedSlot === null && !selectedChar && (
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-text-secondary">
                  キャラクター選択<span className="text-[#f87171]">*</span>（{partySize}体）
                  <span className="ml-1 font-bold text-accent">
                    {formation.filter(Boolean).length}/{partySize}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-lg border border-border-primary bg-bg-inset px-2.5 py-1 text-[11px] font-bold text-text-muted transition-colors hover:border-[rgba(255,99,126,0.4)] hover:text-accent cursor-pointer"
                >
                  全解除
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PC: キャラ選択（左）+ 配置グリッド（右）横並び */}
        <div className="md:flex md:gap-4">
        <div className="md:flex-1">
        {/* キャラグリッド */}
        <div className="max-h-52 overflow-y-auto rounded-xl border border-border-primary bg-bg-inset p-2 md:max-h-80">
          {filteredCharacters.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">
              キャラクターが見つかりません
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-0.5 md:grid-cols-7 md:gap-0">
              {filteredCharacters.map((char) => {
                const isPlaced = placedIds.has(char.id);
                const isSelected = selectedChar?.id === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleCharacterTap(char)}
                    className={cn(
                      "relative flex flex-col items-center gap-0 rounded-lg p-0.5 md:p-px transition-all cursor-pointer",
                      isPlaced
                        ? "bg-[rgba(236,72,153,0.15)] border border-[rgba(244,114,182,0.4)]"
                        : isSelected
                          ? "bg-[rgba(56,189,248,0.15)] border border-[rgba(56,189,248,0.5)]"
                          : "hover:bg-[rgba(249,168,212,0.05)] border border-transparent"
                    )}
                  >
                    <CharacterIcon
                      name={char.name}
                      imageUrl={char.image_url}
                      size="md"
                      className="!h-14 !w-14"
                    />
                    <span className="max-w-14 truncate text-center text-[8px] font-bold text-text-tertiary">
                      {char.name}
                    </span>
                    {/* チェックマーク */}
                    {isPlaced && (
                      <div className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[8px] text-white">
                        <svg
                          className="h-2.5 w-2.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {/* モバイル: 選択カウンター + 全解除 */}
        {selectedSlot === null && !selectedChar && (
        <div className="flex items-center justify-between mt-4 md:hidden">
          <span className="text-xs text-text-secondary">
            キャラクター選択<span className="text-[#f87171]">*</span>（{partySize}体）
            <span className="ml-1 font-bold text-accent">
              {formation.filter(Boolean).length}/{partySize}
            </span>
          </span>
          <button
            type="button"
            onClick={handleClearAll}
            className="rounded-lg border border-border-primary bg-bg-inset px-2.5 py-1 text-[11px] font-bold text-text-muted transition-colors hover:border-[rgba(255,99,126,0.4)] hover:text-accent cursor-pointer"
          >
            全解除
          </button>
        </div>
        )}
        </div>{/* 左カラム閉じ */}

        {/* 配置グリッド（PC: 右カラム） */}
        <div className="mt-2 md:mt-0 md:w-64 md:shrink-0">
        <div className="overflow-hidden rounded-[14px] border border-border-primary">
          {/* 列ヘッダー */}
          <div className="grid grid-cols-3 bg-bg-inset">
            {POSITION_LABELS.map((label, i) => (
              <span
                key={label}
                className={cn(
                  "py-1.5 text-center text-[9px] font-bold text-text-tertiary",
                  i < 2 && "border-r border-border-secondary"
                )}
              >
                {label}
              </span>
            ))}
          </div>
          {/* スロット行 */}
          {Array.from({ length: rowCount }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className={cn(
                "grid grid-cols-3",
                rowIdx < rowCount - 1 &&
                  "border-b border-border-secondary"
              )}
            >
              {POSITION_LABELS.map((_, colIdx) => {
                const slotIndex = colIdx * rowCount + rowIdx;
                const char = formation[slotIndex] ?? null;
                const placeable = canPlaceInSlot(slotIndex);

                return (
                  <button
                    key={slotIndex}
                    type="button"
                    onClick={() => handleSlotTap(slotIndex)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-1.5 transition-all cursor-pointer",
                      colIdx < 2 &&
                        "border-r border-border-secondary",
                      selectedSlot === slotIndex && "bg-[rgba(56,189,248,0.15)]",
                      placeable && selectedSlot !== slotIndex && "bg-[rgba(56,189,248,0.08)]",
                      !placeable && isMatchingColumn(slotIndex) && char && "bg-[rgba(56,189,248,0.06)]",
                      !isMatchingColumn(slotIndex) && selectedChar && "opacity-30"
                    )}
                  >
                    {char ? (
                      <>
                        <CharacterIcon
                          name={char.name}
                          imageUrl={char.image_url}
                          size="md"
                          className="!h-14 !w-14"
                        />
                      </>
                    ) : (
                      <div
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-lg border-2 border-dashed",
                          placeable
                            ? "border-[rgba(56,189,248,0.5)] bg-[rgba(56,189,248,0.05)]"
                            : "border-border-primary"
                        )}
                      >
                        <svg
                          className="h-4 w-4 text-text-muted/40"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        </div>{/* 配置グリッド右カラム閉じ */}
        </div>{/* PC横並び閉じ */}

        {/* 編成名 + 名前（PC: 横並び） */}
        <div ref={nameFieldRef} className="flex flex-col gap-4 md:flex-row md:gap-6 md:max-w-[93%]">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <label className="w-12 shrink-0 text-sm text-text-secondary md:w-auto">
              編成名
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={BUILD_MODE_OPTIONS.find((o) => o.value === formMode)?.label ?? ""}
              maxLength={100}
              className="min-w-0 flex-1 rounded-xl border border-border-primary bg-bg-input px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <label className="w-12 shrink-0 text-sm text-text-secondary md:w-auto">
              名前
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="名無しの教主"
            maxLength={50}
            className="min-w-0 flex-1 rounded-xl border border-border-primary bg-bg-input px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
          />
          </div>
        </div>

        {/* コメント（必須） */}
        <div>
          <label className="mb-1 block text-sm text-text-secondary">
            コメント<span className="text-[#f87171]">*</span>
            <span className="ml-2 text-xs text-text-tertiary">
              {comment.length}/200
            </span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="この編成について入力"
            maxLength={200}
            rows={3}
            className="w-full rounded-xl border border-border-primary bg-bg-input px-3 py-3 text-base text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none resize-none"
          />
        </div>

        {error && <p className="text-sm text-thumbs-down">{error}</p>}

        <div className="space-y-2">
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "投稿中..." : "投稿する"}
          </Button>
        </div>
      </form>
    </div>
  );
}
