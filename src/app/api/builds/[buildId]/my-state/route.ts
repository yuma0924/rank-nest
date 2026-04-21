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

    // 1 クエリで build + user's build_reaction + 各コメント counts + user's
    // comment_reaction をまとめて取得（consistent snapshot）。
    const { data: raw } = await supabase
      .from("builds")
      .select(
        `likes_count, dislikes_count,
         build_reactions!left(reaction_type),
         build_comments!left(
           id, thumbs_up_count, thumbs_down_count,
           build_comment_reactions!left(reaction_type)
         )`
      )
      .eq("id", buildId)
      .eq("build_reactions.user_hash", userHash)
      .eq("build_comments.is_deleted", false)
      .eq("build_comments.build_comment_reactions.user_hash", userHash)
      .maybeSingle();

    type RawComment = {
      id: string;
      thumbs_up_count: number;
      thumbs_down_count: number;
      build_comment_reactions:
        | { reaction_type: "up" | "down" }
        | { reaction_type: "up" | "down" }[]
        | null;
    };
    type RawRow = {
      likes_count: number;
      dislikes_count: number;
      build_reactions:
        | { reaction_type: "up" | "down" }
        | { reaction_type: "up" | "down" }[]
        | null;
      build_comments: RawComment[] | null;
    };

    const buildData = raw as RawRow | null;
    const userReactionRaw = buildData?.build_reactions;
    const userReactionRow = Array.isArray(userReactionRaw)
      ? userReactionRaw[0] ?? null
      : userReactionRaw;

    const commentReactions: Record<string, "up" | "down"> = {};
    const commentCounts: Record<string, { thumbs_up: number; thumbs_down: number }> = {};
    for (const c of buildData?.build_comments ?? []) {
      commentCounts[c.id] = {
        thumbs_up: c.thumbs_up_count,
        thumbs_down: c.thumbs_down_count,
      };
      const r = c.build_comment_reactions;
      const reaction = Array.isArray(r) ? r[0]?.reaction_type : r?.reaction_type;
      if (reaction) commentReactions[c.id] = reaction;
    }

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      {
        user_reaction: userReactionRow?.reaction_type ?? null,
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
