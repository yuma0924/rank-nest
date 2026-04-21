"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import type { Item } from "@/types/trickcal";

type ItemDraft = Item & { _isNew?: boolean; _isDirty?: boolean };

export function ItemEditor({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<ItemDraft[]>(
    initialItems.map((i) => ({ ...i }))
  );
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  const addNewItem = (itemType: "favorite" | "reward") => {
    const newItem: ItemDraft = {
      id: crypto.randomUUID(),
      name: "",
      image_url: null,
      item_type: itemType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _isNew: true,
      _isDirty: true,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const updateField = (index: number, key: string, value: unknown) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], _isDirty: true, [key]: value };
      return next;
    });
  };

  const handleDelete = async (index: number) => {
    const item = items[index];
    if (!confirm(`「${item.name || "未入力"}」を削除しますか？`)) return;

    if (item._isNew) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    try {
      const res = await fetch("/api/admin/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((_, i) => i !== index));
        setSaveMessage({ type: "success", text: "削除しました" });
      } else {
        const err = await res.json();
        setSaveMessage({ type: "error", text: err.error || "削除失敗" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "削除中にエラーが発生しました" });
    }
  };

  const handleImageUpload = async (itemId: string, index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 新規アイテムの場合は先に保存が必要
    if (items[index]._isNew) {
      setSaveMessage({ type: "error", text: "先にアイテムを保存してから画像をアップロードしてください" });
      return;
    }

    setUploadingId(itemId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("itemId", itemId);

    try {
      const res = await fetch("/api/admin/items/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setSaveMessage({ type: "error", text: err.error || "アップロード失敗" });
        return;
      }

      const { url } = await res.json();
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, image_url: url, _isDirty: true } : item
        )
      );
      setSaveMessage({ type: "success", text: "画像をアップロードしました" });
    } catch {
      setSaveMessage({ type: "error", text: "アップロード中にエラーが発生しました" });
    } finally {
      setUploadingId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    const dirtyItems = items.filter((i) => i._isDirty);
    if (dirtyItems.length === 0) {
      setSaveMessage({ type: "success", text: "変更はありません" });
      setSaving(false);
      return;
    }

    try {
      const errors: string[] = [];

      for (const item of dirtyItems) {
        if (!item.name) {
          errors.push("名前は必須です");
          continue;
        }

        if (item._isNew) {
          const res = await fetch("/api/admin/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, name: item.name, item_type: item.item_type }),
          });
          if (!res.ok) {
            const err = await res.json();
            errors.push(`${item.name}: ${err.error}`);
          }
        } else {
          const res = await fetch("/api/admin/items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, name: item.name, item_type: item.item_type }),
          });
          if (!res.ok) {
            const err = await res.json();
            errors.push(`${item.name}: ${err.error}`);
          }
        }
      }

      if (errors.length > 0) {
        setSaveMessage({ type: "error", text: errors.join(", ") });
      } else {
        setSaveMessage({ type: "success", text: `${dirtyItems.length}件を保存しました` });
        setItems((prev) =>
          prev.map((i) => ({ ...i, _isDirty: false, _isNew: false }))
        );
      }
    } catch {
      setSaveMessage({ type: "error", text: "保存中にエラーが発生しました" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = filterType ? items.filter((i) => i.item_type === filterType) : items;
  const favorites = filtered.filter((i) => i.item_type === "favorite");
  const rewards = filtered.filter((i) => i.item_type === "reward");

  const renderItemCard = (item: ItemDraft) => {
    const realIndex = items.indexOf(item);
    return (
      <div
        key={item.id}
        className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
          item._isDirty
            ? "border-accent/30 bg-accent/5"
            : "border-border-secondary bg-bg-secondary"
        }`}
      >
        {/* 画像 */}
        <label className="relative block h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border-primary bg-bg-tertiary">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] text-text-muted">
              {uploadingId === item.id ? "..." : "img"}
            </span>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleImageUpload(item.id, realIndex, e)}
            disabled={item._isNew || uploadingId === item.id}
          />
        </label>

        {/* 名前 */}
        <input
          type="text"
          value={item.name}
          onChange={(e) => updateField(realIndex, "name", e.target.value)}
          placeholder="アイテム名"
          className="min-w-0 flex-1 rounded border border-border-secondary bg-bg-input px-2 py-1.5 text-sm text-text-primary focus:border-accent/50 focus:outline-none"
        />

        {/* 種別 */}
        <select
          value={item.item_type}
          onChange={(e) => updateField(realIndex, "item_type", e.target.value)}
          className="rounded border border-border-secondary bg-bg-input px-2 py-1.5 text-xs text-text-primary focus:border-accent/50 focus:outline-none"
        >
          <option value="favorite">大好物</option>
          <option value="reward">報酬</option>
        </select>

        {/* 削除 */}
        <button
          onClick={() => handleDelete(realIndex)}
          className="cursor-pointer rounded p-1 text-text-muted transition-colors hover:bg-thumbs-down/10 hover:text-thumbs-down"
          title="削除"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ヘッダーバー */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => addNewItem("favorite")}
          className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover"
        >
          + 大好物を追加
        </button>
        <button
          onClick={() => addNewItem("reward")}
          className="cursor-pointer rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          + 報酬を追加
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer rounded-lg bg-thumbs-up px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "保存中..." : "変更を保存"}
        </button>
        {saveMessage && (
          <span className={`text-sm ${saveMessage.type === "success" ? "text-thumbs-up" : "text-thumbs-down"}`}>
            {saveMessage.text}
          </span>
        )}
        <span className="ml-auto text-xs text-text-tertiary">
          {items.filter((i) => i._isDirty).length}件の未保存の変更
        </span>
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterType("")}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            !filterType ? "border-accent/40 bg-accent/10 text-accent" : "border-border-secondary text-text-secondary hover:text-text-primary"
          }`}
        >
          すべて ({items.length})
        </button>
        <button
          onClick={() => setFilterType("favorite")}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            filterType === "favorite" ? "border-accent/40 bg-accent/10 text-accent" : "border-border-secondary text-text-secondary hover:text-text-primary"
          }`}
        >
          大好物 ({items.filter((i) => i.item_type === "favorite").length})
        </button>
        <button
          onClick={() => setFilterType("reward")}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            filterType === "reward" ? "border-accent/40 bg-accent/10 text-accent" : "border-border-secondary text-text-secondary hover:text-text-primary"
          }`}
        >
          報酬 ({items.filter((i) => i.item_type === "reward").length})
        </button>
      </div>

      {/* 大好物セクション */}
      {(!filterType || filterType === "favorite") && (
        <div>
          <h2 className="mb-2 text-sm font-bold text-text-primary">大好物</h2>
          {favorites.length > 0 ? (
            <div className="space-y-2">
              {favorites.map((item) => renderItemCard(item))}
            </div>
          ) : (
            <p className="rounded-lg border border-border-secondary bg-bg-secondary p-4 text-center text-sm text-text-tertiary">
              大好物アイテムがありません
            </p>
          )}
        </div>
      )}

      {/* 報酬セクション */}
      {(!filterType || filterType === "reward") && (
        <div>
          <h2 className="mb-2 text-sm font-bold text-text-primary">アルバイト報酬</h2>
          {rewards.length > 0 ? (
            <div className="space-y-2">
              {rewards.map((item) => renderItemCard(item))}
            </div>
          ) : (
            <p className="rounded-lg border border-border-secondary bg-bg-secondary p-4 text-center text-sm text-text-tertiary">
              報酬アイテムがありません
            </p>
          )}
        </div>
      )}
    </div>
  );
}
