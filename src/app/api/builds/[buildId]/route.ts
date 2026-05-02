import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserHash } from "@/app/api/_helpers";
import type { Build } from "@/types/trickcal";

type CharacterInfo = {
  id: string;
  name: string;
  slug: string;
  element: string | null;
  image_url: string | null;
  is_hidden: boolean;
};

type ReactionRow = { reaction_type: "up" | "down" };

const UNKNOWN_CHARACTER: Omit<CharacterInfo, "id"> = {
  name: "不明",
  slug: "",
  element: null,
  image_url: null,
  is_hidden: false,
};

/**
 * GET /api/builds/[buildId]
 * 編成詳細を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ buildId: string }> }
) {
  try {
    const { buildId } = await params;
    const supabase = createAdminClient();

    // 編成データ取得
    const { data: rawBuild, error } = await supabase
      .from("builds")
      .select("*")
      .eq("id", buildId)
      .single();

    if (error || !rawBuild) {
      return NextResponse.json(
        { error: "編成が見つかりません" },
        { status: 404 }
      );
    }

    const build = rawBuild as Build;

    if (build.is_deleted) {
      return NextResponse.json(
        { error: "この編成は削除されました", is_deleted: true },
        { status: 410 }
      );
    }

    // メンバーのキャラ情報を取得
    const { data: rawChars } = await supabase
      .from("characters")
      .select("id, name, slug, element, image_url, is_hidden")
      .in("id", build.members);

    const chars = (rawChars as CharacterInfo[] | null) ?? [];
    const charMap = new Map(chars.map((c) => [c.id, c]));

    const membersDetail = build.members.map(
      (id) => charMap.get(id) ?? { id, ...UNKNOWN_CHARACTER }
    );

    // ユーザーのリアクション状態
    const { userHash } = getUserHash(request);

    const { data: rawReaction } = await supabase
      .from("build_reactions")
      .select("reaction_type")
      .eq("build_id", buildId)
      .eq("user_hash", userHash)
      .single();

    const reaction = rawReaction as ReactionRow | null;

    // 似ている編成（同じキャラを含む or 同属性）を取得
    const { data: rawCandidates } = await supabase
      .from("builds")
      .select("*")
      .eq("is_deleted", false)
      .neq("id", buildId)
      .eq("mode", build.mode)
      .order("likes_count", { ascending: false })
      .limit(20);

    const candidateBuilds = (rawCandidates as Build[] | null) ?? [];

    const similarSorted = candidateBuilds
      .map((sb) => ({
        ...sb,
        commonCount: sb.members.filter((m) => build.members.includes(m)).length,
        sameElement: sb.element_label === build.element_label,
      }))
      .filter((sb) => sb.commonCount > 0 || sb.sameElement)
      .sort((a, b) => {
        if (b.commonCount !== a.commonCount) return b.commonCount - a.commonCount;
        return b.likes_count - a.likes_count;
      })
      .slice(0, 5);

    // 似ている編成のキャラ情報も取得
    const similarMemberIds = [
      ...new Set(similarSorted.flatMap((sb) => sb.members)),
    ];

    if (similarMemberIds.length > 0) {
      const { data: rawSc } = await supabase
        .from("characters")
        .select("id, name, slug, element, image_url, is_hidden")
        .in("id", similarMemberIds);

      const sc = (rawSc as CharacterInfo[] | null) ?? [];
      for (const c of sc) {
        if (!charMap.has(c.id)) {
          charMap.set(c.id, c);
        }
      }
    }

    return NextResponse.json({
      build: {
        ...build,
        members_detail: membersDetail,
        user_reaction: reaction?.reaction_type ?? null,
      },
      similar_builds: similarSorted.map((sb) => ({
        id: sb.id,
        mode: sb.mode,
        party_size: sb.party_size,
        members: sb.members,
        members_detail: sb.members.map(
          (id) => charMap.get(id) ?? { id, ...UNKNOWN_CHARACTER }
        ),
        element_label: sb.element_label,
        title: sb.title,
        display_name: sb.display_name,
        comment: sb.comment,
        likes_count: sb.likes_count,
        dislikes_count: sb.dislikes_count,
        created_at: sb.created_at,
        updated_at: sb.updated_at,
        common_count: sb.commonCount,
      })),
    });
  } catch (error) {
    console.error("GET /api/builds/[buildId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
