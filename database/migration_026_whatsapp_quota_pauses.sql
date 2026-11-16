CREATE TABLE IF NOT EXISTS wedding_whatsapp_legacy_pauses (
  wedding_id INTEGER NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL CHECK (template_name IN (
    'wedding_confirmation', 'wedding_reminder', 'wedding_day_before', 'wedding_post_thanks'
  )),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (wedding_id, template_name)
);

ALTER TABLE wedding_custom_message_requests
  DROP CONSTRAINT IF EXISTS wedding_custom_message_requests_status_check;
ALTER TABLE wedding_custom_message_requests
  ADD CONSTRAINT wedding_custom_message_requests_status_check
  CHECK (status IN ('pending_approval', 'approved', 'rejected', 'sending', 'paused_quota', 'sent', 'sent_with_errors', 'expired'));