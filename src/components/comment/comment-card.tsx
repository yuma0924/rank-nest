import { cn } from "@/lib/utils";
import { StarRatingDisplay } from "@/components/ui/star-rating";
import { ThumbsUpDown } from "@/components/reaction/thumbs-up-down";

type ReactionState = "up" | "down" | null;

interface CommentCardProps {
  id: string;
  commentType: "vote" | "board";
  displayName: string;
  body: string;
  rating?: number | null;
  thumbsUpCount: number;
  thumbsDownCount: number;
  createdAt: string;
  isLatestVote?: boolean;
  isDeleted?: boolean;
  imageUrl?: string | null;
  onImageClick?: (url: string) => void;
  userReaction?: ReactionState;
  onReact?: (commentId: string, reaction: ReactionState) => void;
  onReport?: (commentId: string) => void;
  accentColor?: string;
  className?: string;
}

function getKarmaClass(netScore: number): string {
  if (netScore >= 30) return "karma-gold";
  if (netScore >= 15) return "karma-bold";
  if (netScore <= -30) return "karma-very-dim";
  if (netScore <= -15) return "karma-dim";
  return "";
}

export function CommentCard({
  id,
  commentType,
  displayName,
  body,
  rating,
  thumbsUpCount,
  thumbsDownCount,
  createdAt,
  isDeleted = false,
  imageUrl,
  onImageClick,
  userReaction,
  onReact,
  onReport,
  accentColor,
  className,
}: CommentCardProps) {
  const netScore = thumbsUpCount - thumbsDownCount;
  const karmaClass = getKarmaClass(netScore);

  if (isDeleted) {
    return (
      <div className={cn("rounded-2xl bg-bg-card/30 border border-border-primary p-4 opacity-50", className)}>
        <p className="text-sm text-text-tertiary">このコメントは削除されました</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-bg-card border border-border-primary px-4 pt-4 pb-3 transition-all",
        karmaClass,
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        {accentColor && (
          <div
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        )}
        <div className="flex flex-col -mt-1">
          <span className="text-base font-medium text-text-primary">
            {displayName}
          </span>
          <span className="text-xs md:text-sm text-text-muted">
            {new Date(createdAt).toLocaleDateString("ja-JP")}
          </span>
        </div>
        {commentType === "vote" && rating !== null && rating !== undefined && (
          <div className="ml-auto">
            <StarRatingDisplay rating={rating} size="md" />
          </div>
        )}
      </div>

      <p className="mt-2.5 whitespace-pre-wrap text-base text-text-secondary leading-relaxed">
        {body}
      </p>

      {imageUrl && (
        <button
          type="button"
          onClick={() => onImageClick?.(imageUrl)}
          className="mt-2.5 block overflow-hidden rounded-xl border border-border-primary transition-opacity hover:opacity-90"
          aria-label="画像を拡大表示"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="添付画像"
            loading="lazy"
            decoding="async"
            className="max-h-[160px] max-w-[240px] object-contain"
          />
        </button>
      )}

      <div className="mt-4 flex items-center gap-4 text-text-muted text-xs md:text-sm">
        <ThumbsUpDown
          thumbsUpCount={thumbsUpCount}
          thumbsDownCount={thumbsDownCount}
          userReaction={userReaction}
          onReact={onReact ? (reaction) => onReact(id, reaction) : undefined}
        />
        {onReport && (
          <button
            type="button"
            onClick={() => onReport(id)}
            className="ml-auto rounded-full border border-border-primary px-2.5 py-1 text-[10px] md:text-xs text-text-muted transition-colors hover:border-thumbs-down/20 hover:text-thumbs-down cursor-pointer"
          >
            通報
          </button>
        )}
      </div>
    </div>
  );
}
