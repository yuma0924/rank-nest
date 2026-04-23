import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminAuth } from "../_middleware";

/**
 * キャラ情報が変わった時に呼ぶキャッシュ無効化。
 * unstable_cache の "characters" タグ + 関連ルートの ISR を一括クリア。
 */
function revalidateCharacterCaches(slug?: string) {
  revalidateTag("characters");
  revalidatePath("/trickcal");
  revalidatePath("/trickcal/ranking");
  revalidatePath("/trickcal/tiers");
  revalidatePath("/trickcal/builds");
  revalidatePath("/trickcal/characters/[slug]", "page");
  if (slug) revalidatePath(`/trickcal/characters/${slug}`);
}

/**
 * 全キャラクター取得 API
 * GET /api/admin/characters
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ characters: data });
}

/**
 * キャラクター新規作成 API
 * POST /api/admin/characters
 * Body: Character insert data
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, slug } = body as { name?: string; slug?: string };

    if (!name || !slug) {
      return NextResponse.json(
        { error: "name と slug は必須です" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("characters")
      .insert(body)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "このスラッグは既に使用されています" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateCharacterCaches(
      (data as { slug?: string } | null)?.slug ?? undefined
    );

    return NextResponse.json({ character: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "リクエストの解析に失敗しました" },
      { status: 400 }
    );
  }
}

/**
 * キャラクター一括更新 API
 * PATCH /api/admin/characters
 * Body: { updates: Array<{ id: string; [key: string]: unknown }> }
 */
export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { updates } = (await request.json()) as {
      updates: Array<{ id: string; [key: string]: unknown }>;
    };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "更新データが空です" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const results = [];
    const errors = [];

    for (const update of updates) {
      const { id, ...fields } = update;
      if (!id) {
        errors.push({ id: null, error: "id が未指定です" });
        continue;
      }

      const { data, error } = await supabase
        .from("characters")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        errors.push({ id, error: error.message });
      } else {
        results.push(data);
      }
    }

    if (results.length > 0) {
      // 更新対象の slug が多い場合でもタグで一括無効化すれば十分
      revalidateCharacterCaches();
    }

    return NextResponse.json({ updated: results, errors });
  } catch {
    return NextResponse.json(
      { error: "リクエストの解析に失敗しました" },
      { status: 400 }
    );
  }
}
