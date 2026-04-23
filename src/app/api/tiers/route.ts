import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_DISPLAY_NAME, MAX_DISPLAY_NAME_LENGTH, TIER_LABELS } from "@/lib/trickcal/constants";
import type { Tier } from "@/types/trickcal";
import {
  getUserHash,
  isUserBanned,
  checkRateLimit,
  setCookieHeaders,
} from "@/app/api/_helpers";

const PAGE_SIZE = 20;
const TIER_RATE_LIMIT_SECONDS = 30;

type ReactionRow = { tier_id: string };

/**
 * GET /api/tiers
 * ティア一覧を取得
 *
 * クエリパラメータ:
 * - sort: 'popular' | 'newest'（デフォルト: popular）
 * - cursor: ページネーションカーソル（最後の tier の ID）
 * - limit: 取得件数（デフォルト20、最大50）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // いいねチェック専用モード
    const likedCheck = searchParams.get("liked_check");
    if (likedCheck) {
      const ids = likedCheck.split(",").filter(Boolean);
      const { userHash } = getUserHash(request);
      const supabase = createAdminClient();
      const { data: reactions } = await supabase
        .from("tier_reactions")
        .select("tier_id")
        .eq("user_hash", userHash)
        .in("tier_id", ids);
      return NextResponse.json({
        liked_ids: (reactions as ReactionRow[] ?? []).map((r) => r.tier_id),
      });
    }

    const sortKey = searchParams.get("sort") || "popular";
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      Number(searchParams.get("limit")) || PAGE_SIZE,
      50
    );

    const supabase = createAdminClient();

    let tiers: Tier[] = [];

    if (cursor) {
      const { data: cursorTier } = await supabase
        .from("tiers")
        .select("likes_count, created_at")
        .eq("id", cursor)
        .single();

      if (cursorTier) {
        let q = supabase
          .from("tiers")
          .select("*")
          .eq("is_deleted", false);

        if (sortKey === "newest") {
          q = q.lt("created_at", cursorTier.created_at);
        } else {
          q = q.or(
            `likes_count.lt.${cursorTier.likes_count},` +
            `and(likes_count.eq.${cursorTier.likes_count},created_at.lt.${cursorTier.created_at})`
          );
        }

        if (sortKey === "newest") {
          q = q.order("created_at", { ascending: false });
        } else {
          q = q.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
        }

        const { data, error } = await q.limit(limit + 1);
        if (error) {
          console.error("GET /api/tiers query error:", error.message);
          return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
        }
        tiers = (data as Tier[]) ?? [];
      }
    }

    if (!cursor || tiers.length === 0) {
      let q = supabase
        .from("tiers")
        .select("*")
        .eq("is_deleted", false);

      if (sortKey === "newest") {
        q = q.order("created_at", { ascending: false });
      } else {
        q = q.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
      }

      const { data, error } = await q.limit(limit + 1);
      if (error) {
        console.error("GET /api/tiers query error:", error.message);
        return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
      }
      tiers = (data as Tier[]) ?? [];
    }

    const hasMore = tiers.length > limit;
    const items = tiers.slice(0, limit);
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // ユーザーのリアクション状態を取得
    const { userHash } = getUserHash(request);
    const tierIds = items.map((t) => t.id);
    let userReactions: Set<string> = new Set();

    if (tierIds.length > 0) {
      const { data: reactions } = await supabase
        .from("tier_reactions")
        .select("tier_id")
        .eq("user_hash", userHash)
        .in("tier_id", tierIds);

      if (reactions) {
        userReactions = new Set(
          (reactions as ReactionRow[]).map((r) => r.tier_id)
        );
      }
    }

    return NextResponse.json({
      tiers: items.map((t) => ({
        ...t,
        user_liked: userReactions.has(t.id),
      })),
      next_cursor: nextCursor,
      has_more: hasMore,
    });
  } catch (error) {
    console.error("GET /api/tiers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tiers
 * ティアを作成
 *
 * ボディ:
 * - data: Record<TierLabel, string[]>（各ティアのキャラID配列）
 * - title?: string（タイトル、任意）
 * - display_name?: string（投稿者名、任意）
 */
export async function POST(request: NextRequest) {
  try {
    const { userHash, cookieUuid, isNewCookie } = getUserHash(request);
    const supabase = createAdminClient();

    // JSON パース + バリデーションを DB 呼び出し前に実施 (無駄な DB 往復を避ける)
    let parsed: {
      data?: Record<string, string[]>;
      title?: string;
      display_name?: string;
      description?: string;
    };

    try {
      parsed = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { data, title, display_name, description } = parsed;

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "data は必須です" },
        { status: 400 }
      );
    }

    const validLabels = new Set<string>(TIER_LABELS);
    for (const key of Object.keys(data)) {
      if (!validLabels.has(key)) {
        return NextResponse.json(
          { error: `無効なティアラベル: ${key}` },
          { status: 400 }
        );
      }
    }

    const allCharIds = Object.values(data).flat();
    if (allCharIds.length === 0) {
      return NextResponse.json(
        { error: "キャラクターを1体以上配置してください" },
        { status: 400 }
      );
    }

    const charIdSet = new Set(allCharIds);
    if (charIdSet.size !== allCharIds.length) {
      return NextResponse.json(
        { error: "同じキャラクターを複数のティアに配置できません" },
        { status: 400 }
      );
    }

    // BAN / レートリミット / キャラ存在確認を並列実行
    const [banned, rateLimit, charsResult] = await Promise.all([
      isUserBanned(supabase, userHash),
      checkRateLimit(
        supabase,
        "tiers",
        { user_hash: userHash },
        TIER_RATE_LIMIT_SECONDS
      ),
      supabase.from("characters").select("id").in("id", allCharIds),
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

    const chars = charsResult.data;
    if (!chars || chars.length !== allCharIds.length) {
      return NextResponse.json(
        { error: "無効なキャラクターが含まれています" },
        { status: 400 }
      );
    }

    if (title && title.length > 100) {
      return NextResponse.json(
        { error: "タイトルは100文字以内で入力してください" },
        { status: 400 }
      );
    }

    if (description && description.length > 1000) {
      return NextResponse.json(
        { error: "解説は1000文字以内で入力してください" },
        { status: 400 }
      );
    }

    if (display_name && display_name.length > MAX_DISPLAY_NAME_LENGTH) {
      return NextResponse.json(
        { error: `display_name は${MAX_DISPLAY_NAME_LENGTH}文字以内で入力してください` },
        { status: 400 }
      );
    }

    const finalDisplayName = display_name?.trim() || DEFAULT_DISPLAY_NAME;

    const headers = setCookieHeaders(cookieUuid, isNewCookie);

    const { data: newTier, error: insertError } = await supabase
      .from("tiers")
      .insert({
        data: data as Record<string, string[]>,
        title: title?.trim() || null,
        display_name: finalDisplayName,
        description: description?.trim() || null,
        user_hash: userHash,
      })
      .select()
      .single();

    if (insertError) {
      console.error("POST /api/tiers insert error:", insertError.message);
      return NextResponse.json(
        { error: "サーバーエラーが発生しました" },
        { status: 500 }
      );
    }

    revalidatePath("/trickcal/tiers");
    revalidatePath("/trickcal");
    revalidateTag("tiers");

    return NextResponse.json(
      { tier: newTier },
      { status: 201, headers }
    );
  } catch (error) {
    console.error("POST /api/tiers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
