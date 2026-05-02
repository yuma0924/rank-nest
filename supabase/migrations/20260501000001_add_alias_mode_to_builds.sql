-- エーリアスフロンティア対応:
-- builds テーブルに mode='alias' を追加し、性格5種＋M.E.O.W のサブステージを
-- 表す alias_stage カラムを新設する。
-- party_size は alias_stage='meow' のとき 9、それ以外 6（アプリ層で制御）。

BEGIN;

-- 1) mode CHECK 制約に 'alias' を追加
ALTER TABLE builds DROP CONSTRAINT IF EXISTS builds_mode_check;
ALTER TABLE builds ADD CONSTRAINT builds_mode_check
  CHECK (mode IN ('general', 'arena', 'dimension', 'world_tree', 'alias'));

-- 2) alias_stage カラム追加（mode='alias' の時のみ NOT NULL）
ALTER TABLE builds ADD COLUMN IF NOT EXISTS alias_stage TEXT
  CHECK (alias_stage IS NULL OR alias_stage IN (
    'pure', 'calm', 'madness', 'lively', 'melancholy', 'meow'
  ));

-- 3) mode と alias_stage の整合性
ALTER TABLE builds DROP CONSTRAINT IF EXISTS builds_alias_stage_consistency;
ALTER TABLE builds ADD CONSTRAINT builds_alias_stage_consistency
  CHECK (
    (mode = 'alias' AND alias_stage IS NOT NULL) OR
    (mode <> 'alias' AND alias_stage IS NULL)
  );

-- 4) 検索用インデックス（一覧で alias_stage 絞り込み + 人気順ソート）
CREATE INDEX IF NOT EXISTS idx_builds_alias_stage_likes
  ON builds (alias_stage, likes_count DESC)
  WHERE mode = 'alias' AND is_deleted = false;

COMMENT ON COLUMN builds.alias_stage IS
  'エーリアスフロンティアのサブステージ（pure/calm/madness/lively/melancholy/meow）。mode=alias の時のみ NOT NULL。';

COMMIT;
