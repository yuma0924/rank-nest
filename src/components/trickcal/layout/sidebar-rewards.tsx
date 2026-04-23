import Link from "next/link";
import { getRewardItemsCached } from "@/lib/trickcal/cached-queries";

const ACCENT_ITEM_NAME = "再生プラスチック";

export async function SidebarRewards() {
  const items = await getRewardItemsCached();
  const accentItem = items.find((i) => i.name === ACCENT_ITEM_NAME);

  return (
    <Link
      href="/trickcal/rewards"
      className="flex items-center gap-2 rounded-2xl border border-border-primary bg-bg-card pl-4 pr-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-bg-card-hover"
    >
      {accentItem?.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={accentItem.image_url}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          className="h-7 w-7 shrink-0 rounded-md"
        />
      )}
      <span className="whitespace-nowrap text-sm font-bold text-text-primary">
        アルバイト報酬一覧
      </span>
    </Link>
  );
}
