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

    // tier 所有者判定のため tier の user_hash を取得（軽い）
    const [tierRow, userLikedRow, commentReactionsRows] = await Promise.all([
      supabase.from("tiers").select("user_hash").eq("id", tierId).maybeSingle(),
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
    ]);

    const commentReactions: Record<string, "up" | "down"> = {};
    for (const r of (commentReactionsRows.data ?? []) as {
      tier_comment_id: string;
      reaction_type: "up" | "down";
    }[]) {
      commentReactions[r.tier_comment_id] = r.reaction_type;
    }

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      {
        user_liked: !!userLikedRow.data,
        is_owner:
          !!tierRow.data &&
          (tierRow.data as { user_hash: string }).user_hash === userHash,
        comment_reactions: commentReactions,
      },
      { headers }
    );
  } catch (error) {
    console.error("GET /api/tiers/[tierId]/my-state error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
