import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getUserHash,
  isUserBanned,
  checkRateLimit,
  setCookieHeaders,
} from "@/app/api/_helpers";
import { DEFAULT_DISPLAY_NAME, MAX_DISPLAY_NAME_LENGTH } from "@/lib/trickcal/constants";

const MAX_BODY_LENGTH = 300;
const MAX_BODY_LINES = 8;
const VOTE_RATE_LIMIT_SECONDS = 30;
const BOARD_RATE_LIMIT_SECONDS = 10;

/**
 * コメント取得 API
 * GET /api/comments?character_id=xxx&sort=new|thumbs_up|thumbs_down&limit=20&offset=0
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const characterId = searchParams.get("character_id");
  const sort = searchParams.get("sort") ?? "new";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  if (!characterId) {
    return NextResponse.json(
      { error: "character_id is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // ソート条件を構築
  let orderColumn: string;
  let ascending: boolean;

  switch (sort) {
    case "thumbs_up":
      orderColumn = "thumbs_up_count";
      ascending = false;
      break;
    case "thumbs_down":
      orderColumn = "thumbs_down_count";
      ascending = false;
      break;
    case "new":
    default:
      orderColumn = "created_at";
      ascending = false;
      break;
  }

  const { data, error, count } = await supabase
    .from("comments")
    .select("*", { count: "exact" })
    .eq("character_id", characterId)
    .eq("is_deleted", false)
    .order(orderColumn, { ascending })
    .order("created_at", { ascending: false }) // 同点時は新しい順
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("GET /api/comments query error:", error.message);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  return NextResponse.json({
    comments: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}

/**
 * コメント投稿 API
 * POST /api/comments
 * Body: {
 *   character_id: string,
 *   comment_type: "vote" | "board",
 *   rating?: number (0.5〜5.0, 0.5刻み。voteの場合必須),
 *   body?: string (最大300文字 / 最大8行),
 *   display_name?: string
 * }
 */
export async function POST(request: NextRequest) {
  let parsed: {
    character_id?: string;
    comment_type?: string;
    rating?: number;
    body?: string;
    display_name?: string;
  };

  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { character_id, comment_type, rating, body, display_name } = parsed;

  // バリデーション
  if (!character_id) {
    return NextResponse.json(
      { error: "character_id is required" },
      { status: 400 }
    );
  }

  if (comment_type !== "vote" && comment_type !== "board") {
    return NextResponse.json(
      { error: "comment_type must be 'vote' or 'board'" },
      { status: 400 }
    );
  }

  if (comment_type === "vote") {
    if (rating === undefined || rating === null) {
      return NextResponse.json(
        { error: "rating is required for vote comments" },
        { status: 400 }
      );
    }
    if (rating < 0.5 || rating > 5.0 || rating % 0.5 !== 0) {
      return NextResponse.json(
        { error: "rating must be between 0.5 and 5.0 in 0.5 increments" },
        { status: 400 }
      );
    }
  }

  if (
    display_name !== undefined &&
    display_name !== null &&
    typeof display_name === "string" &&
    display_name.length > MAX_DISPLAY_NAME_LENGTH
  ) {
    return NextResponse.json(
      { error: `display_name は${MAX_DISPLAY_NAME_LENGTH}文字以内で入力してください` },
      { status: 400 }
    );
  }

  if (body !== undefined && body !== null) {
    if (body.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { error: `body must be ${MAX_BODY_LENGTH} characters or less` },
        { status: 400 }
      );
    }
    const lines = body.split("\n");
    if (lines.length > MAX_BODY_LINES) {
      return NextResponse.json(
        { error: `body must be ${MAX_BODY_LINES} lines or less` },
        { status: 400 }
      );
    }
  }

  // user_hash 生成
  let hashInfo;
  try {
    hashInfo = getUserHash(request);
  } catch {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const { userHash, cookieUuid, isNewCookie } = hashInfo;

  const supabase = createAdminClient();

  // 3 つのチェックを並列化
  const rateLimitSeconds =
    comment_type === "vote" ? VOTE_RATE_LIMIT_SECONDS : BOARD_RATE_LIMIT_SECONDS;

  const [banned, rateLimit, characterCheck] = await Promise.all([
    isUserBanned(supabase, userHash),
    checkRateLimit(
      supabase,
      "comments",
      { character_id, user_hash: userHash, comment_type },
      rateLimitSeconds
    ),
    supabase
      .from("characters")
      .select("id, slug")
      .eq("id", character_id)
      .eq("is_hidden", false)
      .maybeSingle(),
  ]);

  if (banned) {
    return NextResponse.json(
      { error: "投稿できません" },
      { status: 403 }
    );
  }
  if (rateLimit.limited) {
    return NextResponse.json(
      {
        error: `投稿間隔が短すぎます。${rateLimit.retryAfter}秒後にお試しください`,
        retry_after: rateLimit.retryAfter,
      },
      { status: 429 }
    );
  }
  if (!characterCheck.data) {
    return NextResponse.json(
      { error: "Character not found" },
      { status: 404 }
    );
  }

  // 投票コメントの場合: 既存の is_latest_vote を false に更新
  if (comment_type === "vote") {
    await supabase
      .from("comments")
      .update({ is_latest_vote: false })
      .eq("character_id", character_id)
      .eq("user_hash", userHash)
      .eq("comment_type", "vote")
      .eq("is_latest_vote", true);
  }

  // コメント挿入
  const { data: newComment, error: insertError } = await supabase
    .from("comments")
    .insert({
      character_id,
      user_hash: userHash,
      comment_type,
      rating: comment_type === "vote" ? rating : null,
      body: body ?? null,
      display_name: display_name || DEFAULT_DISPLAY_NAME,
      is_latest_vote: comment_type === "vote" ? true : null,
    })
    .select()
    .single();

  if (insertError) {
    console.error("POST /api/comments insert error:", insertError.message);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  // ISR キャッシュを無効化（slug は characterCheck 結果から取得済み）
  const charSlug = (characterCheck.data as { slug: string } | null)?.slug;
  if (charSlug) {
    revalidatePath(`/trickcal/characters/${charSlug}`);
  }

  const headers = setCookieHeaders(cookieUuid, isNewCookie);
  return NextResponse.json({ comment: newComment }, { status: 201, headers });
}
