import Link from "next/link";
import { ELEMENTS, ELEMENT_COLORS, ELEMENT_ICONS } from "@/lib/trickcal/constants";
import type { Element } from "@/lib/trickcal/constants";


type CharRow = {
  id: string;
  slug: string;
  name: string;
  element: string | null;
  image_url: string | null;
};

interface SidebarCharactersProps {
  characters: CharRow[];
}

export function SidebarCharacters({ characters }: SidebarCharactersProps) {
  const grouped = new Map<string, CharRow[]>();
  for (const elem of ELEMENTS) {
    grouped.set(elem, []);
  }
  for (const c of characters) {
    if (c.element && grouped.has(c.element)) {
      grouped.get(c.element)!.push(c);
    }
  }

  return (
    <div className="rounded-2xl border border-border-primary bg-bg-card p-3">
      <p className="mb-2 text-xs font-bold text-text-tertiary">キャラクター</p>
      <div className="space-y-3">
        {ELEMENTS.map((elem) => {
          const chars = grouped.get(elem) ?? [];
          if (chars.length === 0) return null;
          const color = ELEMENT_COLORS[elem as Element];
          return (
            <div key={elem}>
              <div className="mb-1.5 flex items-center gap-1.5">
                {ELEMENT_ICONS[elem] && (
                  <img
                    src={ELEMENT_ICONS[elem]}
                    alt={elem}
                    width={16}
                    height={16}
                    decoding="async"
                    className="h-4 w-4"
                  />
                )}
                <span
                  className="text-[11px] font-bold"
                  style={{ color }}
                >
                  {elem}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                {chars.map((c) => (
                  <Link
                    key={c.id}
                    href={`/trickcal/characters/${c.slug}`}
                    className="flex items-center gap-1.5 rounded-lg px-1 py-1 transition-colors hover:bg-bg-card-hover"
                  >
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        width={48}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        className="h-7 w-7 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-7 w-7 shrink-0 rounded-md bg-bg-tertiary" />
                    )}
                    <span className="truncate text-[11px] text-text-secondary">
                      {c.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
