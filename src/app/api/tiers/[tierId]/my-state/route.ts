import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserHash, setCookieHeaders } from "@/app/api/_helpers";

/**
 * GET /api/tiers/[tierId]/my-state
 * 自分のいいね状態・自分のコメントリアクションをまとめて1回で返す。
 * クライアントが詳細ページ表示直後に呼び出す想定。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tierId: string }> }
) {
  try {
    const { tierId } = await params;
    const { userHash, cookieUuid, isNewCookie } = getUserHash(request);
    const supabase = createAdminClient();

    // 1 クエリで tier + user's tier_reaction + 各コメントの counts と
    // user's comment_reaction をまとめて取得。独立トランザクションで発生する
    // スナップショット不整合（例: user_reaction は新しいが counts は古い）を防ぐ。
    const { data: raw } = await supabase
      .from("tiers")
      .select(
        `user_hash, likes_count,
         tier_reactions!left(id),
         tier_comments!left(
           id, thumbs_up_count, thumbs_down_count,
           tier_comment_reactions!left(reaction_type)
         )`
      )
      .eq("id", tierId)
      .eq("tier_reactions.user_hash", userHash)
      .eq("tier_comments.is_deleted", false)
      .eq("tier_comments.tier_comment_reactions.user_hash", userHash)
      .maybeSingle();

    type RawComment = {
      id: string;
      thumbs_up_count: number;
      thumbs_down_count: number;
      tier_comment_reactions:
        | { reaction_type: "up" | "down" }
        | { reaction_type: "up" | "down" }[]
        | null;
    };
    type RawRow = {
      user_hash: string;
      likes_count: number;
      tier_reactions: { id: string } | { id: string }[] | null;
      tier_comments: RawComment[] | null;
    };

    const tierData = raw as RawRow | null;
    const userReactionRaw = tierData?.tier_reactions;
    const userReactionRow = Array.isArray(userReactionRaw)
      ? userReactionRaw[0] ?? null
      : userReactionRaw;

    const commentReactions: Record<string, "up" | "down"> = {};
    const commentCounts: Record<string, { thumbs_up: number; thumbs_down: number }> = {};
    for (const c of tierData?.tier_comments ?? []) {
      commentCounts[c.id] = {
        thumbs_up: c.thumbs_up_count,
        thumbs_down: c.thumbs_down_count,
      };
      const r = c.tier_comment_reactions;
      const reaction = Array.isArray(r) ? r[0]?.reaction_type : r?.reaction_type;
      if (reaction) commentReactions[c.id] = reaction;
    }

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      {
        user_liked: !!userReactionRow,
        is_owner: !!tierData && tierData.user_hash === userHash,
        likes_count: tierData?.likes_count ?? 0,
        comment_reactions: commentReactions,
        comment_counts: commentCounts,
      },
      { headers }
    );
  } catch (error) {
    console.error("GET /api/tiers/[tierId]/my-state error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
