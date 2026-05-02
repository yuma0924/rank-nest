import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_DISPLAY_NAME,
  MAX_DISPLAY_NAME_LENGTH,
  getBuildMaxPartySize,
} from "@/lib/trickcal/constants";
import type { Build } from "@/types/trickcal";
import {
  getUserHash,
  isUserBanned,
  checkRateLimit,
  setCookieHeaders,
} from "@/app/api/_helpers";

const PAGE_SIZE = 20;
const BUILD_RATE_LIMIT_SECONDS = 30;

type CharacterInfo = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  position: string | null;
  image_url: string | null;
  is_hidden: boolean;
};

type ReactionRow = { build_id: string; reaction_type: "up" | "down" };

/**
 * GET /api/builds
 * 編成一覧を取得
 *
 * クエリパラメータ:
 * - mode: 'pvp' | 'pve'（必須）
 * - element: 属性フィルター（任意: '火','水','風','光','闇','混合'）
 * - cursor: ページネーションカーソル（最後の build の ID）
 * - limit: 取得件数（デフォルト20）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const mode = searchParams.get("mode");
    const elementParam = searchParams.get("element");
    // カンマ区切りで複数性格対応、複数指定時は「混合」も含める
    const elementLabels: string[] = elementParam
      ? (() => {
          const elems = elementParam.split(",").filter(Boolean);
          if (elems.length > 1) return [...elems, "混合"];
          return elems;
        })()
      : [];
    const sortKey = searchParams.get("sort") || "popular";
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      Number(searchParams.get("limit")) || PAGE_SIZE,
      50
    );

    const VALID_MODES = ["general", "arena", "dimension", "world_tree", "alias"] as const;
    type ValidMode = (typeof VALID_MODES)[number];
    if (!mode || !(VALID_MODES as readonly string[]).includes(mode)) {
      return NextResponse.json(
        { error: "mode パラメータが不正です" },
        { status: 400 }
      );
    }
    const validMode = mode as ValidMode;

    const supabase = createAdminClient();

    let builds: Build[] = [];
    let queryError: string | null = null;

    if (cursor) {
      // カーソルIDのビルドを取得して比較基準を得る
      const { data: cursorBuild } = await supabase
        .from("builds")
        .select("likes_count, updated_at")
        .eq("id", cursor)
        .single();

      if (cursorBuild) {
        let q = supabase
          .from("builds")
          .select("*")
          .eq("mode", validMode)
          .eq("is_deleted", false);

        if (sortKey === "newest") {
          q = q.lt("updated_at", cursorBuild.updated_at);
        } else {
          q = q.or(
            `likes_count.lt.${cursorBuild.likes_count},` +
            `and(likes_count.eq.${cursorBuild.likes_count},updated_at.lt.${cursorBuild.updated_at})`
          );
        }

        if (elementLabels.length > 0) q = q.in("element_label", elementLabels);

        if (sortKey === "newest") {
          q = q.order("updated_at", { ascending: false });
        } else {
          q = q.order("likes_count", { ascending: false }).order("updated_at", { ascending: false });
        }

        const { data, error } = await q.limit(limit + 1);

        if (error) queryError = error.message;
        builds = (data as Build[]) ?? [];
      }
    }

    if (!cursor || builds.length === 0) {
      if (!queryError) {
        let q = supabase
          .from("builds")
          .select("*")
          .eq("mode", validMode)
          .eq("is_deleted", false);

        if (elementLabels.length > 0) q = q.in("element_label", elementLabels);

        if (sortKey === "newest") {
          q = q.order("updated_at", { ascending: false });
        } else {
          q = q.order("likes_count", { ascending: false }).order("updated_at", { ascending: false });
        }

        const { data, error } = await q
          .limit(sortKey === "popular" ? 200 : limit + 1);

        if (error) queryError = error.message;

        if (sortKey === "popular" && data) {
          // ネットスコア（likes - dislikes）で再ソート
          builds = (data as Build[]).sort((a, b) => {
            const scoreA = a.likes_count - a.dislikes_count;
            const scoreB = b.likes_count - b.dislikes_count;
            if (scoreB !== scoreA) return scoreB - scoreA;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });
        } else {
          builds = (data as Build[]) ?? [];
        }
      }
    }

    if (queryError) {
      console.error("GET /api/builds query error:", queryError);
      return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
    }

    const hasMore = builds.length > limit;
    const items = builds.slice(0, limit);
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    const memberIds = [
      ...new Set(items.flatMap((b) => b.members).filter((id): id is string => id !== null)),
    ];
    const buildIds = items.map((b) => b.id);
    const { userHash } = getUserHash(request);

    // 後続の3クエリ（characters / reactions / comments）を並列実行
    const [charsResult, reactionsResult, commentsResult] = await Promise.all([
      memberIds.length > 0
        ? supabase
            .from("characters")
            .select("id, name, slug, element, position, image_url, is_hidden")
            .in("id", memberIds)
        : Promise.resolve({ data: [] as CharacterInfo[] }),
      buildIds.length > 0
        ? supabase
            .from("build_reactions")
            .select("build_id, reaction_type")
            .eq("user_hash", userHash)
            .in("build_id", buildIds)
        : Promise.resolve({ data: [] as ReactionRow[] }),
      buildIds.length > 0
        ? supabase
            .from("build_comments")
            .select("build_id")
            .in("build_id", buildIds)
            .eq("is_deleted", false)
        : Promise.resolve({ data: [] as { build_id: string }[] }),
    ]);

    const characters: Record<string, CharacterInfo> = charsResult.data
      ? Object.fromEntries((charsResult.data as CharacterInfo[]).map((c) => [c.id, c]))
      : {};

    const userReactions: Record<string, "up" | "down"> = reactionsResult.data
      ? Object.fromEntries(
          (reactionsResult.data as ReactionRow[]).map((r) => [r.build_id, r.reaction_type])
        )
      : {};

    const commentCounts: Record<string, number> = {};
    if (commentsResult.data) {
      for (const row of commentsResult.data as { build_id: string }[]) {
        commentCounts[row.build_id] = (commentCounts[row.build_id] ?? 0) + 1;
      }
    }

    const fallbackChar: Omit<CharacterInfo, "id"> = {
      name: "不明",
      slug: "",
      element: null,
      position: null,
      image_url: null,
      is_hidden: false,
    };

    return NextResponse.json({
      builds: items.map((b) => ({
        ...b,
        members_detail: b.members
          .filter((id): id is string => id !== null)
          .map((id) => characters[id] || { id, ...fallbackChar }),
        user_reaction: userReactions[b.id] || null,
        comments_count: commentCounts[b.id] ?? 0,
      })),
      next_cursor: nextCursor,
      has_more: hasMore,
    });
  } catch (error) {
    console.error("GET /api/builds error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/builds
 * 編成を投稿（同一 user_hash * mode * party_size は上書き）
 *
 * ボディ:
 * - mode: 'pvp' | 'pve'
 * - members: string[]（キャラID配列、party_sizeと同じ長さ）
 * - comment: string（最大200文字）
 * - title?: string（編成名、任意）
 * - display_name?: string（投稿者名、任意）
 */
