CREATE TABLE IF NOT EXISTS whatsapp_quota_cutover_markers (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

WITH marker AS (
  INSERT INTO whatsapp_quota_cutover_markers (name)
  VALUES ('require_legacy_cutover')
  ON CONFLICT (name) DO NOTHING
  RETURNING name
)
UPDATE whatsapp_quota_settings
SET send_not_before = 'infinity'::timestamptz
WHERE id = TRUE AND EXISTS (SELECT 1 FROM marker);