-- tiers テーブルに description カラム追加
ALTER TABLE tiers ADD COLUMN description TEXT;

-- updated_at トリガー関数を description も見るように更新
CREATE OR REPLACE FUNCTION update_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.title IS DISTINCT FROM OLD.title OR
    NEW.display_name IS DISTINCT FROM OLD.display_name OR
    NEW.description IS DISTINCT FROM OLD.description OR
    NEW.data IS DISTINCT FROM OLD.data OR
    NEW.user_hash IS DISTINCT FROM OLD.user_hash OR
    NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
  ) THEN
    NEW.updated_at = now();
  ELSE
    NEW.updated_at = OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
