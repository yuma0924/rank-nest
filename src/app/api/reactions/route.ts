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
 * ユーザーのリアクション + 各コメントの最新 thumbs counts を同じ
 * スナップショットから返す。reload 時の色とカウントのズレを防ぐ。
 * Response: {
 *   reactions: { [comment_id]: "up" | "down" | null },
 *   counts: { [comment_id]: { thumbs_up: number, thumbs_down: number } }
 * }
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

  // 1 クエリで comment + user's reaction を同じスナップショットで取得
  const { data: rows } = await supabase
    .from("comments")
    .select(
      `id, thumbs_up_count, thumbs_down_count,
       comment_reactions!left(reaction_type)`
    )
    .in("id", commentIds)
    .eq("comment_reactions.user_hash", userHash);

  const reactions: Record<string, "up" | "down" | null> = {};
  const counts: Record<string, { thumbs_up: number; thumbs_down: number }> = {};
  for (const id of commentIds) {
    reactions[id] = null;
  }
  for (const row of (rows ?? []) as {
    id: string;
    thumbs_up_count: number;
    thumbs_down_count: number;
    comment_reactions:
      | { reaction_type: "up" | "down" }
      | { reaction_type: "up" | "down" }[]
      | null;
  }[]) {
    counts[row.id] = {
      thumbs_up: row.thumbs_up_count,
      thumbs_down: row.thumbs_down_count,
    };
    const r = row.comment_reactions;
    const reaction = Array.isArray(r) ? r[0]?.reaction_type : r?.reaction_type;
    if (reaction) reactions[row.id] = reaction;
  }

  const headers = setCookieHeaders(cookieUuid, isNewCookie);
  return NextResponse.json({ reactions, counts }, { headers });
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

  // reaction 行の操作だけ。count は trigger が atomic に更新する。
  if (reaction_type !== oldType) {
    if (reaction_type === null) {
      if (existingReaction) {
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("id", existingReaction.id);
      }
    } else if (existingReaction) {
      await supabase
        .from("comment_reactions")
        .update({ reaction_type, updated_at: new Date().toISOString() })
        .eq("id", existingReaction.id);
    } else {
      await supabase.from("comment_reactions").insert({
        comment_id,
        user_hash: userHash,
        reaction_type,
      });
    }
  }

  // trigger 適用後の最新 count を取得
  const { data: updatedComment } = await supabase
    .from("comments")
    .select("thumbs_up_count, thumbs_down_count")
    .eq("id", comment_id)
    .maybeSingle();

  if (charSlug) {
    revalidatePath(`/trickcal/characters/${charSlug}`);
  }

  const headers = setCookieHeaders(cookieUuid, isNewCookie);
  return NextResponse.json(
    {
      reaction_type,
      thumbs_up_count: updatedComment?.thumbs_up_count ?? 0,
      thumbs_down_count: updatedComment?.thumbs_down_count ?? 0,
    },
    { headers }
  );
}
