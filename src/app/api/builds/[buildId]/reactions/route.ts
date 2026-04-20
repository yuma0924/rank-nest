import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getUserHash,
  isUserBanned,
  setCookieHeaders,
} from "@/app/api/_helpers";

type BuildRow = { id: string };
type ReactionRow = { id: string; reaction_type: "up" | "down" };

/**
 * POST /api/builds/[buildId]/reactions
 * 編成に対する👍/👎リアクション
 *
 * ボディ:
 * - reaction_type: 'up' | 'down' | null（nullで取り消し）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  try {
    const { buildId } = await params;
    const { userHash, cookieUuid, isNewCookie } = getUserHash(request);
    const supabase = createAdminClient();

    // BAN チェック
    if (await isUserBanned(supabase, userHash)) {
      return NextResponse.json(
        { error: "操作できませんでした。時間をおいて再度お試しください。" },
        { status: 403 }
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

    // 編成の存在確認
    const { data: rawBuild } = await supabase
      .from("builds")
      .select("id")
      .eq("id", buildId)
      .eq("is_deleted", false)
      .single();

    const build = rawBuild as BuildRow | null;

    if (!build) {
      return NextResponse.json(
        { error: "編成が見つかりません" },
        { status: 404 }
      );
    }

    // 既存のリアクションを確認
    const { data: rawExisting } = await supabase
      .from("build_reactions")
      .select("id, reaction_type")
      .eq("build_id", buildId)
      .eq("user_hash", userHash)
      .single();

    const existing = rawExisting as ReactionRow | null;

    if (reaction_type === null) {
      // 取り消し
      if (existing) {
        await supabase
          .from("build_reactions")
          .delete()
          .eq("id", existing.id);
      }
    } else if (existing) {
      // 変更
      if (existing.reaction_type !== reaction_type) {
        await supabase
          .from("build_reactions")
          .update({
            reaction_type: reaction_type as "up" | "down",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    } else {
      // 新規
      await supabase.from("build_reactions").insert({
        build_id: buildId,
        user_hash: userHash,
        reaction_type: reaction_type as "up" | "down",
      });
    }

    // カウントは build_reactions のトリガーで自動更新、最新値を取得
    const { data: updatedBuild } = await supabase
      .from("builds")
      .select("likes_count, dislikes_count")
      .eq("id", buildId)
      .single();

    // ISR キャッシュを無効化
    revalidatePath(`/trickcal/builds/${buildId}`);
    revalidatePath("/trickcal/builds");

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      {
        likes_count: updatedBuild?.likes_count ?? 0,
        dislikes_count: updatedBuild?.dislikes_count ?? 0,
        user_reaction: reaction_type,
      },
      { headers }
    );
  } catch (error) {
    console.error("POST /api/builds/[buildId]/reactions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
