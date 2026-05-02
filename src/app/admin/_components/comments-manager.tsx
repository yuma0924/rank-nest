"use client";

import { useState, useEffect, useCallback } from "react";

type CommentRow = {
  id: string;
  character_id: string;
  user_hash: string;
  comment_type: "vote" | "board";
  rating: number | null;
  body: string | null;
  display_name: string | null;
  is_latest_vote: boolean | null;
  is_deleted: boolean;
  thumbs_up_count: number;
  thumbs_down_count: number;
  created_at: string;
  characters: { name: string; slug: string };
};

export function CommentsManager() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "vote" | "board">("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const limit = 50;

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      type: filter,
      deleted: String(showDeleted),
    });
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/comments?${params}`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [page, filter, showDeleted, search]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAction = async (id: string, action: "delete" | "restore") => {
    setActionId(id);
    const res = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      await fetchComments();
    }
    setActionId(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as "all" | "vote" | "board");
            setPage(1);
          }}
          className="rounded-lg border border-border-primary bg-bg-input px-3 py-1.5 text-sm text-text-primary"
        >
          <option value="all">全タイプ</option>
          <option value="vote">投票コメント</option>
          <option value="board">掲示板コメント</option>
        </select>

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

        <input
          type="text"
          placeholder="本文で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              fetchComments();
            }
          }}
          className="rounded-lg border border-border-primary bg-bg-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted"
        />

        <span className="ml-auto text-xs text-text-tertiary">
          {total}件中 {(page - 1) * limit + 1}-{Math.min(page * limit, total)}件
        </span>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto rounded-xl border border-border-primary">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-primary bg-bg-secondary text-left">
              <th className="px-3 py-2 font-medium text-text-secondary">種別</th>
              <th className="px-3 py-2 font-medium text-text-secondary">キャラ</th>
              <th className="px-3 py-2 font-medium text-text-secondary">投稿者</th>
              <th className="px-3 py-2 font-medium text-text-secondary">本文</th>
              <th className="px-3 py-2 font-medium text-text-secondary">評価</th>
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
            ) : comments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-text-tertiary">
                  コメントがありません
                </td>
              </tr>
            ) : (
              comments.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border-secondary hover:bg-bg-card-hover"
                >
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        c.comment_type === "vote"
                          ? "bg-star/10 text-star"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {c.comment_type === "vote" ? "投票" : "掲示板"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-primary">
                    {c.characters?.name || "-"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {c.display_name || "名無しの教主"}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-text-primary">
                    {c.body || "-"}
                  </td>
                  <td className="px-3 py-2 text-star">
                    {c.rating !== null ? `★${c.rating}` : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-thumbs-up">{c.thumbs_up_count}</span>
                    {" / "}
                    <span className="text-thumbs-down">{c.thumbs_down_count}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text-tertiary">
                    {new Date(c.created_at).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() =>
                        handleAction(c.id, c.is_deleted ? "restore" : "delete")
                      }
                      disabled={actionId === c.id}
                      className={`cursor-pointer rounded px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                        c.is_deleted
                          ? "bg-thumbs-up/10 text-thumbs-up hover:bg-thumbs-up/20"
                          : "bg-thumbs-down/10 text-thumbs-down hover:bg-thumbs-down/20"
                      }`}
                    >
                      {c.is_deleted ? "復元" : "削除"}
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
