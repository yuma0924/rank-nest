-- comments テーブルに画像添付用カラムを追加
-- 添付なしの場合は NULL。Supabase Storage の comment-images バケットの公開URLを格納する。

ALTER TABLE comments
  ADD COLUMN image_url TEXT;

COMMENT ON COLUMN comments.image_url IS
  '添付画像の Supabase Storage 公開URL (comment-images バケット)。NULL なら添付なし。';
