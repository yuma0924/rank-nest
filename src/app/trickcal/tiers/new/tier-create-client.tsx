"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { StaticIcon } from "@/components/ui/static-icon";
import { TIER_LABELS, ELEMENTS, ELEMENT_ICONS } from "@/lib/constants";
import type { TierLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { TierRow } from "@/components/tier/tier-row";
import { TierCharacterItem } from "@/components/tier/tier-character-item";
import { CharacterIcon } from "@/components/character/character-icon";
import { Button } from "@/components/ui/button";


type CharacterInfo = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  image_url: string | null;
};

type TierState = Record<TierLabel | "unassigned", string[]>;

interface TierCreateClientProps {
  characters: CharacterInfo[];
}

export function TierCreateClient({ characters }: TierCreateClientProps) {
  const router = useRouter();
  const charMap = new Map(characters.map((c) => [c.id, c]));

  const [tierState, setTierState] = useState<TierState>({
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
    unassigned: characters.map((c) => c.id),
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フィルター
  const [elementFilter, setElementFilter] = useState<string | null>("純粋");

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const findContainer = useCallback(
    (id: string): TierLabel | "unassigned" | null => {
      for (const [key, items] of Object.entries(tierState)) {
        if (items.includes(id)) {
          return key as TierLabel | "unassigned";
        }
      }
      return null;
    },
    [tierState]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = () => {
    // ドラッグ中は移動しない（ドロップ時に確定）
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    if (!activeContainer) return;

    let overContainer: TierLabel | "unassigned" | null = null;
    const allContainerKeys = [...TIER_LABELS, "unassigned"] as const;
    if ((allContainerKeys as readonly string[]).includes(over.id as string)) {
      overContainer = over.id as TierLabel | "unassigned";
    } else {
      overContainer = findContainer(over.id as string);
    }

    if (!overContainer) return;

    if (activeContainer !== overContainer) {
      // 異なるコンテナへ移動
      setTierState((prev) => {
        const activeItems = [...prev[activeContainer]];
        const overItems = [...prev[overContainer]];

        const activeIndex = activeItems.indexOf(active.id as string);
        activeItems.splice(activeIndex, 1);

        const overId = over.id as string;
        const overIndex = overItems.indexOf(overId);
        if (overIndex >= 0) {
          overItems.splice(overIndex, 0, active.id as string);
        } else {
          overItems.push(active.id as string);
        }

        return {
          ...prev,
          [activeContainer]: activeItems,
          [overContainer]: overItems,
        };
      });
      return;
    }

    // 同一コンテナ内での並べ替え
    if (activeContainer === overContainer) {
      setTierState((prev) => {
        const items = [...prev[activeContainer]];
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          items.splice(oldIndex, 1);
          items.splice(newIndex, 0, active.id as string);
        }

        return { ...prev, [activeContainer]: items };
      });
    }
  };

  const handleSubmit = async () => {
    setError(null);

    const data: Record<string, string[]> = {};
    let totalChars = 0;
    for (const label of TIER_LABELS) {
      if (tierState[label].length > 0) {
        data[label] = tierState[label];
        totalChars += tierState[label].length;
      }
    }

    const errors: string[] = [];
    if (!title.trim()) errors.push("タイトルを入力してください");
    if (totalChars === 0) errors.push("キャラクターを1体以上配置してください");
    if (errors.length > 0) {
      setError(errors.join("\n"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          title: title.trim() || undefined,
          display_name: displayName.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "投稿に失敗しました");
        return;
      }

      router.push(`/trickcal/tiers/${result.tier.id}`);
    } catch {
      setError("投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  // フィルタリングされた unassigned キャラ
  const filteredUnassigned = tierState.unassigned.filter((id) => {
    const char = charMap.get(id);
    if (!char) return false;
    if (elementFilter && char.element !== elementFilter) return false;
    return true;
  });

  const activeChar = activeId ? charMap.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      autoScroll={{ threshold: { x: 0.1, y: 0.15 }, acceleration: 5 }}
    >
      <div
        className="space-y-4 select-none"
        style={{ WebkitTouchCallout: "none" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 投稿フォーム */}
        <div className="space-y-2.5 rounded-2xl border border-border-primary bg-bg-card p-3.5 md:max-w-2xl">
          <div className="grid gap-2.5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                タイトル<span className="text-[#f87171]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ティアのタイトル"
                maxLength={100}
                className="w-full rounded-xl border border-border-primary bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                投稿者名（任意）
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="名無しの教主"
                maxLength={50}
                className="w-full rounded-xl border border-border-primary bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">
              コメント（任意）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このティアについてのコメント"
              maxLength={1000}
              rows={2}
              className="w-full resize-y rounded-xl border border-border-primary bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* ティア行 */}
        <div className="overflow-hidden rounded-2xl border border-border-primary bg-gradient-to-b from-bg-card-alpha to-bg-card-alpha-lighter">
          {TIER_LABELS.map((label) => (
            <TierRow
              key={label}
              label={label}
              characters={tierState[label].map((id) => {
                const c = charMap.get(id);
                return {
                  id,
                  name: c?.name ?? "不明",
                  image_url: c?.image_url ?? null,
                };
              })}
              isDraggable
              iconClassName="h-14 w-14"
            />
          ))}
        </div>

        {/* 未配置キャラパネル */}
        <UnassignedPanel
          filteredIds={filteredUnassigned}
          allUnassignedIds={tierState.unassigned}
          charMap={charMap}
          elementFilter={elementFilter}
          onElementFilterChange={setElementFilter}
          hasAssigned={tierState.unassigned.length < characters.length}
          onResetAll={() => {
            setTierState({
              S: [], A: [], B: [], C: [], D: [], E: [],
              unassigned: characters.map((c) => c.id),
            });
          }}
        />

        {/* 投稿ボタン */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className={cn(
            "w-full py-3",
            !submitting && (!title.trim() || tierState.unassigned.length === characters.length) && "opacity-50"
          )}
        >
          {submitting ? "投稿中..." : "ティアを投稿する"}
        </Button>
        {!submitting && (!title.trim() || tierState.unassigned.length === characters.length) && (
          <div className="space-y-0.5 px-4">
            {!title.trim() && (
              <p className="text-xs text-text-muted">※ タイトルを入力してください</p>
            )}
            {tierState.unassigned.length === characters.length && (
              <p className="text-xs text-text-muted">※ キャラクターを1体以上配置してください</p>
            )}
          </div>
        )}
        {error && (
          <div className="space-y-0.5 px-4">
            {error.split("\n").map((line) => (
              <p key={line} className="text-sm text-thumbs-down">※ {line}</p>
            ))}
          </div>
        )}

        {/* ティア一覧へ戻る */}
        <Link
          href="/trickcal/tiers"
          className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-border-primary bg-gradient-to-b from-bg-card-alpha to-bg-card-alpha-lighter py-3 text-sm font-medium text-text-primary transition-colors hover:from-bg-card-alpha hover:to-bg-card-alpha-light"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
            <rect x="0" y="0.5" width="3" height="3" rx="0.5" fill="#ef4444" />
            <rect x="4" y="0.5" width="12" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
            <rect x="0" y="4.5" width="3" height="3" rx="0.5" fill="#f97316" />
            <rect x="4" y="4.5" width="9" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
            <rect x="0" y="8.5" width="3" height="3" rx="0.5" fill="#eab308" />
            <rect x="4" y="8.5" width="6" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
            <rect x="0" y="12.5" width="3" height="3" rx="0.5" fill="#22c55e" />
            <rect x="4" y="12.5" width="4" height="3" rx="0.5" fill="currentColor" className="text-text-muted" />
          </svg>
          みんなのティア表に戻る
        </Link>
      </div>

      {/* ドラッグオーバーレイ */}
      <DragOverlay>
        {activeChar && (
          <div className="brightness-50">
            <CharacterIcon
              name={activeChar.name}
              imageUrl={activeChar.image_url}
              size="md"
              className="h-14 w-14"
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function UnassignedPanel({
  filteredIds,
  allUnassignedIds,
  charMap,
  elementFilter,
  onElementFilterChange,
  hasAssigned,
  onResetAll,
}: {
  filteredIds: string[];
  allUnassignedIds: string[];
  charMap: Map<string, { id: string; name: string; element: string | null; image_url: string | null }>;
  elementFilter: string | null;
  onElementFilterChange: (v: string | null) => void;
  hasAssigned: boolean;
  onResetAll: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned" });

  return (
    <div
      className="rounded-2xl border border-border-primary bg-gradient-to-b from-bg-card-alpha to-bg-card-alpha-lighter"
      style={{
        backgroundColor: isOver ? "rgba(251, 100, 182, 0.05)" : undefined,
      }}
    >
      {/* キャラグリッド（ティア行に最も近い位置） */}
      <div
        ref={setNodeRef}
        className="grid grid-cols-6 gap-1.5 px-3 pt-3 md:grid-cols-10"
      >
        <SortableContext items={filteredIds} strategy={rectSortingStrategy}>
          {filteredIds.map((id) => {
            const char = charMap.get(id);
            if (!char) return null;
            return (
              <TierCharacterItem
                key={id}
                id={id}
                name={char.name}
                imageUrl={char.image_url}
                isDraggable
                showName={false}
                size="md"
                iconClassName="h-14 w-14"
              />
            );
          })}
        </SortableContext>
        {filteredIds.length === 0 && (
          <div className="col-span-full py-4 text-center text-xs text-text-muted">
            {allUnassignedIds.length === 0
              ? "全キャラを配置済み"
              : "条件に一致するキャラがいません"}
          </div>
        )}
      </div>

      {/* フッター行: フィルター + ラベル + 全解除 */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-3">
        <div className="flex gap-1.5">
          {ELEMENTS.map((el) => {
            const active = elementFilter === el;
            return (
              <button
                key={el}
                onClick={() => { if (!active) onElementFilterChange(el); }}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-[10px] p-1.5 transition-colors cursor-pointer",
                  active
                    ? "bg-[rgba(255,99,126,0.15)] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]"
                    : "bg-bg-input"
                )}
                style={{
                  border: `1.2px solid ${active ? "rgba(255,99,126,0.4)" : "var(--border-primary)"}`,
                }}
                title={el}
              >
                <StaticIcon
                  src={ELEMENT_ICONS[el]}
                  alt={el}
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              </button>
            );
          })}
        </div>
        <span className="text-xs text-text-muted">
          未配置 ({allUnassignedIds.length})
        </span>
        <div className="ml-auto">
          {hasAssigned && (
            <button
              onClick={onResetAll}
              className="rounded-lg border border-border-primary bg-bg-tertiary px-2.5 py-1 text-xs text-text-muted hover:text-thumbs-down hover:border-thumbs-down/30 transition-colors cursor-pointer"
            >
              全解除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
