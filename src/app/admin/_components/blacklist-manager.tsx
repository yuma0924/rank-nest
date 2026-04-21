"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";

type BlacklistEntry = {
  id: string;
  user_hash: string;
  reason: string | null;
  created_at: string;
};

export function BlacklistManager() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // 新規追加フォーム
  const [newUserHash, setNewUserHash] = useState("");
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchBlacklist = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/blacklist");
    if (res.ok) {
      const data = await res.json();
      setEntries(data.blacklist ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBlacklist();
  }, [fetchBlacklist]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newUserHash.trim()) {
      setError("user_hash を入力してください");
      return;
    }

    setAdding(true);
    const res = await fetch("/api/admin/blacklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_hash: newUserHash.trim(),
        reason: newReason.trim() || undefined,
      }),
    });

    if (res.ok) {
      setNewUserHash("");
      setNewReason("");
      await fetchBlacklist();
    } else {
      const data = await res.json();
      setError(data.error || "追加に失敗しました");
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    setActionId(id);
    const res = await fetch("/api/admin/blacklist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      await fetchBlacklist();
    }
    setActionId(null);
  };

  return (
    <div className="space-y-6">
      {/* 追加フォーム */}
      <div className="rounded-xl border border-border-primary bg-bg-card p-4">
        <h3 className="mb-3 text-sm font-medium text-text-primary">
          BAN追加
        </h3>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="user_hash"
            value={newUserHash}
            onChange={(e) => setNewUserHash(e.target.value)}
            className="flex-1 rounded-lg border border-border-primary bg-bg-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:outline-none"
          />
          <input
            type="text"
            placeholder="理由（任意）"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="w-48 rounded-lg border border-border-primary bg-bg-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={adding}
            className="cursor-pointer rounded-lg bg-thumbs-down px-4 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? "追加中..." : "BAN"}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-xs text-thumbs-down">{error}</p>
        )}
      </div>

      {/* 一覧 */}
      <div className="overflow-x-auto rounded-xl border border-border-primary">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-primary bg-bg-secondary text-left">
              <th className="px-3 py-2 font-medium text-text-secondary">user_hash</th>
              <th className="px-3 py-2 font-medium text-text-secondary">理由</th>
              <th className="px-3 py-2 font-medium text-text-secondary">BAN日時</th>
              <th className="px-3 py-2 font-medium text-text-secondary">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-text-tertiary">
                  読み込み中...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-text-tertiary">
                  BAN ユーザーはいません
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-border-secondary hover:bg-bg-card-hover"
                >
                  <td className="px-3 py-2 font-mono text-xs text-text-primary">
                    {entry.user_hash}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {entry.reason || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text-tertiary">
                    {new Date(entry.created_at).toLocaleString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      disabled={actionId === entry.id}
                      className="cursor-pointer rounded bg-thumbs-up/10 px-2 py-1 text-[10px] font-medium text-thumbs-up transition-colors hover:bg-thumbs-up/20 disabled:opacity-50"
                    >
                      BAN解除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
