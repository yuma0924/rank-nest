"use client";

import { useState, useEffect, useCallback } from "react";
import { ALIAS_STAGE_LABELS } from "@/lib/trickcal/constants";
import type { AliasStage, BuildMode } from "@/lib/trickcal/constants";

type BuildRow = {
  id: string;
  mode: BuildMode;
  alias_stage: AliasStage | null;
  party_size: number;
  members: string[];
  element_label: string | null;
  title: string | null;
  display_name: string | null;
  comment: string;
  user_hash: string;
  likes_count: number;
  dislikes_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export function BuildsManager() {
  const [builds, setBuilds] = useState<BuildRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const limit = 50;

  const fetchBuilds = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      deleted: String(showDeleted),
    });

    const res = await fetch(`/api/admin/builds?${params}`);
    if (res.ok) {
      const data = await res.json();
      setBuilds(data.builds ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [page, showDeleted]);

  useEffect(() => {
    fetchBuilds();
  }, [fetchBuilds]);

  const handleAction = async (id: string, action: "delete" | "restore") => {
    setActionId(id);
    const res = await fetch("/api/admin/builds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      await fetchBuilds();
    }
    setActionId(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => {
              setShowDeleted(e.target.checked);
              setPage(1);
            }}
          />
          削除済みを表示
        </label>
        <span className="ml-auto text-xs text-text-tertiary">{total}件</span>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto rounded-xl border border-border-primary">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-primary bg-bg-secondary text-left">
              <th className="px-3 py-2 font-medium text-text-secondary">モード</th>
              <th className="px-3 py-2 font-medium text-text-secondary">タイトル</th>
              <th className="px-3 py-2 font-medium text-text-secondary">性格</th>
              <th className="px-3 py-2 font-medium text-text-secondary">投稿者</th>
              <th className="px-3 py-2 font-medium text-text-secondary">コメント</th>
              <th className="px-3 py-2 font-medium text-text-secondary">反応</th>
              <th className="px-3 py-2 font-medium text-text-secondary">日時</th>
              <th className="px-3 py-2 font-medium text-text-secondary">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-text-tertiary">
                  読み込み中...
                </td>
              </tr>
            ) : builds.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-text-tertiary">
                  編成がありません
                </td>
              </tr>
            ) : (
              builds.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-border-secondary hover:bg-bg-card-hover"
                >
                  <td className="px-3 py-2">
                    <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-accent">
                      {b.mode}
                      {b.mode === "alias" && b.alias_stage
                        ? `:${ALIAS_STAGE_LABELS[b.alias_stage]}`
                        : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-primary">
                    {b.title || "(無題)"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {b.element_label || "-"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {b.display_name || "名無し"}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-text-primary">
                    {b.comment}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-thumbs-up">{b.likes_count}</span>
                    {" / "}
                    <span className="text-thumbs-down">{b.dislikes_count}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text-tertiary">
                    {new Date(b.created_at).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() =>
                        handleAction(b.id, b.is_deleted ? "restore" : "delete")
                      }
                      disabled={actionId === b.id}
                      className={`cursor-pointer rounded px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                        b.is_deleted
                          ? "bg-thumbs-up/10 text-thumbs-up hover:bg-thumbs-up/20"
                          : "bg-thumbs-down/10 text-thumbs-down hover:bg-thumbs-down/20"
                      }`}
                    >
                      {b.is_deleted ? "復元" : "削除"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 text-xs text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            前へ
          </button>
          <span className="text-xs text-text-tertiary">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 text-xs text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
