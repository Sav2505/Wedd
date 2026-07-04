-- ============================================================
-- Migration 010 - Guest RSVP fields
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rsvp_status') THEN
    CREATE TYPE rsvp_status AS ENUM ('PENDING', 'COMING', 'NOT_COMING');
  END IF;
END
$$;

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS rsvp_status rsvp_status NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS number_of_guests INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rsvp_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Guardrail in case of unexpected legacy values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_guests_number_of_guests_positive'
  ) THEN
    ALTER TABLE guests
      ADD CONSTRAINT chk_guests_number_of_guests_positive
      CHECK (number_of_guests >= 1);
  END IF;
END
$$;
