-- ============================================================
-- Migration 004 - Guest groups + guest profile fields
-- ============================================================

-- Group table (top-level categories created by couple)
CREATE TABLE IF NOT EXISTS guest_groups (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_guest_group_name UNIQUE (name)
);

-- Extended guest profile fields
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_group_id UUID REFERENCES guest_groups(id) ON DELETE SET NULL;

-- Backfill first/last names from existing full_name where possible
UPDATE guests
SET
  first_name = COALESCE(NULLIF(first_name, ''), NULLIF(split_part(full_name, ' ', 1), '')),
  last_name  = COALESCE(
    NULLIF(last_name, ''),
    NULLIF(trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), '')
  )
WHERE role = 'guest';

CREATE INDEX IF NOT EXISTS idx_guests_guest_group_id ON guests(guest_group_id);
CREATE INDEX IF NOT EXISTS idx_guests_role ON guests(role);
