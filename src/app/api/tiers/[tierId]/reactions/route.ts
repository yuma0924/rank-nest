import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getUserHash,
  isUserBanned,
  setCookieHeaders,
} from "@/app/api/_helpers";

/**
 * POST /api/tiers/[tierId]/reactions
 * ティアに対する👍リアクション
 *
 * ボディ:
 * - reaction_type: 'up' | null（nullで取り消し）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tierId: string }> }
) {
  try {
    const { tierId } = await params;
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

    if (reaction_type !== "up" && reaction_type !== null) {
      return NextResponse.json(
        { error: "reaction_type は 'up' または null を指定してください" },
        { status: 400 }
      );
    }

    // ティアの存在確認
    const { data: rawTier } = await supabase
      .from("tiers")
      .select("id")
      .eq("id", tierId)
      .eq("is_deleted", false)
      .single();

    if (!rawTier) {
      return NextResponse.json(
        { error: "ティアが見つかりません" },
        { status: 404 }
      );
    }

    // 既存のリアクションを確認
    const { data: rawExisting } = await supabase
      .from("tier_reactions")
      .select("id")
      .eq("tier_id", tierId)
      .eq("user_hash", userHash)
      .single();

    const existing = rawExisting as { id: string } | null;

    if (reaction_type === null) {
      // 取り消し
      if (existing) {
        await supabase
          .from("tier_reactions")
          .delete()
          .eq("id", existing.id);
      }
    } else if (!existing) {
      // 新規
      await supabase.from("tier_reactions").insert({
        tier_id: tierId,
        user_hash: userHash,
        reaction_type: "up",
      });
    }
    // 既に「up」がある場合は何もしない

    // 最新のlikes_countを取得
    const { data: updatedTier } = await supabase
      .from("tiers")
      .select("likes_count")
      .eq("id", tierId)
      .single();

    // ルート ISR と unstable_cache データキャッシュ両方を無効化
    // ホームのプレビュー、一覧、詳細 すべてに likes_count を表示しているので一括
    revalidatePath(`/trickcal/tiers/${tierId}`);
    revalidatePath("/trickcal/tiers");
    revalidatePath("/trickcal");
    revalidateTag("tiers");

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json(
      {
        likes_count: updatedTier?.likes_count ?? 0,
        user_liked: reaction_type === "up",
      },
      { headers }
    );
  } catch (error) {
    console.error("POST /api/tiers/[tierId]/reactions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
