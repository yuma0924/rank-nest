-- リアクションカウントの race condition 修正
-- サーバー API で手動更新していた箇所が同時リクエスト時に古い read を
-- 元に計算してマイナス値を書き込んでいた。
-- 1) tier_comment_reactions のトリガーを追加（他テーブルには既に有り）
-- 2) 全テーブルのカウントを実データから再計算して整合性を取り戻す

-------------------------------------------------------
-- tier_comment_reactions → tier_comments.thumbs_up/down_count の
-- 非正規化カウント自動更新トリガー
-------------------------------------------------------
CREATE OR REPLACE FUNCTION update_tier_comment_reaction_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_comment_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_comment_id := OLD.tier_comment_id;
  ELSE
    target_comment_id := NEW.tier_comment_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.tier_comment_id <> NEW.tier_comment_id THEN
    UPDATE tier_comments SET
      thumbs_up_count = (SELECT COUNT(*) FROM tier_comment_reactions WHERE tier_comment_id = OLD.tier_comment_id AND reaction_type = 'up'),
      thumbs_down_count = (SELECT COUNT(*) FROM tier_comment_reactions WHERE tier_comment_id = OLD.tier_comment_id AND reaction_type = 'down')
    WHERE id = OLD.tier_comment_id;
  END IF;

  UPDATE tier_comments SET
    thumbs_up_count = (SELECT COUNT(*) FROM tier_comment_reactions WHERE tier_comment_id = target_comment_id AND reaction_type = 'up'),
    thumbs_down_count = (SELECT COUNT(*) FROM tier_comment_reactions WHERE tier_comment_id = target_comment_id AND reaction_type = 'down')
  WHERE id = target_comment_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tier_comment_reactions_count ON tier_comment_reactions;
CREATE TRIGGER trg_tier_comment_reactions_count
  AFTER INSERT OR UPDATE OR DELETE ON tier_comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_tier_comment_reaction_counts();

-------------------------------------------------------
-- 既存カウントの整合性復旧（実データから再計算）
-------------------------------------------------------

-- comments（キャラコメント）
UPDATE comments c
SET
  thumbs_up_count = COALESCE((SELECT COUNT(*) FROM comment_reactions cr WHERE cr.comment_id = c.id AND cr.reaction_type = 'up'), 0),
  thumbs_down_count = COALESCE((SELECT COUNT(*) FROM comment_reactions cr WHERE cr.comment_id = c.id AND cr.reaction_type = 'down'), 0);

-- tier_comments
UPDATE tier_comments tc
SET
  thumbs_up_count = COALESCE((SELECT COUNT(*) FROM tier_comment_reactions tcr WHERE tcr.tier_comment_id = tc.id AND tcr.reaction_type = 'up'), 0),
  thumbs_down_count = COALESCE((SELECT COUNT(*) FROM tier_comment_reactions tcr WHERE tcr.tier_comment_id = tc.id AND tcr.reaction_type = 'down'), 0);

-- build_comments
UPDATE build_comments bc
SET
  thumbs_up_count = COALESCE((SELECT COUNT(*) FROM build_comment_reactions bcr WHERE bcr.build_comment_id = bc.id AND bcr.reaction_type = 'up'), 0),
  thumbs_down_count = COALESCE((SELECT COUNT(*) FROM build_comment_reactions bcr WHERE bcr.build_comment_id = bc.id AND bcr.reaction_type = 'down'), 0);

-- builds
UPDATE builds b
SET
  likes_count = COALESCE((SELECT COUNT(*) FROM build_reactions br WHERE br.build_id = b.id AND br.reaction_type = 'up'), 0),
  dislikes_count = COALESCE((SELECT COUNT(*) FROM build_reactions br WHERE br.build_id = b.id AND br.reaction_type = 'down'), 0);

-- tiers
UPDATE tiers t
SET
  likes_count = COALESCE((SELECT COUNT(*) FROM tier_reactions tr WHERE tr.tier_id = t.id AND tr.reaction_type = 'up'), 0);
