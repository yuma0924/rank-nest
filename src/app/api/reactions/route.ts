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

/**
 * リアクション状態取得 API
 * GET /api/reactions?comment_ids=id1,id2,id3
 * ユーザーが対象コメントに付けたリアクションをまとめて返す
 * Response: { reactions: { [comment_id]: "up" | "down" | null } }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const commentIdsParam = searchParams.get("comment_ids");

  if (!commentIdsParam) {
    return NextResponse.json(
      { error: "comment_ids is required" },
      { status: 400 }
    );
  }

  const commentIds = commentIdsParam.split(",").filter(Boolean);
  if (commentIds.length === 0 || commentIds.length > 50) {
    return NextResponse.json(
      { error: "comment_ids must contain 1-50 IDs" },
      { status: 400 }
    );
  }

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

  const { data } = await supabase
    .from("comment_reactions")
    .select("comment_id, reaction_type")
    .in("comment_id", commentIds)
    .eq("user_hash", userHash);

  // comment_id -> reaction_type のマップを構築
  const reactions: Record<string, "up" | "down" | null> = {};
  for (const id of commentIds) {
    reactions[id] = null;
  }
  if (data) {
    for (const row of data) {
      reactions[row.comment_id] = row.reaction_type;
    }
  }

  const headers = setCookieHeaders(cookieUuid, isNewCookie);
  return NextResponse.json({ reactions }, { headers });
}

/**
 * リアクション操作 API
 * POST /api/reactions
 * Body: {
 *   comment_id: string,
 *   reaction_type: "up" | "down" | null (nullで取り消し)
 * }
 *
 * 仕様:
 * - 1人1コメントにつき1リアクション (UNIQUE制約)
 * - 👍→👎, 👎→👍 の変更OK
 * - 取り消し (nullで送信) OK
 * - 非正規化カウント (thumbs_up_count, thumbs_down_count) を更新
 */
export async function POST(request: NextRequest) {
  let parsed: {
    comment_id?: string;
    reaction_type?: "up" | "down" | null;
  };

  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { comment_id, reaction_type } = parsed;

  if (!comment_id) {
    return NextResponse.json(
      { error: "comment_id is required" },
      { status: 400 }
    );
  }

  if (reaction_type !== "up" && reaction_type !== "down" && reaction_type !== null) {
    return NextResponse.json(
      { error: "reaction_type must be 'up', 'down', or null" },
      { status: 400 }
    );
  }

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

  // BAN + レートリミット + コメント取得 を並列化
  const [banned, rateLimit, commentResult] = await Promise.all([
    isUserBanned(supabase, userHash),
    checkRateLimit(
      supabase,
      "comment_reactions",
      { user_hash: userHash },
      REACTION_RATE_LIMIT_SECONDS
    ),
    supabase
      .from("comments")
      .select("id, thumbs_up_count, thumbs_down_count, characters!inner(slug)")
      .eq("id", comment_id)
      .eq("is_deleted", false)
      .maybeSingle(),
  ]);

  if (banned) {
    return NextResponse.json({ error: "操作できません" }, { status: 403 });
  }
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "連打しすぎです。少し待ってから再度お試しください。", retry_after: rateLimit.retryAfter },
      { status: 429 }
    );
  }

  const comment = commentResult.data;

  if (!comment) {
    return NextResponse.json(
      { error: "Comment not found" },
      { status: 404 }
    );
  }

  const charSlug = (() => {
    const c = (comment as unknown as { characters: { slug: string } | { slug: string }[] }).characters;
    return Array.isArray(c) ? c[0]?.slug : c?.slug;
  })();

  // 既存リアクションを取得
  const { data: existingReaction } = await supabase
    .from("comment_reactions")
    .select("id, reaction_type")
    .eq("comment_id", comment_id)
    .eq("user_hash", userHash)
    .single();

  const oldType = existingReaction?.reaction_type ?? null;

  // 変更がない場合は DB 現在値を返す（クライアント同期用）
  if (oldType === reaction_type) {
    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      {
        reaction_type,
        thumbs_up_count: comment.thumbs_up_count,
        thumbs_down_count: comment.thumbs_down_count,
      },
      { headers }
    );
  }

  // カウント差分を計算
  let thumbsUpDelta = 0;
  let thumbsDownDelta = 0;

  if (oldType === "up") thumbsUpDelta -= 1;
  if (oldType === "down") thumbsDownDelta -= 1;
  if (reaction_type === "up") thumbsUpDelta += 1;
  if (reaction_type === "down") thumbsDownDelta += 1;

  // リアクションの UPSERT / DELETE
  if (reaction_type === null) {
    // 取り消し
    if (existingReaction) {
      await supabase
        .from("comment_reactions")
        .delete()
        .eq("id", existingReaction.id);
    }
  } else if (existingReaction) {
    // 更新
    await supabase
      .from("comment_reactions")
      .update({ reaction_type, updated_at: new Date().toISOString() })
      .eq("id", existingReaction.id);
  } else {
    // 新規作成
    await supabase.from("comment_reactions").insert({
      comment_id,
      user_hash: userHash,
      reaction_type,
    });
  }

  const newThumbsUp = comment.thumbs_up_count + thumbsUpDelta;
  const newThumbsDown = comment.thumbs_down_count + thumbsDownDelta;

  // 非正規化カウント更新
  await supabase
    .from("comments")
    .update({
      thumbs_up_count: newThumbsUp,
      thumbs_down_count: newThumbsDown,
    })
    .eq("id", comment_id);

  // 親キャラ詳細ページの ISR キャッシュを無効化
  if (charSlug) {
    revalidatePath(`/trickcal/characters/${charSlug}`);
  }

  const headers = setCookieHeaders(cookieUuid, isNewCookie);
  return NextResponse.json(
    {
      reaction_type,
      thumbs_up_count: newThumbsUp,
      thumbs_down_count: newThumbsDown,
    },
    { headers }
  );
}
