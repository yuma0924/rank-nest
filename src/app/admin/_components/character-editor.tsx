"use client";

import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from "react";
import type { Character, Item } from "@/types/trickcal";
import { matchesName } from "@/lib/utils";

interface RelicData {
  name: string;
  image_url: string | null;
  description: string;
  params: string;
}

type EditableField = {
  key: keyof Character | string;
  label: string;
  type: "text" | "select" | "checkbox" | "number" | "json";
  options?: string[];
  width: string;
};

const FIELDS: EditableField[] = [
  { key: "name", label: "名前", type: "text", width: "w-32" },
  { key: "slug", label: "スラッグ", type: "text", width: "w-28" },
  { key: "rarity", label: "レア", type: "select", options: ["★1", "★2", "★3"], width: "w-16" },
  { key: "element", label: "性格", type: "select", options: ["純粋", "冷静", "狂気", "活発", "憂鬱"], width: "w-16" },
  { key: "role", label: "役割", type: "select", options: ["守備", "攻撃", "支援"], width: "w-16" },
  { key: "race", label: "種族", type: "select", options: ["妖精", "獣人", "エルフ", "精霊", "幽霊", "竜族", "魔女", "???"], width: "w-20" },
  { key: "position", label: "配置", type: "select", options: ["前列", "中列", "後列"], width: "w-16" },
  { key: "attack_type", label: "攻撃タイプ", type: "select", options: ["物理", "魔法"], width: "w-16" },
  { key: "is_hidden", label: "非表示", type: "checkbox", width: "w-12" },
];


type SkillCategory = "low_grade" | "high_grade" | "passive" | "normal_attack_basic" | "normal_attack_enhanced";

interface SkillData {
  category: SkillCategory;
  name?: string;
  cooltime?: number;
  description: string;
  params?: string;
}

const SKILL_SLOTS: {
  category: SkillCategory;
  label: string;
  hasName: boolean;
  hasCooltime: boolean;
}[] = [
  { category: "low_grade", label: "低学年スキル", hasName: true, hasCooltime: false },
  { category: "high_grade", label: "高学年スキル", hasName: true, hasCooltime: true },
  { category: "passive", label: "パッシブスキル", hasName: false, hasCooltime: false },
  { category: "normal_attack_basic", label: "普通攻撃（基本）", hasName: false, hasCooltime: false },
  { category: "normal_attack_enhanced", label: "普通攻撃（強化）", hasName: false, hasCooltime: false },
];

type CharacterDraft = Character & { _isNew?: boolean; _isDirty?: boolean; _rewardItemIds?: string[] };

const ELEMENT_OPTIONS = ["純粋", "冷静", "狂気", "活発", "憂鬱"] as const;
const RARITY_OPTIONS = ["★1", "★2", "★3"] as const;

