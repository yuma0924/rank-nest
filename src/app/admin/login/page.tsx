"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "ログインに失敗しました");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border-primary bg-bg-card p-8">
          <div className="mb-6 text-center">
            <div className="mb-2 text-sm font-medium text-text-tertiary">
              管理者ログイン
            </div>
            <h1 className="text-xl font-bold text-text-primary">
              トリッカルランキング
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm text-text-secondary"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="管理者パスワードを入力"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-border-primary bg-bg-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {error && (
              <p className="text-sm text-thumbs-down">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full cursor-pointer rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
