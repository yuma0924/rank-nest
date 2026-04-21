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

type ReactionRow = { id: string; reaction_type: "up" | "down" };

/**
 * POST /api/builds/[buildId]/comments/[commentId]/reactions
 * 編成コメントに対する👍/👎リアクション
 *
 * ボディ:
 * - reaction_type: 'up' | 'down' | null（nullで取り消し）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ buildId: string; commentId: string }> }
) {
  try {
    const { buildId, commentId } = await params;
    const { userHash, cookieUuid, isNewCookie } = getUserHash(request);
    const supabase = createAdminClient();

    const [banned, rateLimit] = await Promise.all([
      isUserBanned(supabase, userHash),
      checkRateLimit(
        supabase,
        "build_comment_reactions",
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

    // コメントの存在確認（count は trigger 任せで読まない）
    const { data: rawComment } = await supabase
      .from("build_comments")
      .select("id")
      .eq("id", commentId)
      .eq("is_deleted", false)
      .maybeSingle();

    if (!rawComment) {
      return NextResponse.json(
        { error: "コメントが見つかりません" },
        { status: 404 }
      );
    }

    // 既存のリアクションを確認
    const { data: rawExisting } = await supabase
      .from("build_comment_reactions")
      .select("id, reaction_type")
      .eq("build_comment_id", commentId)
      .eq("user_hash", userHash)
      .maybeSingle();

    const existing = rawExisting as ReactionRow | null;

    // reaction 行の操作だけ。count は trigger が atomic に更新する。
    if (reaction_type === null) {
      if (existing) {
        await supabase
          .from("build_comment_reactions")
          .delete()
          .eq("id", existing.id);
      }
    } else if (existing) {
      if (existing.reaction_type !== reaction_type) {
        await supabase
          .from("build_comment_reactions")
          .update({
            reaction_type: reaction_type as "up" | "down",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    } else {
      await supabase.from("build_comment_reactions").insert({
        build_comment_id: commentId,
        user_hash: userHash,
        reaction_type: reaction_type as "up" | "down",
      });
    }

    // trigger 適用後の最新 count を取得
    const { data: updatedComment } = await supabase
      .from("build_comments")
      .select("thumbs_up_count, thumbs_down_count")
      .eq("id", commentId)
      .maybeSingle();

    revalidatePath(`/trickcal/builds/${buildId}`);

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      {
        thumbs_up_count: updatedComment?.thumbs_up_count ?? 0,
        thumbs_down_count: updatedComment?.thumbs_down_count ?? 0,
        user_reaction: reaction_type,
      },
      { headers }
    );
  } catch (error) {
    console.error(
      "POST /api/builds/[buildId]/comments/[commentId]/reactions error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
