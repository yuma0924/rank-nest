import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminAuth } from "../_middleware";

/**
 * comment-images バケットの公開URLからファイルパス（バケット内）を抽出する。
 * 例: https://xxx.supabase.co/storage/v1/object/public/comment-images/abc.webp
 *     → "abc.webp"
 */
function extractCommentImagePath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/comment-images\/(.+?)(?:\?.*)?$/);
  return match?.[1] ?? null;
}

/**
 * コメント一覧取得 API
 * GET /api/admin/comments?page=1&limit=50&type=all&deleted=false
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const type = searchParams.get("type") || "all"; // all, vote, board
  const deleted = searchParams.get("deleted") === "true";
  const search = searchParams.get("search") || "";

  const offset = (page - 1) * limit;
  const supabase = createAdminClient();

  let query = supabase
    .from("comments")
    .select("*, characters!inner(name, slug)", { count: "exact" })
    .eq("is_deleted", deleted)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type === "vote" || type === "board") {
    query = query.eq("comment_type", type);
  }

  if (search) {
    query = query.ilike("body", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: data, total: count });
}

/**
 * コメント論理削除/復元 API
 * PATCH /api/admin/comments
 * Body: { id: string, action: 'delete' | 'restore' }
 */
export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { id, action } = (await request.json()) as {
      id: string;
      action: "delete" | "restore";
    };

    if (!id || !action) {
      return NextResponse.json(
        { error: "id と action は必須です" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const isDelete = action === "delete";

    // コメント情報を取得
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("id, comment_type, character_id, user_hash, is_latest_vote, image_url")
      .eq("id", id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: "コメントが見つかりません" },
        { status: 404 }
      );
    }

    // 削除時は添付画像も Storage から消し、image_url を NULL にする
    // （復元しても画像は戻らない仕様。Storage を肥大化させない）
    const updatePayload: {
      is_deleted: boolean;
      updated_at: string;
      image_url?: null;
    } = {
      is_deleted: isDelete,
      updated_at: new Date().toISOString(),
    };

    if (isDelete && comment.image_url) {
      const path = extractCommentImagePath(comment.image_url);
      if (path) {
        const { error: removeError } = await supabase.storage
          .from("comment-images")
          .remove([path]);
        if (removeError) {
          console.error("comment image remove failed:", removeError.message);
          // Storage 削除失敗は致命的ではないので続行（DB は NULL 化する）
        }
      }
      updatePayload.image_url = null;
    }

    // 論理削除/復元
    const { error: updateError } = await supabase
      .from("comments")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // 投票コメント削除時: is_latest_vote の繰り上げ処理
    if (
      comment.comment_type === "vote" &&
      comment.is_latest_vote === true &&
      isDelete
    ) {
      // 同一 (character_id, user_hash) の直前の投票コメントを繰り上げ
      const { data: prevVote } = await supabase
        .from("comments")
        .select("id")
        .eq("character_id", comment.character_id)
        .eq("user_hash", comment.user_hash)
        .eq("comment_type", "vote")
        .eq("is_deleted", false)
        .eq("is_latest_vote", false)
        .neq("id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (prevVote) {
        await supabase
          .from("comments")
          .update({ is_latest_vote: true })
          .eq("id", prevVote.id);
      }
    }

    // 投票コメント復元時: 他の is_latest_vote を false にして復元したものを true に
    if (
      comment.comment_type === "vote" &&
      comment.is_latest_vote === true &&
      !isDelete
    ) {
      // 同一ユーザーの同一キャラに対する他の最新投票を降格
      await supabase
        .from("comments")
        .update({ is_latest_vote: false })
        .eq("character_id", comment.character_id)
        .eq("user_hash", comment.user_hash)
        .eq("comment_type", "vote")
        .eq("is_latest_vote", true)
        .neq("id", id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "リクエストの解析に失敗しました" },
      { status: 400 }
    );
  }
}
