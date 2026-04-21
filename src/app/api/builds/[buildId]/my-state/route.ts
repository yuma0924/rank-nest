import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserHash, setCookieHeaders } from "@/app/api/_helpers";

/**
 * GET /api/builds/[buildId]/my-state
 * 自分の 👍/👎 状態・自分のコメントリアクションをまとめて1回で返す。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  try {
    const { buildId } = await params;
    const { userHash, cookieUuid, isNewCookie } = getUserHash(request);
    const supabase = createAdminClient();

    const [buildRow, userReactionRow, commentReactionsRows, commentCountsRows] = await Promise.all([
      supabase
        .from("builds")
        .select("likes_count, dislikes_count")
        .eq("id", buildId)
        .maybeSingle(),
      supabase
        .from("build_reactions")
        .select("reaction_type")
        .eq("build_id", buildId)
        .eq("user_hash", userHash)
        .maybeSingle(),
      supabase
        .from("build_comment_reactions")
        .select("build_comment_id, reaction_type, build_comments!inner(build_id)")
        .eq("user_hash", userHash)
        .eq("build_comments.build_id", buildId),
      supabase
        .from("build_comments")
        .select("id, thumbs_up_count, thumbs_down_count")
        .eq("build_id", buildId)
        .eq("is_deleted", false),
    ]);

    const commentReactions: Record<string, "up" | "down"> = {};
    for (const r of (commentReactionsRows.data ?? []) as {
      build_comment_id: string;
      reaction_type: "up" | "down";
    }[]) {
      commentReactions[r.build_comment_id] = r.reaction_type;
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

    const buildData = buildRow.data as { likes_count: number; dislikes_count: number } | null;

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      {
        user_reaction:
          (userReactionRow.data as { reaction_type: "up" | "down" } | null)?.reaction_type ?? null,
        likes_count: buildData?.likes_count ?? 0,
        dislikes_count: buildData?.dislikes_count ?? 0,
        comment_reactions: commentReactions,
        comment_counts: commentCounts,
      },
      { headers }
    );
  } catch (error) {
    console.error("GET /api/builds/[buildId]/my-state error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
