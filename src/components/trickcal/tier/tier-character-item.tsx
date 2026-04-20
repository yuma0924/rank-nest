"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CharacterIcon } from "@/components/trickcal/character/character-icon";

type IconSize = "sm" | "md" | "lg";

interface TierCharacterItemProps {
  id: string;
  name: string;
  imageUrl: string | null;
  isDraggable?: boolean;
  showName?: boolean;
  size?: IconSize;
  iconClassName?: string;
}

export function TierCharacterItem({
  id,
  name,
  imageUrl,
  isDraggable = false,
  showName = true,
  size = "sm",
  iconClassName,
}: TierCharacterItemProps) {
  if (!isDraggable) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <CharacterIcon name={name} imageUrl={imageUrl} size={size} className={iconClassName} />
        {showName && (
          <span className="max-w-12 truncate text-center text-[9px] text-text-muted">
            {name}
          </span>
        )}
      </div>
    );
  }

  return <DraggableItem id={id} name={name} imageUrl={imageUrl} showName={showName} size={size} iconClassName={iconClassName} />;
}

function DraggableItem({
  id,
  name,
  imageUrl,
  showName,
  size,
  iconClassName,
}: {
  id: string;
  name: string;
  imageUrl: string | null;
  showName: boolean;
  size: IconSize;
  iconClassName?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex flex-col items-center gap-0.5 select-none"
    >
      <CharacterIcon name={name} imageUrl={imageUrl} size={size} className={iconClassName} />
      {showName && (
        <span className="max-w-12 truncate text-center text-[9px] text-text-muted">
          {name}
        </span>
      )}
    </div>
  );
}