export async function POST(request: NextRequest) {
  try {
    const { userHash, cookieUuid, isNewCookie } = getUserHash(request);
    const supabase = createAdminClient();

    let parsed: {
      mode?: string;
      members?: string[];
      comment?: string;
      title?: string;
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

    const { mode, members, comment, title, display_name } = parsed;

    // バリデーション
    const VALID_MODES_POST = ["general", "arena", "dimension", "world_tree", "alias"] as const;
    type ValidModePost = (typeof VALID_MODES_POST)[number];
    if (!mode || !(VALID_MODES_POST as readonly string[]).includes(mode)) {
      return NextResponse.json(
        { error: "mode が不正です" },
        { status: 400 }
      );
    }
    const validModePost = mode as ValidModePost;

    if (!Array.isArray(members)) {
      return NextResponse.json(
        { error: "members は必須です" },
        { status: 400 }
      );
    }

    // null を含む9枠配列から実際のキャラIDを抽出
    const actualMembers = members.filter((id): id is string => id !== null && id !== undefined);
    if (actualMembers.length === 0) {
      return NextResponse.json(
        { error: "キャラクターを1体以上選択してください" },
        { status: 400 }
      );
    }

    // alias は M.E.O.W (9体) と通常 (6体) の両方を許容するため上限のみチェック
    const maxPartySize = getBuildMaxPartySize(validModePost);
    if (actualMembers.length > maxPartySize) {
      return NextResponse.json(
        { error: `メンバーは${maxPartySize}人以内で選択してください` },
        { status: 400 }
      );
    }

    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return NextResponse.json(
        { error: "コメントは必須です" },
        { status: 400 }
      );
    }

    if (comment.length > 200) {
      return NextResponse.json(
        { error: "コメントは200文字以内で入力してください" },
        { status: 400 }
      );
    }

    if (title && typeof title === "string" && title.length > 100) {
      return NextResponse.json(
        { error: "タイトルは100文字以内で入力してください" },
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

    // BAN / レートリミット / キャラ存在 / 重複編成チェックを並列実行
    const [banned, rateLimit, charsResult, duplicatesResult] = await Promise.all([
      isUserBanned(supabase, userHash),
      checkRateLimit(
        supabase,
        "builds",
        { user_hash: userHash },
        BUILD_RATE_LIMIT_SECONDS
      ),
      supabase.from("characters").select("id, element").in("id", actualMembers),
      supabase
        .from("builds")
        .select("id, members")
        .eq("user_hash", userHash)
        .eq("mode", validModePost)
        .eq("is_deleted", false),
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

    if (charsResult.error) {
      return NextResponse.json(
        { error: "キャラクター情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    const charList = charsResult.data as { id: string; element: string | null }[] | null;

    if (!charList || charList.length !== actualMembers.length) {
      return NextResponse.json(
        { error: "無効なキャラクターが含まれています" },
        { status: 400 }
      );
    }

    // 属性ラベル自動生成
    const elements = charList.map((c) => c.element).filter(Boolean);
    const uniqueElements = [...new Set(elements)];
    const elementLabel =
      uniqueElements.length === 1 ? uniqueElements[0]! : "混合";

    const finalTitle = title?.trim() || "無題の編成";
    const finalDisplayName = display_name?.trim() || DEFAULT_DISPLAY_NAME;

    const actualPartySize = actualMembers.length;

    const sortedMembers = [...actualMembers].sort();
    const duplicates = duplicatesResult.data;
    if (duplicates) {
      const isDuplicate = duplicates.some((b) => {
        const existing = b.members.filter((id: string | null) => id !== null).sort();
        return existing.length === sortedMembers.length &&
          existing.every((id: string, i: number) => id === sortedMembers[i]);
      });
      if (isDuplicate) {
        return NextResponse.json(
          { error: "同じメンバー構成の編成が既に投稿されています" },
          { status: 409 }
        );
      }
    }

    const headers = setCookieHeaders(cookieUuid, isNewCookie);

    // 新規投稿
    const { data: newBuild, error: insertError } = await supabase
      .from("builds")
      .insert({
        mode: validModePost,
        party_size: actualPartySize,
        members,
        element_label: elementLabel,
        title: finalTitle,
        display_name: finalDisplayName,
        comment: comment.trim(),
        user_hash: userHash,
      })
      .select()
      .single();

    if (insertError) {
      console.error("POST /api/builds insert error:", insertError.message);
      return NextResponse.json(
        { error: "サーバーエラーが発生しました" },
        { status: 500 }
      );
    }

    revalidatePath("/trickcal/builds");
    revalidatePath("/trickcal");
    revalidateTag("builds");

    return NextResponse.json(
      { build: newBuild, updated: false },
      { status: 201, headers }
    );
  } catch (error) {
    console.error("POST /api/builds error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
