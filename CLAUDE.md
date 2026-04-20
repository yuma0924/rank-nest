# rank-nest (トリッカルランキング)

rank-nest は複数ゲームのランキングポータル。本リポジトリではその配下で動く
トリッカル・もちもちほっぺ大作戦の非公式データベースサイト（/trickcal）を主に実装する。
キャラクター性能データと、投票・コメントによるランキング/掲示板を統合。

- ドメイン: rank-nest.com
- トリッカルサブパス: rank-nest.com/trickcal
- サイト表示名: みんなで決めるトリッカルランキング（/trickcal 配下）

## 技術スタック

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS v4
- **Backend / DB**: Supabase (PostgreSQL, Storage)
- **Hosting**: Vercel
- **Automation**: GitHub Actions (毎日0時JST ランキング再集計バッチ)
- **言語**: TypeScript (strict mode)

## ディレクトリ構成

```
rank-nest/ (repo)
├── CLAUDE.md
├── docs/
│   └── SPEC.md              # 統合仕様書（全機能の詳細定義）
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # ルートレイアウト（最小HTMLラッパー + ThemeProvider）
│   │   ├── page.tsx          # rank-nest ポータルトップ
│   │   ├── trickcal/         # トリッカルサブパス配下
│   │   │   ├── layout.tsx    # トリッカル用レイアウト（ヘッダー・フッター・サイドバー）
│   │   │   ├── page.tsx      # トリッカルホーム（4段構成）
│   │   │   ├── ranking/      # 人気キャラランキング
│   │   │   ├── characters/
│   │   │   │   └── [slug]/   # キャラクター個別ページ
│   │   │   ├── builds/       # 編成ランキング
│   │   │   │   └── [buildId]/ # 編成詳細ページ
│   │   │   ├── tiers/        # ティア表
│   │   │   │   ├── new/      # 作成
│   │   │   │   └── [id]/     # 個別ティア
│   │   │   └── guidelines/   # ガイドライン
│   │   ├── admin/            # 管理者ダッシュボード（ゲーム横断共通）
│   │   └── api/              # API Routes（共通）
│   │       ├── comments/     # コメント投稿・取得
│   │       ├── reactions/    # 👍/👎リアクション
│   │       ├── builds/       # 編成投稿・取得
│   │       ├── reports/      # 通報
│   │       ├── admin/        # 管理者用API
│   │       └── user-hash/    # ユーザー識別
│   ├── components/           # 共通UIコンポーネント
│   │   ├── layout/           # Header, Footer, BottomNav
│   │   ├── character/        # CharacterIcon, CharacterCard
│   │   ├── comment/          # CommentCard, CommentForm, CommentList
│   │   ├── build/            # BuildCard, BuildForm
│   │   ├── reaction/         # ThumbsUpDown
│   │   └── ui/               # Button, Badge, Tab, StarRating など汎用UI
│   ├── lib/                  # ユーティリティ・設定
│   │   ├── supabase/         # Supabase クライアント設定
│   │   ├── utils.ts
│   │   └── constants.ts
│   └── types/                # TypeScript 型定義
│       ├── database.ts       # DB テーブル型（Supabase generated types）
│       └── index.ts
├── supabase/
│   ├── migrations/           # マイグレーションSQL
│   └── seed.sql              # 初期データ
├── public/                   # 静的ファイル
├── .github/
│   └── workflows/            # GitHub Actions
└── package.json
```

## コーディング規約

### 全般
- TypeScript strict mode を使用
- `any` 型の使用禁止。適切な型を定義すること
- コンポーネントは関数コンポーネント + React hooks
- Server Components をデフォルトとし、必要な場合のみ `"use client"` を使用
- ファイル名: kebab-case（例: `character-card.tsx`）
- コンポーネント名: PascalCase（例: `CharacterCard`）
- 関数・変数名: camelCase
- 日本語コメントOK（ただし変数名・関数名は英語）

### Next.js
- App Router のルーティング規約に従う
- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` を適切に使用
- データフェッチは Server Components で行い、Client Components に props で渡す
- メタデータは `generateMetadata` で動的生成

### Supabase
- クライアントは `src/lib/supabase/` に集約
- Server Component 用: `createServerClient`
- Client Component 用: `createBrowserClient`
- API Route 用: `createRouteHandlerClient`
- RLS (Row Level Security) を全テーブルで有効化

### スタイリング
- Tailwind CSS を使用（インラインスタイル・CSS Modules は使わない）
- テーマ: ダーク・ライト・自動の3モード対応（CSS変数 + Tailwind dark: を活用）
- 標準テーマはダーク
- レスポンシブ: モバイルファースト。PC は max-w-7xl (1280px) 中央寄せ

## データベーステーブル一覧

| テーブル | 概要 |
|---------|------|
| characters | キャラクター情報（stats/skills/metadata は JSONB、favorite_item_id FK） |
| items | アイテムマスタ（大好物・アルバイト報酬の共通管理） |
| character_rewards | キャラ×アルバイト報酬 中間テーブル（sort_order付き） |
| comments | 投票コメント(vote) + 掲示板コメント(board) |
| character_rankings | ランキング集計キャッシュ（バッチ更新） |
| comment_reactions | コメント👍/👎 |
| builds | 編成投稿（members は9スロット固定配列） |
| build_reactions | 編成👍/👎 |
| build_comments | 編成コメント |
| build_comment_reactions | 編成コメント👍/👎 |
| reports | 通報（comment/build/build_comment 対象） |
| blacklist | BAN ユーザー |
| site_config | サイト設定（シングルトン: 1行のみ） |

詳細なカラム定義は `docs/SPEC.md` セクション6を参照。

## 重要なビジネスルール

- **ユーザー識別**: Cookie UUID + IP + server_secret の SHA-256 ハッシュ（user_hash）
- **投票の上書き**: 同一キャラへの再投票は★評価のみ更新、過去コメント本文は履歴として残す
- **集計除外**: 365日超え or ネットスコア(👍-👎) -10以下 → 集計除外（表示は維持）
- **最低投票数**: 有効票4件以上でランキング参加
- **レートリミット**: 投票30秒、掲示板コメント10秒、編成投稿30秒
- **編成投稿**: 同一ユーザー×同一モードで複数投稿可。同一メンバー構成の重複は拒否
- **自浄作用**: ネットスコアに応じた見た目変化（+30金枠、+15太字、-15グレー、-30さらに薄く）
- **BAN**: blacklist の user_hash は全投稿を拒否（BAN理由は非表示）

## チーム担当分け

| メンバー | 担当ディレクトリ |
|---------|---------------|
| infra | `supabase/`, `src/lib/supabase/`, `src/types/database.ts`, `.github/workflows/`, `src/app/api/user-hash/` |
| ui-foundation | `src/components/`, `src/app/layout.tsx`, `src/lib/utils.ts`, `src/lib/constants.ts`, `tailwind.config.ts`, `src/app/globals.css` |
| pages-ranking | `src/app/page.tsx`, `src/app/ranking/`, `src/app/characters/`, `src/app/api/comments/`, `src/app/api/reactions/` |
| pages-builds | `src/app/builds/`, `src/app/api/builds/`, `src/app/api/reports/` |
| admin | `src/app/admin/`, `src/app/api/admin/`, `src/app/guidelines/` |

**重要: 他メンバーの担当ディレクトリのファイルは編集しないこと。**
共通コンポーネントが必要な場合は ui-foundation に依頼する。
