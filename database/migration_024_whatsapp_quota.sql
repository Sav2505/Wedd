CREATE TABLE IF NOT EXISTS whatsapp_quota_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  send_not_before TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO whatsapp_quota_settings (id, send_not_before)
VALUES (TRUE, NOW() + INTERVAL '24 hours')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS whatsapp_quota_reservations (
  id BIGSERIAL PRIMARY KEY,
  template_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'accepted', 'unknown', 'rejected')),
  whatsapp_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK ((status = 'reserved' AND completed_at IS NULL) OR
         (status <> 'reserved' AND completed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_quota_reservations_active
  ON whatsapp_quota_reservations (status, completed_at)
  WHERE status IN ('reserved', 'accepted', 'unknown');