export function CharacterEditor({
  initialCharacters,
  initialItems,
  initialRewards,
}: {
  initialCharacters: Character[];
  initialItems: Item[];
  initialRewards: Record<string, string[]>;
}) {
  const [characters, setCharacters] = useState<CharacterDraft[]>(
    initialCharacters.map((c) => ({ ...c, _rewardItemIds: initialRewards[c.id] ?? [] }))
  );
  const [saving, setSaving] = useState(false);
  const [filterElement, setFilterElement] = useState("");
  const [filterRarity, setFilterRarity] = useState("");
  const [filterName, setFilterName] = useState("");
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [skillEditIndex, setSkillEditIndex] = useState<number | null>(null);
  const [relicEditIndex, setRelicEditIndex] = useState<number | null>(null);
  const [relicUploading, setRelicUploading] = useState(false);
  const [items] = useState<Item[]>(initialItems);
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());

  const favoriteItems = items.filter((i) => i.item_type === "favorite");
  const rewardItems = items.filter((i) => i.item_type === "reward");

  // メッセージを一定時間で消す
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  const getCellKey = (rowIndex: number, colIndex: number) => `${rowIndex}-${colIndex}`;

  const focusCell = useCallback((rowIndex: number, colIndex: number) => {
    const el = cellRefs.current.get(getCellKey(rowIndex, colIndex));
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement && el.type === "text") {
        el.select();
      }
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent, rowIndex: number, colIndex: number) => {
      const totalCols = FIELDS.length;

      if (e.key === "Tab") {
        e.preventDefault();
        const nextCol = e.shiftKey ? colIndex - 1 : colIndex + 1;
        if (nextCol >= 0 && nextCol < totalCols) {
          focusCell(rowIndex, nextCol);
        } else if (!e.shiftKey && nextCol >= totalCols && rowIndex < characters.length - 1) {
          focusCell(rowIndex + 1, 0);
        } else if (e.shiftKey && nextCol < 0 && rowIndex > 0) {
          focusCell(rowIndex - 1, totalCols - 1);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (rowIndex < characters.length - 1) {
          focusCell(rowIndex + 1, colIndex);
        }
      }
    },
    [characters.length, focusCell]
  );

  const updateField = (index: number, key: string, value: unknown) => {
    setCharacters((prev) => {
      const next = [...prev];
      const char = { ...next[index], _isDirty: true };

      (char as Record<string, unknown>)[key] = value;

      next[index] = char;
      return next;
    });
  };

  const addNewCharacter = () => {
    const newChar: CharacterDraft = {
      id: crypto.randomUUID(),
      slug: "",
      name: "",
      rarity: null,
      element: null,
      role: null,
      race: null,
      position: null,
      attack_type: null,
      stats: {},
      skills: [],
      metadata: {},
      image_url: null,
      favorite_item_id: null,
      is_hidden: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _isNew: true,
      _isDirty: true,
    };
    setCharacters((prev) => [...prev, newChar]);
    // フォーカスを新しい行の最初のセルに
    setTimeout(() => focusCell(characters.length, 0), 50);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    const dirtyChars = characters.filter((c) => c._isDirty);
    if (dirtyChars.length === 0) {
      setSaveMessage({ type: "success", text: "変更はありません" });
      setSaving(false);
      return;
    }

    const newChars = dirtyChars.filter((c) => c._isNew);
    const existingChars = dirtyChars.filter((c) => !c._isNew);

    try {
      const errors: string[] = [];

      // 新規キャラ作成
      for (const char of newChars) {
        if (!char.name || !char.slug) {
          errors.push(`新規キャラ: 名前とスラッグは必須です`);
          continue;
        }
        const { _isNew, _isDirty, _rewardItemIds, ...data } = char;
        void _isNew;
        void _isDirty;
        void _rewardItemIds;
        const res = await fetch("/api/admin/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          errors.push(`${char.name}: ${err.error}`);
        }
      }

      // 既存キャラ更新
      if (existingChars.length > 0) {
        const updates = existingChars.map((char) => {
          const { _isNew, _isDirty, _rewardItemIds, created_at, ...fields } = char;
          void _isNew;
          void _isDirty;
          void _rewardItemIds;
          void created_at;
          return fields;
        });

        const res = await fetch("/api/admin/characters", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        });

        if (!res.ok) {
          const err = await res.json();
          errors.push(err.error || "更新エラー");
        } else {
          const result = await res.json();
          if (result.errors?.length > 0) {
            for (const e of result.errors) {
              errors.push(`${e.id}: ${e.error}`);
            }
          }
        }
      }

      // アルバイト報酬の保存（中間テーブル更新）
      for (const char of dirtyChars) {
        if (char._rewardItemIds) {
          const res = await fetch("/api/admin/characters/rewards", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character_id: char.id, item_ids: char._rewardItemIds }),
          });
          if (!res.ok) {
            const err = await res.json();
            errors.push(`${char.name} 報酬: ${err.error}`);
          }
        }
      }

      if (errors.length > 0) {
        setSaveMessage({ type: "error", text: errors.join(", ") });
      } else {
        setSaveMessage({ type: "success", text: `${dirtyChars.length}件を保存しました` });
        // _isDirty, _isNew フラグをクリア
        setCharacters((prev) =>
          prev.map((c) => ({ ...c, _isDirty: false, _isNew: false }))
        );
      }
    } catch {
      setSaveMessage({ type: "error", text: "保存中にエラーが発生しました" });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (characterId: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(characterId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("characterId", characterId);

    try {
      const res = await fetch("/api/admin/characters/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setSaveMessage({ type: "error", text: err.error || "アップロード失敗" });
        return;
      }

      const { url } = await res.json();
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === characterId ? { ...c, image_url: url, _isDirty: true } : c
        )
      );
      setSaveMessage({ type: "success", text: "画像をアップロードしました" });
    } catch {
      setSaveMessage({ type: "error", text: "アップロード中にエラーが発生しました" });
    } finally {
      setUploadingId(null);
    }
  };


  const getSkillsArray = (char: Character): SkillData[] => {
    if (Array.isArray(char.skills)) return char.skills as unknown as SkillData[];
    return [];
  };

  const getSkillField = (skills: SkillData[], category: SkillCategory, field: keyof SkillData): string => {
    const skill = skills.find((s) => s.category === category);
    if (!skill) return "";
    const val = skill[field];
    return val !== undefined && val !== null ? String(val) : "";
  };

  const updateSkillField = (charIndex: number, category: SkillCategory, field: keyof SkillData, value: string) => {
    setCharacters((prev) => {
      const next = [...prev];
      const char = { ...next[charIndex], _isDirty: true };
      const skills = getSkillsArray(char);
      const existing = skills.find((s) => s.category === category);
      if (existing) {
        const updated = { ...existing };
        if (field === "cooltime") {
          updated.cooltime = value === "" ? undefined : Number(value);
        } else {
          (updated as Record<string, unknown>)[field] = value || undefined;
        }
        char.skills = skills.map((s) => (s.category === category ? updated : s)) as unknown as Character["skills"];
      } else {
        const newSkill: SkillData = { category, description: "" };
        if (field === "cooltime") {
          newSkill.cooltime = value === "" ? undefined : Number(value);
        } else {
          (newSkill as unknown as Record<string, unknown>)[field] = value || undefined;
        }
        char.skills = [...skills, newSkill] as unknown as Character["skills"];
      }
      next[charIndex] = char;
      return next;
    });
  };

  // 遺物データ取得・更新
  const getRelic = (char: Character): RelicData | null => {
    const meta = char.metadata as Record<string, unknown> | null;
    if (!meta?.relic) return null;
    return meta.relic as RelicData;
  };

  const updateRelicField = (charIndex: number, field: keyof RelicData, value: string | null) => {
    setCharacters((prev) => {
      const next = [...prev];
      const char = { ...next[charIndex], _isDirty: true };
      const meta = (char.metadata as Record<string, unknown>) ?? {};
      const relic = (meta.relic as RelicData) ?? { name: "", image_url: null, description: "", params: "" };
      const updated = { ...relic, [field]: value };
      char.metadata = { ...meta, relic: updated } as Character["metadata"];
      next[charIndex] = char;
      return next;
    });
  };

  const handleRelicImageUpload = async (charIndex: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const characterId = characters[charIndex].id;
    setRelicUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("characterId", characterId);

    try {
      const res = await fetch("/api/admin/characters/upload-relic", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setSaveMessage({ type: "error", text: err.error || "遺物画像アップロード失敗" });
        return;
      }

      const { url } = await res.json();
      updateRelicField(charIndex, "image_url", url);
      setSaveMessage({ type: "success", text: "遺物画像をアップロードしました" });
    } catch {
      setSaveMessage({ type: "error", text: "遺物画像アップロード中にエラーが発生しました" });
    } finally {
      setRelicUploading(false);
    }
  };

  // フィルタリング: 実インデックスの配列を返す
  const filteredIndices = characters.reduce<number[]>((acc, char, i) => {
    if (filterElement && char.element !== filterElement) return acc;
    if (filterRarity && char.rarity !== filterRarity) return acc;
    if (filterName && !matchesName(char.name, filterName)) return acc;
    acc.push(i);
    return acc;
  }, []);

  return (
    <div className="space-y-4">
      {/* ヘッダーバー */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={addNewCharacter}
          className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          + 新規キャラ追加
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer rounded-lg bg-thumbs-up px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "保存中..." : "変更を保存"}
        </button>
        {saveMessage && (
          <span
            className={`text-sm ${
              saveMessage.type === "success" ? "text-thumbs-up" : "text-thumbs-down"
            }`}
          >
            {saveMessage.text}
          </span>
        )}
        <span className="ml-auto text-xs text-text-tertiary">
          {characters.filter((c) => c._isDirty).length}件の未保存の変更
        </span>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-secondary bg-bg-secondary px-3 py-2">
        <span className="text-[10px] font-medium text-text-tertiary">フィルター</span>
        <input
          type="text"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="名前で検索..."
          className="w-36 rounded border border-border-secondary bg-bg-input px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:outline-none"
        />
        <select
          value={filterElement}
          onChange={(e) => setFilterElement(e.target.value)}
          className="rounded border border-border-secondary bg-bg-input px-2 py-1 text-xs text-text-primary focus:border-accent/50 focus:outline-none"
        >
          <option value="">性格: すべて</option>
          {ELEMENT_OPTIONS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={filterRarity}
          onChange={(e) => setFilterRarity(e.target.value)}
          className="rounded border border-border-secondary bg-bg-input px-2 py-1 text-xs text-text-primary focus:border-accent/50 focus:outline-none"
        >
          <option value="">レア: すべて</option>
          {RARITY_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {(filterName || filterElement || filterRarity) && (
          <button
            onClick={() => { setFilterName(""); setFilterElement(""); setFilterRarity(""); }}
            className="cursor-pointer text-[10px] text-text-muted hover:text-text-primary"
          >
            クリア
          </button>
        )}
        <span className="text-[10px] text-text-tertiary">
          {filteredIndices.length}/{characters.length}件
        </span>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto rounded-xl border border-border-primary">
        <table className="w-max min-w-full text-xs">
          <thead>
            <tr className="border-b border-border-primary bg-bg-secondary">
              <th className="sticky left-0 z-10 bg-bg-secondary px-2 py-2 text-left font-medium text-text-secondary">
                #
              </th>
              <th className="px-2 py-2 text-left font-medium text-text-secondary">
                画像
              </th>
              {FIELDS.map((field) => (
                <th
                  key={field.key}
                  className="px-2 py-2 text-left font-medium text-text-secondary"
                >
                  {field.label}
                </th>
              ))}
              <th className="px-2 py-2 text-left font-medium text-text-secondary">
                スキル
              </th>
              <th className="px-2 py-2 text-left font-medium text-text-secondary">
                遺物
              </th>
              <th className="px-2 py-2 text-left font-medium text-text-secondary">
                大好物
              </th>
              <th className="px-2 py-2 text-left font-medium text-text-secondary">
                報酬
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredIndices.map((rowIndex) => {
              const char = characters[rowIndex];
              return (
              <tr
                key={char.id}
                className={`border-b border-border-secondary transition-colors hover:bg-bg-card-hover ${
                  char._isDirty ? "bg-accent/5" : ""
                } ${char._isNew ? "bg-thumbs-up/5" : ""}`}
              >
                {/* 行番号 */}
                <td className="sticky left-0 z-10 bg-bg-primary px-2 py-1 text-text-tertiary">
                  {rowIndex + 1}
                </td>

                {/* 画像 */}
                <td className="px-2 py-1">
                  <label className="relative block h-8 w-8 cursor-pointer overflow-hidden rounded border border-border-primary bg-bg-tertiary">
                    {char.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={char.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] text-text-muted">
                        {uploadingId === char.id ? "..." : "img"}
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleImageUpload(char.id, e)}
                      disabled={char._isNew || uploadingId === char.id}
                    />
                  </label>
                </td>

                {/* 編集可能フィールド */}
                {FIELDS.map((field, colIndex) => (
                  <td key={field.key} className="px-1 py-1">
                    {field.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        checked={
                          (char as Record<string, unknown>)[field.key] as boolean
                        }
                        onChange={(e) =>
                          updateField(rowIndex, field.key, e.target.checked)
                        }
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        ref={(el) => {
                          if (el) cellRefs.current.set(getCellKey(rowIndex, colIndex), el);
                        }}
                        className="cursor-pointer"
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={
                          ((char as Record<string, unknown>)[field.key] as string) ?? ""
                        }
                        onChange={(e) =>
                          updateField(
                            rowIndex,
                            field.key,
                            e.target.value || null
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        ref={(el) => {
                          if (el) cellRefs.current.set(getCellKey(rowIndex, colIndex), el);
                        }}
                        className={`${field.width} rounded border border-border-secondary bg-bg-input px-1.5 py-1 text-text-primary focus:border-accent/50 focus:outline-none`}
                      >
                        <option value="">-</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={
                          ((char as Record<string, unknown>)[field.key] as string) ?? ""
                        }
                        onChange={(e) =>
                          updateField(rowIndex, field.key, e.target.value || null)
                        }
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        ref={(el) => {
                          if (el) cellRefs.current.set(getCellKey(rowIndex, colIndex), el);
                        }}
                        className={`${field.width} rounded border border-border-secondary bg-bg-input px-1.5 py-1 text-text-primary focus:border-accent/50 focus:outline-none`}
                      />
                    )}
                  </td>
                ))}

                {/* スキル編集ボタン */}
                <td className="px-1 py-1">
                  <button
                    onClick={() => setSkillEditIndex(rowIndex)}
                    className="cursor-pointer rounded bg-accent/20 px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/30"
                  >
                    {getSkillsArray(char).length > 0 ? `編集(${getSkillsArray(char).length})` : "追加"}
                  </button>
                </td>

                {/* 遺物編集ボタン */}
                <td className="px-1 py-1">
                  <button
                    onClick={() => setRelicEditIndex(rowIndex)}
                    className="cursor-pointer rounded bg-purple-500/20 px-2 py-1 text-[10px] font-medium text-purple-400 transition-colors hover:bg-purple-500/30"
                  >
                    {getRelic(char) ? "編集" : "追加"}
                  </button>
                </td>

                {/* 大好物プルダウン */}
                <td className="px-1 py-1">
                  <select
                    value={char.favorite_item_id ?? ""}
                    onChange={(e) => updateField(rowIndex, "favorite_item_id", e.target.value || null)}
                    className="w-24 rounded border border-border-secondary bg-bg-input px-1.5 py-1 text-text-primary focus:border-accent/50 focus:outline-none"
                  >
                    <option value="">-</option>
                    {favoriteItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </td>

                {/* アルバイト報酬（複数選択・並び替え可） */}
                <td className="px-1 py-1">
                  <div className="flex flex-col gap-1">
                    {(char._rewardItemIds ?? []).map((itemId, idx) => {
                      const item = rewardItems.find((i) => i.id === itemId);
                      const ids = char._rewardItemIds ?? [];
                      return item ? (
                        <span key={itemId} className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ${idx === 0 ? "bg-yellow-500/15 text-yellow-400" : "bg-accent/15 text-accent"}`}>
                          {idx === 0 && <span title="優先枠">★</span>}
                          {item.name}
                          {idx > 0 && (
                            <button
                              onClick={() => {
                                const next = [...ids];
                                [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                setCharacters((prev) => {
                                  const arr = [...prev];
                                  arr[rowIndex] = { ...arr[rowIndex], _rewardItemIds: next, _isDirty: true };
                                  return arr;
                                });
                              }}
                              className="ml-0.5 cursor-pointer text-text-muted hover:text-text-primary"
                              title="上に移動"
                            >↑</button>
                          )}
                          {idx < ids.length - 1 && (
                            <button
                              onClick={() => {
                                const next = [...ids];
                                [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                setCharacters((prev) => {
                                  const arr = [...prev];
                                  arr[rowIndex] = { ...arr[rowIndex], _rewardItemIds: next, _isDirty: true };
                                  return arr;
                                });
                              }}
                              className="ml-0.5 cursor-pointer text-text-muted hover:text-text-primary"
                              title="下に移動"
                            >↓</button>
                          )}
                          <button
                            onClick={() => {
                              const next = ids.filter((id) => id !== itemId);
                              setCharacters((prev) => {
                                const arr = [...prev];
                                arr[rowIndex] = { ...arr[rowIndex], _rewardItemIds: next, _isDirty: true };
                                return arr;
                              });
                            }}
                            className="ml-0.5 cursor-pointer text-text-muted hover:text-text-primary"
                          >x</button>
                        </span>
                      ) : null;
                    })}
                    <select
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const current = char._rewardItemIds ?? [];
                        if (current.includes(e.target.value)) return;
                        setCharacters((prev) => {
                          const arr = [...prev];
                          arr[rowIndex] = { ...arr[rowIndex], _rewardItemIds: [...current, e.target.value], _isDirty: true };
                          return arr;
                        });
                      }}
                      className="w-20 rounded border border-border-secondary bg-bg-input px-1 py-0.5 text-[10px] text-text-primary focus:border-accent/50 focus:outline-none"
                    >
                      <option value="">+追加</option>
                      {rewardItems.filter((i) => !(char._rewardItemIds ?? []).includes(i.id)).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* スキル編集モーダル */}
      {skillEditIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSkillEditIndex(null)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border-primary bg-bg-primary p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">
                スキル編集: {characters[skillEditIndex].name || "新規キャラ"}
              </h3>
              <button
                onClick={() => setSkillEditIndex(null)}
                className="cursor-pointer text-text-tertiary transition-colors hover:text-text-primary"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {SKILL_SLOTS.map((slot) => {
                const skills = getSkillsArray(characters[skillEditIndex]);
                return (
                  <div key={slot.category} className="rounded-lg border border-border-secondary bg-bg-secondary p-3">
                    <p className="mb-2 text-xs font-bold text-text-secondary">{slot.label}</p>
                    <div className="space-y-2">
                      {slot.hasName && (
                        <div>
                          <label className="mb-0.5 block text-[10px] text-text-tertiary">スキル名</label>
                          <input
                            type="text"
                            value={getSkillField(skills, slot.category, "name")}
                            onChange={(e) => updateSkillField(skillEditIndex, slot.category, "name", e.target.value)}
                            className="w-full rounded border border-border-secondary bg-bg-input px-2 py-1 text-xs text-text-primary focus:border-accent/50 focus:outline-none"
                            placeholder="スキル名を入力"
                          />
                        </div>
                      )}
                      {slot.hasCooltime && (
                        <div>
                          <label className="mb-0.5 block text-[10px] text-text-tertiary">クールタイム（秒）</label>
                          <input
                            type="number"
                            value={getSkillField(skills, slot.category, "cooltime")}
                            onChange={(e) => updateSkillField(skillEditIndex, slot.category, "cooltime", e.target.value)}
                            className="w-24 rounded border border-border-secondary bg-bg-input px-2 py-1 text-xs text-text-primary focus:border-accent/50 focus:outline-none"
                            placeholder="秒"
                          />
                        </div>
                      )}
                      <div>
                        <label className="mb-0.5 block text-[10px] text-text-tertiary">説明</label>
                        <textarea
                          value={getSkillField(skills, slot.category, "description")}
                          onChange={(e) => updateSkillField(skillEditIndex, slot.category, "description", e.target.value)}
                          className="w-full rounded border border-border-secondary bg-bg-input px-2 py-1 text-xs text-text-primary focus:border-accent/50 focus:outline-none"
                          rows={2}
                          placeholder="スキルの説明を入力"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-text-tertiary">パラメータ（1行に1つ）</label>
                        <textarea
                          value={getSkillField(skills, slot.category, "params")}
                          onChange={(e) => updateSkillField(skillEditIndex, slot.category, "params", e.target.value)}
                          className="w-full rounded border border-border-secondary bg-bg-input px-2 py-1 text-xs text-text-primary focus:border-accent/50 focus:outline-none"
                          rows={3}
                          placeholder={"物理ダメージ: 345.6%\n最後の一撃の物理ダメージ: 86.4%\n無敵の持続時間: 3秒"}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSkillEditIndex(null)}
                className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 遺物編集モーダル */}
      {relicEditIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setRelicEditIndex(null)}>
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border-primary bg-bg-primary p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">
                愛用カード編集: {characters[relicEditIndex].name || "新規キャラ"}
              </h3>
              <button
                onClick={() => setRelicEditIndex(null)}
                className="cursor-pointer text-text-tertiary transition-colors hover:text-text-primary"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* 遺物名 */}
              <div className="rounded-lg border border-border-secondary bg-bg-secondary p-3">
                <label className="mb-1 block text-xs font-bold text-text-secondary">遺物名</label>
                <input
                  type="text"
                  value={getRelic(characters[relicEditIndex])?.name ?? ""}
                  onChange={(e) => updateRelicField(relicEditIndex, "name", e.target.value)}
                  className="w-full rounded border border-border-secondary bg-bg-input px-2 py-1.5 text-xs text-text-primary focus:border-accent/50 focus:outline-none"
                  placeholder="遺物名を入力"
                />
              </div>

              {/* 遺物画像 */}
              <div className="rounded-lg border border-border-secondary bg-bg-secondary p-3">
                <p className="mb-2 text-xs font-bold text-text-secondary">遺物画像</p>
                <div className="flex items-center gap-3">
                  <label className="relative block h-16 w-16 cursor-pointer overflow-hidden rounded-lg border border-border-primary bg-bg-tertiary">
                    {getRelic(characters[relicEditIndex])?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getRelic(characters[relicEditIndex])!.image_url!}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs text-text-muted">
                        {relicUploading ? "..." : "img"}
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleRelicImageUpload(relicEditIndex, e)}
                      disabled={characters[relicEditIndex]._isNew || relicUploading}
                    />
                  </label>
                  <p className="text-[10px] text-text-muted">クリックして画像をアップロード（PNG/JPEG/WebP, 2MB以下）</p>
                </div>
              </div>

              {/* パラメータ */}
              <div className="rounded-lg border border-border-secondary bg-bg-secondary p-3">
                <label className="mb-1 block text-xs font-bold text-text-secondary">パラメータ（1行に1つ）</label>
                <textarea
                  value={getRelic(characters[relicEditIndex])?.params ?? ""}
                  onChange={(e) => updateRelicField(relicEditIndex, "params", e.target.value)}
                  className="w-full rounded border border-border-secondary bg-bg-input px-2 py-1.5 text-xs text-text-primary focus:border-accent/50 focus:outline-none"
                  rows={4}
                  placeholder={"HP増加: +25.7%\n物理攻撃力増加: +12.3%"}
                />
              </div>

              {/* 説明文 */}
              <div className="rounded-lg border border-border-secondary bg-bg-secondary p-3">
                <label className="mb-1 block text-xs font-bold text-text-secondary">説明文</label>
                <textarea
                  value={getRelic(characters[relicEditIndex])?.description ?? ""}
                  onChange={(e) => updateRelicField(relicEditIndex, "description", e.target.value)}
                  className="w-full rounded border border-border-secondary bg-bg-input px-2 py-1.5 text-xs text-text-primary focus:border-accent/50 focus:outline-none"
                  rows={3}
                  placeholder="遺物の説明文を入力"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setRelicEditIndex(null)}
                className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {characters.length === 0 && (
        <div className="rounded-xl border border-border-primary bg-bg-card p-8 text-center">
          <p className="text-sm text-text-tertiary">
            キャラクターが登録されていません
          </p>
          <button
            onClick={addNewCharacter}
            className="mt-3 cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
          >
            最初のキャラを追加
          </button>
        </div>
      )}
    </div>
  );
}
