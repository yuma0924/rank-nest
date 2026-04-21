"use client";

import { useState, useEffect, type FormEvent } from "react";

type SiteConfigData = {
  id: number;
  display_name: string;
  labels: Record<string, string>;
  description: string | null;
};

export function SettingsEditor() {
  const [config, setConfig] = useState<SiteConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
      setLoading(false);
    }
    fetchConfig();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: config.display_name,
        labels: config.labels,
        description: config.description,
      }),
    });

    if (res.ok) {
      setMessage({ type: "success", text: "設定を保存しました" });
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "保存に失敗しました" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border-primary bg-bg-card p-8 text-center">
        <p className="text-sm text-text-tertiary">読み込み中...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-thumbs-down/30 bg-thumbs-down/5 p-4 text-sm text-thumbs-down">
        設定データの取得に失敗しました。site_config テーブルに初期データが必要です。
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本設定 */}
      <div className="rounded-xl border border-border-primary bg-bg-card p-4">
        <h3 className="mb-4 text-sm font-medium text-text-primary">
          基本設定
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">
              サイト表示名
            </label>
            <input
              type="text"
              value={config.display_name}
              onChange={(e) =>
                setConfig({ ...config, display_name: e.target.value })
              }
              className="w-full max-w-md rounded-lg border border-border-primary bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-accent/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">
              SEO説明文
            </label>
            <textarea
              value={config.description || ""}
              onChange={(e) =>
                setConfig({ ...config, description: e.target.value || null })
              }
              rows={3}
              className="w-full max-w-md rounded-lg border border-border-primary bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-accent/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ステータスラベル */}
      <div className="rounded-xl border border-border-primary bg-bg-card p-4">
        <h3 className="mb-4 text-sm font-medium text-text-primary">
          ステータス項目名（動的ラベル）
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(config.labels || {}).map(([key, value]) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-text-tertiary">
                {key}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    labels: { ...config.labels, [key]: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-border-primary bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:border-accent/50 focus:outline-none"
              />
            </div>
          ))}
        </div>
        {Object.keys(config.labels || {}).length === 0 && (
          <p className="text-xs text-text-tertiary">
            ラベルが登録されていません
          </p>
        )}
      </div>

      {/* 保存ボタン */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="cursor-pointer rounded-lg bg-accent px-6 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.type === "success" ? "text-thumbs-up" : "text-thumbs-down"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
