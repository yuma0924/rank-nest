import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminAuth } from "../../_middleware";
import sharp from "sharp";

const BUCKET_NAME = "character-icons";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * キャラアイコン画像アップロード API
 * POST /api/admin/characters/upload
 * FormData: { file: File, characterId: string }
 *
 * WebP 変換 → Supabase Storage に保存 → public URL を image_url に保存。
 * Vercel の filesystem は read-only なのでローカル書き出しは不可。
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const characterId = formData.get("characterId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 }
      );
    }

    if (!characterId) {
      return NextResponse.json(
        { error: "キャラクターIDが指定されていません" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "PNG, JPEG, WebP のみアップロード可能です" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは2MB以下にしてください" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // WebP変換（解像度維持、画質90）
    const arrayBuffer = await file.arrayBuffer();
    const webpBuffer = await sharp(Buffer.from(arrayBuffer))
      .webp({ quality: 90 })
      .toBuffer();

    const filePath = `${characterId}.webp`;

    // Supabase Storage にアップロード
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, webpBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `アップロード失敗: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 公開 URL を取得。キャッシュバスト用に updated_at 相当の suffix を付ける
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    const publicUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    // DB の image_url を更新
    const { error: updateError } = await supabase
      .from("characters")
      .update({
        image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", characterId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // 関連キャッシュを一括無効化
    revalidateTag("characters");
    revalidatePath("/trickcal");
    revalidatePath("/trickcal/ranking");
    revalidatePath("/trickcal/tiers");
    revalidatePath("/trickcal/builds");
    revalidatePath("/trickcal/characters/[slug]", "page");

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json(
      { error: "アップロードに失敗しました" },
      { status: 500 }
    );
  }
}
