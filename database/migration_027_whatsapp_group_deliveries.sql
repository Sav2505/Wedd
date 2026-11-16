ALTER TABLE wedding_whatsapp_group_schedule
  DROP CONSTRAINT IF EXISTS wedding_whatsapp_group_schedule_status_check;
ALTER TABLE wedding_whatsapp_group_schedule
  ADD CONSTRAINT wedding_whatsapp_group_schedule_status_check
  CHECK (status IN ('scheduled', 'processing', 'paused_quota', 'paused_schedule', 'paused_error', 'completed', 'excluded'));

CREATE TABLE IF NOT EXISTS wedding_whatsapp_group_deliveries (
  id BIGSERIAL PRIMARY KEY,
  schedule_id BIGINT NOT NULL REFERENCES wedding_whatsapp_group_schedule(id) ON DELETE CASCADE,
  wedding_id INTEGER NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL CHECK (template_name IN (
    'wedding_confirmation', 'wedding_reminder', 'wedding_day_before', 'wedding_post_thanks'
  )),
  quota_reservation_id BIGINT NOT NULL UNIQUE REFERENCES whatsapp_quota_reservations(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'unknown', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wedding_id, guest_id, template_name)
);

CREATE INDEX IF NOT EXISTS idx_wwgd_schedule_status
  ON wedding_whatsapp_group_deliveries (schedule_id, status, id);