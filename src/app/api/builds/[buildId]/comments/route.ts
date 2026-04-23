import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_DISPLAY_NAME, MAX_DISPLAY_NAME_LENGTH } from "@/lib/trickcal/constants";
import type { BuildComment } from "@/types/trickcal";
import {
  getUserHash,
  isUserBanned,
  checkRateLimit,
  setCookieHeaders,
} from "@/app/api/_helpers";

const PAGE_SIZE = 20;
const COMMENT_RATE_LIMIT_SECONDS = 10;

type CommentReactionRow = {
  build_comment_id: string;
  reaction_type: "up" | "down";
};

/**
 * GET /api/builds/[buildId]/comments
 * 編成コメント一覧を取得
 *
 * クエリパラメータ:
 * - sort: 'newest' | 'thumbs_up' | 'thumbs_down'（デフォルト: newest）
 * - cursor: ページネーションカーソル
 * - limit: 取得件数（デフォルト20）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  try {
    const { buildId } = await params;
    const { searchParams } = request.nextUrl;
    const sort = searchParams.get("sort") || "newest";
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      Number(searchParams.get("limit")) || PAGE_SIZE,
      50
    );

    const supabase = createAdminClient();

    let items: BuildComment[] = [];
    let queryError: string | null = null;

    if (cursor) {
      const { data: rawCursor } = await supabase
        .from("build_comments")
        .select("thumbs_up_count, thumbs_down_count, created_at")
        .eq("id", cursor)
        .single();

      const cursorComment = rawCursor as Pick<
        BuildComment,
        "thumbs_up_count" | "thumbs_down_count" | "created_at"
      > | null;

      if (cursorComment) {
        let q;

        switch (sort) {
          case "thumbs_up":
            q = supabase
              .from("build_comments")
              .select("*")
              .eq("build_id", buildId)
              .eq("is_deleted", false)
              .or(
                `thumbs_up_count.lt.${cursorComment.thumbs_up_count},` +
                `and(thumbs_up_count.eq.${cursorComment.thumbs_up_count},created_at.lt.${cursorComment.created_at})`
              )
              .order("thumbs_up_count", { ascending: false })
              .order("created_at", { ascending: false });
            break;
          case "thumbs_down":
            q = supabase
              .from("build_comments")
              .select("*")
              .eq("build_id", buildId)
              .eq("is_deleted", false)
              .or(
                `thumbs_down_count.lt.${cursorComment.thumbs_down_count},` +
                `and(thumbs_down_count.eq.${cursorComment.thumbs_down_count},created_at.lt.${cursorComment.created_at})`
              )
              .order("thumbs_down_count", { ascending: false })
              .order("created_at", { ascending: false });
            break;
          default:
            q = supabase
              .from("build_comments")
              .select("*")
              .eq("build_id", buildId)
              .eq("is_deleted", false)
              .lt("created_at", cursorComment.created_at)
              .order("created_at", { ascending: false });
            break;
        }

        const { data, error } = await q.limit(limit + 1);
        if (error) queryError = error.message;
        items = (data as BuildComment[]) ?? [];
      }
    }

    if (!cursor || items.length === 0) {
      if (!queryError) {
        let q;
        switch (sort) {
          case "thumbs_up":
            q = supabase
              .from("build_comments")
              .select("*")
              .eq("build_id", buildId)
              .eq("is_deleted", false)
              .order("thumbs_up_count", { ascending: false })
              .order("created_at", { ascending: false });
            break;
          case "thumbs_down":
            q = supabase
              .from("build_comments")
              .select("*")
              .eq("build_id", buildId)
              .eq("is_deleted", false)
              .order("thumbs_down_count", { ascending: false })
              .order("created_at", { ascending: false });
            break;
          default:
            q = supabase
              .from("build_comments")
              .select("*")
              .eq("build_id", buildId)
              .eq("is_deleted", false)
              .order("created_at", { ascending: false });
            break;
        }

        const { data, error } = await q.limit(limit + 1);
        if (error) queryError = error.message;
        items = (data as BuildComment[]) ?? [];
      }
    }

    if (queryError) {
      console.error("GET /api/builds/[buildId]/comments query error:", queryError);
      return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
    }

    const hasMore = items.length > limit;
    const pageItems = items.slice(0, limit);
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id : null;

    // ユーザーのリアクション状態
    const { userHash } = getUserHash(request);
    const commentIds = pageItems.map((c) => c.id);
    let userReactions: Record<string, "up" | "down"> = {};

    if (commentIds.length > 0) {
      const { data: rawReactions } = await supabase
        .from("build_comment_reactions")
        .select("build_comment_id, reaction_type")
        .eq("user_hash", userHash)
        .in("build_comment_id", commentIds);

      if (rawReactions) {
        const reactions = rawReactions as CommentReactionRow[];
        userReactions = Object.fromEntries(
          reactions.map((r) => [r.build_comment_id, r.reaction_type])
        );
      }
    }

    return NextResponse.json({
      comments: pageItems.map((c) => ({
        ...c,
        user_reaction: userReactions[c.id] ?? null,
      })),
      next_cursor: nextCursor,
      has_more: hasMore,
    });
  } catch (error) {
    console.error("GET /api/builds/[buildId]/comments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/builds/[buildId]/comments
 * 編成にコメントを投稿
 *
 * ボディ:
 * - body: string（最大300文字 / 最大8行）
 * - display_name?: string（投稿者名、任意）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  try {
    const { buildId } = await params;
    const { userHash, cookieUuid, isNewCookie } = getUserHash(request);
    const supabase = createAdminClient();

    // JSON パース + バリデーションを DB 呼び出し前に
    let parsed: { body?: string; display_name?: string };
    try {
      parsed = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { body: commentBody, display_name } = parsed;

    if (
      !commentBody ||
      typeof commentBody !== "string" ||
      commentBody.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "コメントは必須です" },
        { status: 400 }
      );
    }

    if (commentBody.length > 300) {
      return NextResponse.json(
        { error: "コメントは300文字以内で入力してください" },
        { status: 400 }
      );
    }

    if (commentBody.split("\n").length > 8) {
      return NextResponse.json(
        { error: "コメントは8行以内で入力してください" },
        { status: 400 }
      );
    }

    if (
      display_name &&
      typeof display_name === "string" &&
      display_name.length > MAX_DISPLAY_NAME_LENGTH
    ) {
      return NextResponse.json(
        { error: `display_name は${MAX_DISPLAY_NAME_LENGTH}文字以内で入力してください` },
        { status: 400 }
      );
    }

    // 3 つのチェックを並列化
    const [banned, rateLimit, buildCheck] = await Promise.all([
      isUserBanned(supabase, userHash),
      checkRateLimit(
        supabase,
        "build_comments",
        { build_id: buildId, user_hash: userHash },
        COMMENT_RATE_LIMIT_SECONDS
      ),
      supabase
        .from("builds")
        .select("id")
        .eq("id", buildId)
        .eq("is_deleted", false)
        .maybeSingle(),
    ]);

    if (banned) {
      return NextResponse.json(
        { error: "投稿できませんでした。時間をおいて再度お試しください。" },
        { status: 403 }
      );
    }
    if (rateLimit.limited) {
      return NextResponse.json(
        {
          error: `投稿間隔が短すぎます。${rateLimit.retryAfter}秒後に再度お試しください。`,
          retry_after: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }
    if (!buildCheck.data) {
      return NextResponse.json(
        { error: "編成が見つかりません" },
        { status: 404 }
      );
    }

    const finalDisplayName = display_name?.trim() || DEFAULT_DISPLAY_NAME;

    const { data: newComment, error: insertError } = await supabase
      .from("build_comments")
      .insert({
        build_id: buildId,
        user_hash: userHash,
        display_name: finalDisplayName,
        body: commentBody.trim(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("POST /api/builds/[buildId]/comments insert error:", insertError.message);
      return NextResponse.json(
        { error: "サーバーエラーが発生しました" },
        { status: 500 }
      );
    }

    revalidatePath(`/trickcal/builds/${buildId}`);

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      { comment: { ...newComment, user_reaction: null } },
      { status: 201, headers }
    );
  } catch (error) {
    console.error("POST /api/builds/[buildId]/comments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
