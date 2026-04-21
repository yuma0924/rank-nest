-- 親行を削除したらリアクション・コメントも自動削除されるように FK を更新
-- これがないと Supabase Studio から手動削除しようとしたとき
-- "foreign key constraint" エラーで削除できない。

-- comment_reactions → comments
ALTER TABLE comment_reactions
  DROP CONSTRAINT IF EXISTS comment_reactions_comment_id_fkey,
  ADD CONSTRAINT comment_reactions_comment_id_fkey
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;

-- build_comment_reactions → build_comments
ALTER TABLE build_comment_reactions
  DROP CONSTRAINT IF EXISTS build_comment_reactions_build_comment_id_fkey,
  ADD CONSTRAINT build_comment_reactions_build_comment_id_fkey
    FOREIGN KEY (build_comment_id) REFERENCES build_comments(id) ON DELETE CASCADE;

-- build_reactions → builds
ALTER TABLE build_reactions
  DROP CONSTRAINT IF EXISTS build_reactions_build_id_fkey,
  ADD CONSTRAINT build_reactions_build_id_fkey
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE;

-- build_comments → builds
ALTER TABLE build_comments
  DROP CONSTRAINT IF EXISTS build_comments_build_id_fkey,
  ADD CONSTRAINT build_comments_build_id_fkey
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE;

-- comments → characters
ALTER TABLE comments
  DROP CONSTRAINT IF EXISTS comments_character_id_fkey,
  ADD CONSTRAINT comments_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;

-- character_rankings → characters
ALTER TABLE character_rankings
  DROP CONSTRAINT IF EXISTS character_rankings_character_id_fkey,
  ADD CONSTRAINT character_rankings_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;
