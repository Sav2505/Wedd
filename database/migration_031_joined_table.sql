ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS shape TEXT NOT NULL DEFAULT 'round';

ALTER TABLE tables
  DROP CONSTRAINT IF EXISTS chk_tables_shape;

ALTER TABLE tables
  ADD CONSTRAINT chk_tables_shape
  CHECK (shape IN ('round', 'square', 'rect', 'joined'));