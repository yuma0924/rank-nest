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

    // tier 本体（user_hash + likes_count）+ user reaction + comment reactions + comment counts
    const [tierRow, userLikedRow, commentReactionsRows, commentCountsRows] = await Promise.all([
      supabase
        .from("tiers")
        .select("user_hash, likes_count")
        .eq("id", tierId)
        .maybeSingle(),
      supabase
        .from("tier_reactions")
        .select("id")
        .eq("tier_id", tierId)
        .eq("user_hash", userHash)
        .maybeSingle(),
      supabase
        .from("tier_comment_reactions")
        .select("tier_comment_id, reaction_type, tier_comments!inner(tier_id)")
        .eq("user_hash", userHash)
        .eq("tier_comments.tier_id", tierId),
      // 各コメントの thumbs_up/down も最新を返して count 表示の同期を取る
      supabase
        .from("tier_comments")
        .select("id, thumbs_up_count, thumbs_down_count")
        .eq("tier_id", tierId)
        .eq("is_deleted", false),
    ]);

    const commentReactions: Record<string, "up" | "down"> = {};
    for (const r of (commentReactionsRows.data ?? []) as {
      tier_comment_id: string;
      reaction_type: "up" | "down";
    }[]) {
      commentReactions[r.tier_comment_id] = r.reaction_type;
    }

    const commentCounts: Record<string, { thumbs_up: number; thumbs_down: number }> = {};
    for (const c of (commentCountsRows.data ?? []) as {
      id: string;
      thumbs_up_count: number;
      thumbs_down_count: number;
    }[]) {
      commentCounts[c.id] = {
        thumbs_up: c.thumbs_up_count,
        thumbs_down: c.thumbs_down_count,
      };
    }

    const tierData = tierRow.data as { user_hash: string; likes_count: number } | null;

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      {
        user_liked: !!userLikedRow.data,
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
