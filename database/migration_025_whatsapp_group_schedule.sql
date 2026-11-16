CREATE UNIQUE INDEX IF NOT EXISTS uq_guest_groups_wedding_id_id
  ON guest_groups (wedding_id, id);

CREATE TABLE IF NOT EXISTS wedding_whatsapp_group_schedule (
  id BIGSERIAL PRIMARY KEY,
  wedding_id INTEGER NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL CHECK (template_name IN (
    'wedding_confirmation', 'wedding_reminder', 'wedding_day_before', 'wedding_post_thanks'
  )),
  guest_group_id UUID,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN (
    'scheduled', 'processing', 'paused_quota', 'paused_error', 'paused_schedule', 'completed', 'excluded'
  )),
  status_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (wedding_id, guest_group_id) REFERENCES guest_groups(wedding_id, id),
  CHECK ((status = 'excluded' AND scheduled_at IS NULL) OR
         (status <> 'excluded' AND scheduled_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wwgs_wedding_template_group
  ON wedding_whatsapp_group_schedule (wedding_id, template_name, guest_group_id)
  WHERE guest_group_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wwgs_wedding_template_ungrouped
  ON wedding_whatsapp_group_schedule (wedding_id, template_name)
  WHERE guest_group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_wwgs_due
  ON wedding_whatsapp_group_schedule (scheduled_at, id)
  WHERE status = 'scheduled';