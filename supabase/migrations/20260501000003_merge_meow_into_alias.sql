-- エーリアスフロンティアとM.E.O.Wを単一モードに統合:
-- 「エーリアスフロンティア」内で M.E.O.W を選んだ場合だけ 9 体編成にできるという
-- ゲーム実態に合わせ、mode='meow' を廃止して mode='alias' に統合する。
-- M.E.O.W 編成かどうかは party_size === 9 で判定する（alias で 6 か 9 のどちらか）。

BEGIN;

-- 1) 既存 'meow' データを 'alias' に移行（party_size はそのまま 9 で残る）
UPDATE builds SET mode = 'alias' WHERE mode = 'meow';

-- 2) CHECK 制約から 'meow' を削除
ALTER TABLE builds DROP CONSTRAINT IF EXISTS builds_mode_check;
ALTER TABLE builds ADD CONSTRAINT builds_mode_check
  CHECK (mode IN ('general', 'arena', 'dimension', 'world_tree', 'alias'));

COMMIT;
