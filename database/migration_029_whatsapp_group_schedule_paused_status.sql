ALTER TABLE wedding_whatsapp_group_schedule
  DROP CONSTRAINT IF EXISTS wedding_whatsapp_group_schedule_status_check;

ALTER TABLE wedding_whatsapp_group_schedule
  ADD CONSTRAINT wedding_whatsapp_group_schedule_status_check
  CHECK (status IN (
    'scheduled', 'processing', 'paused_quota', 'paused_error', 'paused_schedule', 'completed', 'excluded'
  ));