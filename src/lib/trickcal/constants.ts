export const SITE_NAME = "みんなで決めるトリッカルランキング";
export const DEFAULT_DISPLAY_NAME = "名無しの教主";
export const MAX_DISPLAY_NAME_LENGTH = 30;

export const ELEMENTS = ["純粋", "冷静", "狂気", "活発", "憂鬱"] as const;
export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_COLORS: Record<Element, string> = {
  純粋: "#22c55e",
  冷静: "#3b82f6",
  狂気: "#ef4444",
  活発: "#eab308",
  憂鬱: "#a855f7",
};

export const ELEMENT_ICONS: Record<string, string> = {
  純粋: "/icons/pure.png",
  冷静: "/icons/calm.png",
  狂気: "/icons/madness.png",
  活発: "/icons/lively.png",
  憂鬱: "/icons/melancholy.png",
};

export const BUILD_MODES = [
  "general",
  "arena",
  "dimension",
  "world_tree",
  "alias",
] as const;
export type BuildMode = (typeof BUILD_MODES)[number];

export const BUILD_MODE_OPTIONS: { value: BuildMode; label: string }[] = [
  { value: "general", label: "汎用編成" },
  { value: "arena", label: "PvP" },
  { value: "dimension", label: "次元の衝突" },
  { value: "world_tree", label: "世界樹採掘基地" },
  { value: "alias", label: "エーリアスフロンティア" },
];

export const BUILD_MODE_LABEL_MAP: Record<BuildMode, string> = {
  general: "汎用",
  arena: "PvP",
  dimension: "次元",
  world_tree: "世界樹",
  alias: "エーリアス",
};

// mode の編成サイズ上限。dimension は 9 固定、alias は M.E.O.W も含めて最大 9。
// 他は 6 固定。
export function getBuildMaxPartySize(mode: BuildMode): number {
  if (mode === "dimension" || mode === "alias") return 9;
  return 6;
}

// 投稿フォームでの実際の編成サイズ。alias は M.E.O.W トグルで 6 か 9 を切替。
export function getBuildFormPartySize(mode: BuildMode, isMeow: boolean): number {
  if (mode === "dimension") return 9;
  if (mode === "alias") return isMeow ? 9 : 6;
  return 6;
}

// 既存の編成データが M.E.O.W 編成かどうか判定（一覧/詳細ページ表示用）
export function isMeowBuild(mode: BuildMode, partySize: number): boolean {
  return mode === "alias" && partySize === 9;
}

export const ROLE_ICON_MAP: Record<string, string> = {
  攻撃: "/icons/attack.png",
  守備: "/icons/defense.png",
  支援: "/icons/support.png",
};

export const POSITION_ICON_MAP: Record<string, string> = {
  前列: "/icons/front.png",
  中列: "/icons/middle.png",
  後列: "/icons/back.png",
};

export const ATTACK_TYPE_ICON_MAP: Record<string, string> = {
  物理: "/icons/physical.png",
  魔法: "/icons/magical.png",
};

export const TIER_LABELS = ["S", "A", "B", "C", "D", "E"] as const;
export type TierLabel = (typeof TIER_LABELS)[number];

export const TIER_COLORS: Record<TierLabel, string> = {
  S: "#ef4444",
  A: "#f97316",
  B: "#eab308",
  C: "#22c55e",
  D: "#3b82f6",
  E: "#a855f7",
};
