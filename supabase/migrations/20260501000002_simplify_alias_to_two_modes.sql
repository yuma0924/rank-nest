-- エーリアスフロンティア対応の見直し:
-- サブステージ管理は不要だったため、alias_stage カラムと整合性 CHECK を削除する。
-- mode は 'alias' (6体) と 'meow' (9体) の2つを正規モードとして扱う。

BEGIN;

-- 1) 整合性 CHECK を削除（alias_stage 列に依存しているため先に削除）
ALTER TABLE builds DROP CONSTRAINT IF EXISTS builds_alias_stage_consistency;

-- 2) alias_stage 用インデックスを削除
DROP INDEX IF EXISTS idx_builds_alias_stage_likes;

-- 3) alias_stage カラム削除
ALTER TABLE builds DROP COLUMN IF EXISTS alias_stage;

-- 4) mode CHECK 制約を更新: 'meow' を追加
ALTER TABLE builds DROP CONSTRAINT IF EXISTS builds_mode_check;
ALTER TABLE builds ADD CONSTRAINT builds_mode_check
  CHECK (mode IN ('general', 'arena', 'dimension', 'world_tree', 'alias', 'meow'));

COMMIT;
