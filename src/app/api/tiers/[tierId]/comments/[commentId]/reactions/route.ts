import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getUserHash,
  isUserBanned,
  checkRateLimit,
  setCookieHeaders,
} from "@/app/api/_helpers";

const REACTION_RATE_LIMIT_SECONDS = 1;

type CommentRow = { id: string; thumbs_up_count: number; thumbs_down_count: number };
type ReactionRow = { id: string; reaction_type: "up" | "down" };

/**
 * POST /api/tiers/[tierId]/comments/[commentId]/reactions
 * ティアコメントに対する👍/👎リアクション
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tierId: string; commentId: string }> }
) {
  try {
    const { tierId, commentId } = await params;
    const { userHash, cookieUuid, isNewCookie } = getUserHash(request);
    const supabase = createAdminClient();

    const [banned, rateLimit] = await Promise.all([
      isUserBanned(supabase, userHash),
      checkRateLimit(
        supabase,
        "tier_comment_reactions",
        { user_hash: userHash },
        REACTION_RATE_LIMIT_SECONDS
      ),
    ]);
    if (banned) {
      return NextResponse.json(
        { error: "操作できませんでした。時間をおいて再度お試しください。" },
        { status: 403 }
      );
    }
    if (rateLimit.limited) {
      return NextResponse.json(
        { error: "連打しすぎです。少し待ってから再度お試しください。", retry_after: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    let parsed: { reaction_type?: string | null };
    try {
      parsed = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { reaction_type } = parsed;

    if (
      reaction_type !== "up" &&
      reaction_type !== "down" &&
      reaction_type !== null
    ) {
      return NextResponse.json(
        { error: "reaction_type は 'up', 'down', null のいずれかを指定してください" },
        { status: 400 }
      );
    }

    // コメントの存在確認
    const { data: rawComment } = await supabase
      .from("tier_comments")
      .select("id, thumbs_up_count, thumbs_down_count")
      .eq("id", commentId)
      .eq("is_deleted", false)
      .single();

    const comment = rawComment as CommentRow | null;

    if (!comment) {
      return NextResponse.json(
        { error: "コメントが見つかりません" },
        { status: 404 }
      );
    }

    // 既存のリアクションを確認
    const { data: rawExisting } = await supabase
      .from("tier_comment_reactions")
      .select("id, reaction_type")
      .eq("tier_comment_id", commentId)
      .eq("user_hash", userHash)
      .single();

    const existing = rawExisting as ReactionRow | null;

    let newThumbsUp = comment.thumbs_up_count;
    let newThumbsDown = comment.thumbs_down_count;

    if (reaction_type === null) {
      // 取り消し
      if (existing) {
        if (existing.reaction_type === "up") newThumbsUp--;
        if (existing.reaction_type === "down") newThumbsDown--;

        await supabase
          .from("tier_comment_reactions")
          .delete()
          .eq("id", existing.id);
      }
    } else if (existing) {
      // 変更
      if (existing.reaction_type !== reaction_type) {
        if (existing.reaction_type === "up") newThumbsUp--;
        if (existing.reaction_type === "down") newThumbsDown--;
        if (reaction_type === "up") newThumbsUp++;
        if (reaction_type === "down") newThumbsDown++;

        await supabase
          .from("tier_comment_reactions")
          .update({
            reaction_type: reaction_type as "up" | "down",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    } else {
      // 新規
      if (reaction_type === "up") newThumbsUp++;
      if (reaction_type === "down") newThumbsDown++;

      await supabase.from("tier_comment_reactions").insert({
        tier_comment_id: commentId,
        user_hash: userHash,
        reaction_type: reaction_type as "up" | "down",
      });
    }

    // カウントを更新
    await supabase
      .from("tier_comments")
      .update({
        thumbs_up_count: newThumbsUp,
        thumbs_down_count: newThumbsDown,
      })
      .eq("id", commentId);

    revalidatePath(`/trickcal/tiers/${tierId}`);

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      {
        thumbs_up_count: newThumbsUp,
        thumbs_down_count: newThumbsDown,
        user_reaction: reaction_type,
      },
      { headers }
    );
  } catch (error) {
    console.error(
      "POST /api/tiers/[tierId]/comments/[commentId]/reactions error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
