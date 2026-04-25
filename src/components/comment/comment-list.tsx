"use client";

import { Tab } from "@/components/ui/tab";
import { Pagination } from "@/components/ui/pagination";
import { CommentCard } from "@/components/comment/comment-card";
import { cn } from "@/lib/utils";

type SortTab = "newest" | "thumbs_up";
type ReactionState = "up" | "down" | null;

interface Comment {
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
}

interface CommentListProps {
  comments: Comment[];
  totalCount: number;
  sortTab: SortTab;
  onSortChange: (tab: SortTab) => void;
  onLoadMore: () => void;
  loading?: boolean;
  userReactions?: Record<string, ReactionState>;
  onReact?: (commentId: string, reaction: ReactionState) => void;
  onReport?: (commentId: string) => void;
  onImageClick?: (url: string) => void;
  accentColor?: string;
  className?: string;
  hideTab?: boolean;
}

const SORT_TABS = [
  { value: "newest" as const, label: "新着順" },
  { value: "thumbs_up" as const, label: "人気順" },
];

export function CommentList({
  comments,
  totalCount,
  sortTab,
  onSortChange,
  onLoadMore,
  loading = false,
  userReactions = {},
  onReact,
  onReport,
  onImageClick,
  accentColor,
  className,
  hideTab = false,
}: CommentListProps) {
  const remaining = totalCount - comments.length;

  return (
    <div className={cn("space-y-3", className)}>
      {!hideTab && <Tab items={SORT_TABS} value={sortTab} onChange={onSortChange} />}

      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary">
          まだコメントがありません
        </p>
      ) : (
        <div className="space-y-2.5">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              {...comment}
              userReaction={userReactions[comment.id]}
              onReact={onReact}
              onReport={onReport}
              onImageClick={onImageClick}
              accentColor={accentColor}
            />
          ))}
        </div>
      )}

      <Pagination
        remaining={remaining}
        onLoadMore={onLoadMore}
        loading={loading}
      />
    </div>
  );
}
