"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal, flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";

export type SearchCharacter = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
};

interface HeaderSearchProps {
  characters: SearchCharacter[];
}

export function HeaderSearch({ characters }: HeaderSearchProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // モーダルを開いた時に全キャラ画像をプリフェッチして即時表示
  const prefetchedRef = useRef(false);
  useEffect(() => {
    if (!open || prefetchedRef.current) return;
    prefetchedRef.current = true;
    characters.forEach((c) => {
      if (!c.image_url) return;
      const img = new window.Image();
      img.src = c.image_url;
    });
  }, [open, characters]);

  useEffect(() => {
    if (open) {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    } else {
      setQuery("");
    }
  }, [open]);

  const handleOpen = () => {
    // iOSでキーボードを表示するには、ユーザー操作のコールスタック内で
    // 同期的に input.focus() を呼ぶ必要がある
    flushSync(() => {
      setOpen(true);
    });
    inputRef.current?.focus();
  };

  const results = useMemo(() => {
    // ひらがな⇄カタカナを吸収するため、すべてカタカナに正規化
    const toKatakana = (s: string) =>
      s.replace(/[\u3041-\u3096]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) + 0x60)
      );
    const q = toKatakana(query.trim().toLowerCase());
    if (!q) return [];
    return characters
      .filter((c) => toKatakana(c.name.toLowerCase()).includes(q))
      .slice(0, 20);
  }, [query, characters]);

  const handleSelect = (slug: string) => {
    setOpen(false);
    router.push(`/trickcal/characters/${slug}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="キャラ検索"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary cursor-pointer"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
        </svg>
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border-primary bg-bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border-primary px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-bg-input px-3 py-2">
                <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="キャラ名で検索..."
                  style={{ outline: "none" }}
                  className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    aria-label="入力をクリア"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-text-muted hover:bg-bg-card-hover hover:text-text-primary cursor-pointer"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg border border-border-primary px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-bg-card-hover hover:text-text-primary cursor-pointer"
              >
                閉じる
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim() === "" ? (
                <p className="px-4 py-8 text-center text-sm text-text-muted">
                  キャラ名を入力してください
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-muted">
                  該当するキャラが見つかりません
                </p>
              ) : (
                <ul>
                  {results.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(c.slug)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-card-hover cursor-pointer"
                      >
                        {c.image_url ? (
                          <Image
                            src={c.image_url}
                            alt={c.name}
                            width={96}
                            height={96}
                            sizes="(max-width: 768px) 48px, 64px"
                            loading="eager"
                            unoptimized
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-bg-tertiary" />
                        )}
                        <span className="text-sm font-bold text-text-primary">
                          {c.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
