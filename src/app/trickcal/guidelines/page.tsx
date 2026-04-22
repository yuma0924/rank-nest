import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DOMAIN } from "@/lib/constants";
import { SITE_NAME } from "@/lib/trickcal/constants";

export const metadata: Metadata = {
  title: `ガイドライン・利用規約 | ${SITE_NAME}`,
  description:
    "トリッカルランキングの利用規約・免責事項・プライバシーポリシーをご確認ください。",
  alternates: {
    canonical: "/trickcal/guidelines",
  },
  openGraph: {
    title: `ガイドライン・利用規約 | ${SITE_NAME}`,
    description:
      "トリッカルランキングの利用規約・免責事項・プライバシーポリシーをご確認ください。",
    type: "website",
    url: `https://${SITE_DOMAIN}/guidelines`,
  },
  twitter: {
    card: "summary_large_image",
  },
};

function AlertTriangleIcon() {
  return (
    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function CopyrightIcon() {
  return (
    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.83 11.17a4 4 0 10 0 1.66" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function RefreshCwIcon() {
  return (
    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function SectionHeading({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border-primary pb-2">
      {icon}
      <h2 className="text-xl font-bold text-text-primary">{children}</h2>
    </div>
  );
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed text-text-secondary">
      <span className="mt-0.5 shrink-0 text-accent">•</span>
      <span>{children}</span>
    </li>
  );
}

export default function GuidelinesPage() {
  return (
    <div className="max-w-2xl pb-12">
      {/* タイトル */}
      <div className="mb-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-[#e05aa8] to-[#f08a9a]" />
          <h1 className="text-3xl font-bold text-text-primary">
            ガイドライン
          </h1>
        </div>
        <div className="mt-3 flex items-center justify-between pl-4">
          <p className="text-sm text-text-tertiary">利用規約・免責事項</p>
          <p className="text-xs text-text-muted">最終更新日：2026/03/01</p>
        </div>
      </div>

      {/* 冒頭メッセージ */}
      <div className="mt-6 rounded-2xl border border-border-primary bg-bg-card/30 px-4 py-4">
        <p className="text-xs text-text-secondary">
          このサイトを気持ちよく使うための最低限のルールです。
        </p>
      </div>

      {/* 1. 禁止事項 */}
      <section className="mt-8 space-y-4">
        <SectionHeading icon={<AlertTriangleIcon />}>
          1. 禁止事項
        </SectionHeading>
        <p className="text-sm text-text-secondary">
          以下に該当する投稿・行為は禁止です。
        </p>
        <ul className="space-y-2">
          <BulletItem>誹謗中傷、差別、脅迫、嫌がらせ、粘着行為</BulletItem>
          <BulletItem>
            個人情報の投稿（SNSアカウントの晒し等を含む）
          </BulletItem>
          <BulletItem>なりすまし、虚偽情報の拡散</BulletItem>
          <BulletItem>スパム、宣伝、過度な連投、荒らし行為</BulletItem>
          <BulletItem>
            不正アクセス、またはサイトに過度な負荷をかける行為
          </BulletItem>
          <BulletItem>その他、運営が不適切と判断する行為</BulletItem>
        </ul>
      </section>

      {/* 2. 運営の対応 */}
      <section className="mt-8 space-y-4">
        <SectionHeading icon={<ShieldIcon />}>
          2. 運営の対応（削除・制限）
        </SectionHeading>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-text-secondary">
            明らかに問題がある投稿、または通報が入った投稿は、運営が確認のうえ削除・非表示にすることがあります。
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            また、迷惑行為が継続する場合は、投稿制限やBAN（投稿不可）等の対応を行うことがあります。
          </p>
          <p className="text-xs text-text-muted">
            ※対応理由の個別説明は行わない場合があります。
          </p>
        </div>
      </section>

      {/* 3. 著作権・権利について */}
      <section className="mt-8 space-y-4">
        <SectionHeading icon={<CopyrightIcon />}>
          3. 著作権・権利について
        </SectionHeading>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-text-secondary">
            当サイトは非公式のファンサイトです。
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            当サイトで使用しているゲーム内画像・キャラクター名・ステータス情報・スキル情報等の素材に関する権利は、Epid
            GAMES / Bilibili に帰属します。
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            これらの素材は『トリッカル・もちもちほっぺ大作戦』の公式に公開されたゲーム内リソースに基づき、非営利のファンサイト運営の範囲で使用しています。
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            問題がある場合は権利者からの連絡により速やかに対応します。
          </p>
        </div>
      </section>

      {/* 4. 免責 */}
      <section className="mt-8 space-y-4">
        <SectionHeading icon={<FileTextIcon />}>4. 免責</SectionHeading>
        <ul className="space-y-2">
          <BulletItem>
            掲載内容・ランキング・投稿内容の正確性を保証しません。
          </BulletItem>
          <BulletItem>
            ランキング結果は投稿内容に基づくもので、内容の真偽を保証しません。
          </BulletItem>
          <BulletItem>
            当サイトの利用により生じた損害について、運営は責任を負いません（法令上必要な範囲を除く）。
          </BulletItem>
        </ul>
      </section>

      {/* 5. 変更 */}
      <section className="mt-8 space-y-4">
        <SectionHeading icon={<RefreshCwIcon />}>5. 変更</SectionHeading>
        <p className="text-sm leading-relaxed text-text-secondary">
          本ガイドラインは必要に応じて予告なく更新することがあります。
        </p>
      </section>

      {/* お問い合わせ */}
      <section className="mt-8 space-y-4">
        <SectionHeading icon={<MailIcon />}>お問い合わせ</SectionHeading>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-text-secondary">
            権利者の方の削除依頼・その他のお問い合わせは、下記へご連絡ください。
          </p>
          <div className="rounded-2xl border border-border-primary bg-bg-tertiary px-3 py-3">
            <a
              href="mailto:contact@rank-nest.com"
              className="text-sm text-accent-secondary underline-offset-2 hover:underline"
            >
              contact@rank-nest.com
            </a>
          </div>
          <p className="text-xs text-text-muted">
            ※内容により返信できない場合があります。
          </p>
        </div>
      </section>

      {/* ホームに戻るボタン */}
      <div className="mt-10">
        <Link
          href="/trickcal"
          className="block w-full rounded-2xl border border-border-primary bg-bg-tertiary py-3 text-center text-sm font-medium text-text-primary transition-colors hover:bg-bg-card-hover"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
