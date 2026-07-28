-- ============================================================
-- Migration 012 - WhatsApp scheduling tables + wedding scope guards
-- ============================================================

-- Ensure wedding scope columns exist for legacy schemas where code already expects wedding_id.
-- ALTER TABLE guests
--   ADD COLUMN IF NOT EXISTS wedding_id INTEGER;

-- UPDATE guests
-- SET wedding_id = 1
-- WHERE wedding_id IS NULL;

-- ALTER TABLE guests
--   ALTER COLUMN wedding_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_guests_wedding_id'
  ) THEN
    ALTER TABLE guests
      ADD CONSTRAINT fk_guests_wedding_id
      FOREIGN KEY (wedding_id)
      REFERENCES wedding_info(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_guests_wedding_id ON guests(wedding_id);

ALTER TABLE guest_groups
  ADD COLUMN IF NOT EXISTS wedding_id INTEGER;

UPDATE guest_groups
SET wedding_id = 1
WHERE wedding_id IS NULL;

ALTER TABLE guest_groups
  ALTER COLUMN wedding_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_guest_groups_wedding_id'
  ) THEN
    ALTER TABLE guest_groups
      ADD CONSTRAINT fk_guest_groups_wedding_id
      FOREIGN KEY (wedding_id)
      REFERENCES wedding_info(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_guest_groups_wedding_id ON guest_groups(wedding_id);

ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS wedding_id INTEGER;

UPDATE tables
SET wedding_id = 1
WHERE wedding_id IS NULL;

ALTER TABLE tables
  ALTER COLUMN wedding_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_tables_wedding_id'
  ) THEN
    ALTER TABLE tables
      ADD CONSTRAINT fk_tables_wedding_id
      FOREIGN KEY (wedding_id)
      REFERENCES wedding_info(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_tables_wedding_id ON tables(wedding_id);

ALTER TABLE wedding_tasks
  ADD COLUMN IF NOT EXISTS wedding_id INTEGER;

UPDATE wedding_tasks
SET wedding_id = 1
WHERE wedding_id IS NULL;

ALTER TABLE wedding_tasks
  ALTER COLUMN wedding_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_wedding_tasks_wedding_id'
  ) THEN
    ALTER TABLE wedding_tasks
      ADD CONSTRAINT fk_wedding_tasks_wedding_id
      FOREIGN KEY (wedding_id)
      REFERENCES wedding_info(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_wedding_tasks_wedding_id ON wedding_tasks(wedding_id);

ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS wedding_id INTEGER;

UPDATE photos
SET wedding_id = 1
WHERE wedding_id IS NULL;

ALTER TABLE photos
  ALTER COLUMN wedding_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_photos_wedding_id'
  ) THEN
    ALTER TABLE photos
      ADD CONSTRAINT fk_photos_wedding_id
      FOREIGN KEY (wedding_id)
      REFERENCES wedding_info(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_photos_wedding_id ON photos(wedding_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wedding_message_delivery_status') THEN
    CREATE TYPE wedding_message_delivery_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS wedding_message_schedule (
  id SERIAL PRIMARY KEY,
  wedding_id INTEGER NOT NULL UNIQUE REFERENCES wedding_info(id) ON DELETE CASCADE,
  invitation_days_before INTEGER NOT NULL DEFAULT 30,
  reminder_days_before INTEGER NOT NULL DEFAULT 14,
  day_before_offset_days INTEGER NOT NULL DEFAULT 1,
  invitation_locked_at TIMESTAMPTZ DEFAULT NULL,
  reminder_locked_at TIMESTAMPTZ DEFAULT NULL,
  day_before_locked_at TIMESTAMPTZ DEFAULT NULL,
  invitation_image BYTEA DEFAULT NULL,
  invitation_image_mime_type VARCHAR(100) DEFAULT NULL,
  invitation_image_filename VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_wms_invitation_days_non_negative CHECK (invitation_days_before >= 0),
  CONSTRAINT chk_wms_reminder_days_non_negative CHECK (reminder_days_before >= 0),
  CONSTRAINT chk_wms_day_before_days_non_negative CHECK (day_before_offset_days >= 0)
);

CREATE TABLE IF NOT EXISTS wedding_message_log (
  id BIGSERIAL PRIMARY KEY,
  wedding_id INTEGER NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  template_name VARCHAR(64) NOT NULL,
  status wedding_message_delivery_status NOT NULL DEFAULT 'pending',
  whatsapp_message_id VARCHAR(120) DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_wml_template_name
    CHECK (template_name IN ('wedding_confirmation', 'wedding_reminder', 'wedding_day_before', 'wedding_post_thanks')),
  CONSTRAINT uq_wml_wedding_guest_template UNIQUE (wedding_id, guest_id, template_name)
);

CREATE INDEX IF NOT EXISTS idx_wml_template_status_updated_at
  ON wedding_message_log(template_name, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_wml_wedding_template
  ON wedding_message_log(wedding_id, template_name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wml_whatsapp_message_id
  ON wedding_message_log(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

INSERT INTO wedding_message_schedule (wedding_id)
VALUES (1)
ON CONFLICT (wedding_id) DO NOTHING;