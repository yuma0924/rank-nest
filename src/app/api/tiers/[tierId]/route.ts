import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserHash, setCookieHeaders } from "@/app/api/_helpers";
import type { Tier } from "@/types/trickcal";

/**
 * GET /api/tiers/[tierId]
 * ティア詳細を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tierId: string }> }
) {
  try {
    const { tierId } = await params;
    const supabase = createAdminClient();

    const { data: rawTier, error } = await supabase
      .from("tiers")
      .select("*")
      .eq("id", tierId)
      .single();

    if (error || !rawTier) {
      return NextResponse.json(
        { error: "ティアが見つかりません" },
        { status: 404 }
      );
    }

    const tier = rawTier as Tier;

    if (tier.is_deleted) {
      return NextResponse.json(
        { error: "このティアは削除されました", is_deleted: true },
        { status: 410 }
      );
    }

    // ユーザーのリアクション状態
    const { userHash } = getUserHash(request);

    const { data: rawReaction } = await supabase
      .from("tier_reactions")
      .select("id")
      .eq("tier_id", tierId)
      .eq("user_hash", userHash)
      .single();

    return NextResponse.json({
      tier: {
        ...tier,
        user_liked: !!rawReaction,
        is_owner: tier.user_hash === userHash,
      },
    });
  } catch (error) {
    console.error("GET /api/tiers/[tierId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tiers/[tierId]
 * ティアをソフトデリート（本人のみ）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tierId: string }> }
) {
  try {
    const { tierId } = await params;
    const { userHash, cookieUuid, isNewCookie } = getUserHash(request);
    const supabase = createAdminClient();

    const { data: rawTier } = await supabase
      .from("tiers")
      .select("user_hash, is_deleted")
      .eq("id", tierId)
      .single();

    if (!rawTier) {
      return NextResponse.json(
        { error: "ティアが見つかりません" },
        { status: 404 }
      );
    }

    const tier = rawTier as { user_hash: string; is_deleted: boolean };

    if (tier.user_hash !== userHash) {
      return NextResponse.json(
        { error: "削除権限がありません" },
        { status: 403 }
      );
    }

    if (tier.is_deleted) {
      return NextResponse.json(
        { error: "既に削除されています" },
        { status: 410 }
      );
    }

    await supabase
      .from("tiers")
      .update({ is_deleted: true })
      .eq("id", tierId);

    const headers = setCookieHeaders(cookieUuid, isNewCookie);
    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error("DELETE /api/tiers/[tierId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
