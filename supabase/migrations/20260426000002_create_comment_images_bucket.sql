-- コメント添付画像用の Supabase Storage バケットを作成
-- 公開読取り、書き込みは service_role 経由（API Route）のみ

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comment-images',
  'comment-images',
  true,
  2097152,  -- 2MB（API 側で WebP 変換後はもっと小さくなる想定）
  ARRAY['image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 公開 SELECT（誰でも画像を取得可能）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'comment_images_public_read'
  ) THEN
    CREATE POLICY "comment_images_public_read" ON storage.objects
      FOR SELECT TO anon
      USING (bucket_id = 'comment-images');
  END IF;
END
$$;
