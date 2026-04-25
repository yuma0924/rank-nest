import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getUserHash,
  isUserBanned,
  checkRateLimit,
  setCookieHeaders,
} from "@/app/api/_helpers";
import { DEFAULT_DISPLAY_NAME, MAX_DISPLAY_NAME_LENGTH } from "@/lib/trickcal/constants";
import { moderateImage } from "@/lib/moderation";

const MAX_BODY_LENGTH = 300;
const MAX_BODY_LINES = 8;
const VOTE_RATE_LIMIT_SECONDS = 30;
const BOARD_RATE_LIMIT_SECONDS = 10;

// 画像関連
const COMMENT_IMAGES_BUCKET = "comment-images";
// 受付時の上限。サーバー側で sharp により WebP + 1600px リサイズするので、
// Storage に保存される実体は基本 1MB 以下になる。
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const IMAGE_MAX_DIMENSION = 1600;

/**
 * コメント取得 API
 * GET /api/comments?character_id=xxx&sort=new|thumbs_up|thumbs_down&limit=20&offset=0
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const characterId = searchParams.get("character_id");
  const sort = searchParams.get("sort") ?? "new";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  if (!characterId) {
    return NextResponse.json(
      { error: "character_id is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // ソート条件を構築
  let orderColumn: string;
  let ascending: boolean;

  switch (sort) {
    case "thumbs_up":
      orderColumn = "thumbs_up_count";
      ascending = false;
      break;
    case "thumbs_down":
      orderColumn = "thumbs_down_count";
      ascending = false;
      break;
    case "new":
    default:
      orderColumn = "created_at";
      ascending = false;
      break;
  }

  const { data, error, count } = await supabase
    .from("comments")
    .select("*", { count: "exact" })
    .eq("character_id", characterId)
    .eq("is_deleted", false)
    .order(orderColumn, { ascending })
    .order("created_at", { ascending: false }) // 同点時は新しい順
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("GET /api/comments query error:", error.message);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  return NextResponse.json({
    comments: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}

/**
 * コメント投稿 API
 * POST /api/comments
 *
 * 受付形式:
 *   - multipart/form-data: 画像添付対応（推奨）
 *     fields: character_id, comment_type, rating?, body?, display_name?, image?
 *   - application/json: 後方互換（画像添付なし）
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  let character_id: string | undefined;
  let comment_type: string | undefined;
  let rating: number | undefined;
  let body: string | undefined;
  let display_name: string | undefined;
  let imageFile: File | null = null;

  if (isMultipart) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data" },
        { status: 400 }
      );
    }
    character_id = (formData.get("character_id") as string | null) ?? undefined;
    comment_type = (formData.get("comment_type") as string | null) ?? undefined;
    const ratingRaw = formData.get("rating");
    if (ratingRaw !== null && ratingRaw !== "") {
      const parsed = Number(ratingRaw);
      if (Number.isFinite(parsed)) rating = parsed;
    }
    const bodyRaw = formData.get("body");
    body = typeof bodyRaw === "string" ? bodyRaw : undefined;
    const displayRaw = formData.get("display_name");
    display_name = typeof displayRaw === "string" ? displayRaw : undefined;
    const fileRaw = formData.get("image");
    if (fileRaw instanceof File && fileRaw.size > 0) {
      imageFile = fileRaw;
    }
  } else {
    let parsed: {
      character_id?: string;
      comment_type?: string;
      rating?: number;
      body?: string;
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
    character_id = parsed.character_id;
    comment_type = parsed.comment_type;
    rating = parsed.rating;
    body = parsed.body;
    display_name = parsed.display_name;
  }

  // バリデーション
  if (!character_id) {
    return NextResponse.json(
      { error: "character_id is required" },
      { status: 400 }
    );
  }

  if (comment_type !== "vote" && comment_type !== "board") {
    return NextResponse.json(
      { error: "comment_type must be 'vote' or 'board'" },
      { status: 400 }
    );
  }

  if (comment_type === "vote") {
    if (rating === undefined || rating === null) {
      return NextResponse.json(
        { error: "rating is required for vote comments" },
        { status: 400 }
      );
    }
    if (rating < 0.5 || rating > 5.0 || rating % 0.5 !== 0) {
      return NextResponse.json(
        { error: "rating must be between 0.5 and 5.0 in 0.5 increments" },
        { status: 400 }
      );
    }
  }

  if (
    display_name !== undefined &&
    display_name !== null &&
    typeof display_name === "string" &&
    display_name.length > MAX_DISPLAY_NAME_LENGTH
  ) {
    return NextResponse.json(
      { error: `display_name は${MAX_DISPLAY_NAME_LENGTH}文字以内で入力してください` },
      { status: 400 }
    );
  }

  if (body !== undefined && body !== null) {
    if (body.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { error: `body must be ${MAX_BODY_LENGTH} characters or less` },
        { status: 400 }
      );
    }
    const lines = body.split("\n");
    if (lines.length > MAX_BODY_LINES) {
      return NextResponse.json(
        { error: `body must be ${MAX_BODY_LINES} lines or less` },
        { status: 400 }
      );
    }
  }

  // 画像のバリデーション + 変換（モデレーションは認証/レート制限後にコスト節約のため後で実行）
  let webpBuffer: Buffer | null = null;
  if (imageFile) {
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "画像サイズは5MB以下にしてください" },
        { status: 400 }
      );
    }
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "PNG, JPEG, WebP のみアップロード可能です" },
        { status: 400 }
      );
    }
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      webpBuffer = await sharp(Buffer.from(arrayBuffer))
        .rotate() // EXIF Orientation を反映
        .resize(IMAGE_MAX_DIMENSION, IMAGE_MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 90 })
        .toBuffer();
    } catch (e) {
      console.error("sharp decode error:", e);
      return NextResponse.json(
        { error: "画像を読み込めませんでした" },
        { status: 400 }
      );
    }
  }

  // user_hash 生成
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

  // 3 つのチェックを並列化
  const rateLimitSeconds =
    comment_type === "vote" ? VOTE_RATE_LIMIT_SECONDS : BOARD_RATE_LIMIT_SECONDS;

  const [banned, rateLimit, characterCheck] = await Promise.all([
    isUserBanned(supabase, userHash),
    checkRateLimit(
      supabase,
      "comments",
      { character_id, user_hash: userHash, comment_type },
      rateLimitSeconds
    ),
    supabase
      .from("characters")
      .select("id, slug")
      .eq("id", character_id)
      .eq("is_hidden", false)
      .maybeSingle(),
  ]);

  if (banned) {
    return NextResponse.json(
      { error: "投稿できません" },
      { status: 403 }
    );
  }
  if (rateLimit.limited) {
    return NextResponse.json(
      {
        error: `投稿間隔が短すぎます。${rateLimit.retryAfter}秒後にお試しください`,
        retry_after: rateLimit.retryAfter,
      },
      { status: 429 }
    );
  }
  if (!characterCheck.data) {
    return NextResponse.json(
      { error: "Character not found" },
      { status: 404 }
    );
  }

  // 画像モデレーション
  let imageUrl: string | null = null;
  let uploadedPath: string | null = null;
  if (webpBuffer) {
    try {
      const moderation = await moderateImage(webpBuffer);
      if (moderation.flagged) {
        return NextResponse.json(
          { error: "画像が利用規約に反する可能性があるため投稿できません" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "画像のチェックに失敗しました。少し待って再度お試しください" },
        { status: 503 }
      );
    }

    // Storage アップロード（ファイル名は UUID 先採番）
    const filename = `${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(COMMENT_IMAGES_BUCKET)
      .upload(filename, webpBuffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      console.error("comment image upload error:", uploadError.message);
      return NextResponse.json(
        { error: "画像のアップロードに失敗しました" },
        { status: 500 }
      );
    }

    uploadedPath = filename;
    const { data: publicUrlData } = supabase.storage
      .from(COMMENT_IMAGES_BUCKET)
      .getPublicUrl(filename);
    imageUrl = publicUrlData.publicUrl;
  }

  // 投票コメントの場合: 既存の is_latest_vote を false に更新
  if (comment_type === "vote") {
    await supabase
      .from("comments")
      .update({ is_latest_vote: false })
      .eq("character_id", character_id)
      .eq("user_hash", userHash)
      .eq("comment_type", "vote")
      .eq("is_latest_vote", true);
  }

  // コメント挿入
  const { data: newComment, error: insertError } = await supabase
    .from("comments")
    .insert({
      character_id,
      user_hash: userHash,
      comment_type,
      rating: comment_type === "vote" ? rating : null,
      body: body ?? null,
      display_name: display_name || DEFAULT_DISPLAY_NAME,
      is_latest_vote: comment_type === "vote" ? true : null,
      image_url: imageUrl,
    })
    .select()
    .single();

  if (insertError) {
    console.error("POST /api/comments insert error:", insertError.message);
    // ロールバック: アップロード済み画像があれば削除
    if (uploadedPath) {
      await supabase.storage
        .from(COMMENT_IMAGES_BUCKET)
        .remove([uploadedPath])
        .catch((e) => console.error("rollback storage remove failed:", e));
    }
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  // ISR キャッシュを無効化（slug は characterCheck 結果から取得済み）
  const charSlug = (characterCheck.data as { slug: string } | null)?.slug;
  if (charSlug) {
    revalidatePath(`/trickcal/characters/${charSlug}`);
  }

  const headers = setCookieHeaders(cookieUuid, isNewCookie);
  return NextResponse.json({ comment: newComment }, { status: 201, headers });
}
