-- 各テーブルに game_slug カラムを追加
-- 2ゲーム目の追加に備えて、コメント/反応/編成/ティア/通報を
-- ゲームごとに分離できるようにする。既存データは全て 'trickcal'。

ALTER TABLE comments                 ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';
ALTER TABLE comment_reactions        ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';
ALTER TABLE builds                   ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';
ALTER TABLE build_reactions          ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';
ALTER TABLE build_comments           ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';
ALTER TABLE build_comment_reactions  ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';
ALTER TABLE tiers                    ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';
ALTER TABLE tier_reactions           ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';
ALTER TABLE tier_comments            ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';
ALTER TABLE tier_comment_reactions   ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';
ALTER TABLE reports                  ADD COLUMN game_slug TEXT NOT NULL DEFAULT 'trickcal';

-- よくあるアクセスパターン（ゲーム別に絞り込む）向けのインデックス
CREATE INDEX IF NOT EXISTS idx_comments_game_slug                ON comments(game_slug);
CREATE INDEX IF NOT EXISTS idx_builds_game_slug                  ON builds(game_slug);
CREATE INDEX IF NOT EXISTS idx_tiers_game_slug                   ON tiers(game_slug);
CREATE INDEX IF NOT EXISTS idx_reports_game_slug                 ON reports(game_slug);
