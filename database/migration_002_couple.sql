-- ============================================================
-- Migration 002 — Add couple role + hero image support
-- ============================================================

-- Add role column to guests
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'guest';

-- Add CHECK constraint only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_guests_role'
  ) THEN
    ALTER TABLE guests
      ADD CONSTRAINT chk_guests_role CHECK (role IN ('guest', 'couple'));
  END IF;
END $$;

-- Add hero image URL to wedding_info
ALTER TABLE wedding_info
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT DEFAULT NULL;

-- ── Couple users ─────────────────────────────────────────────
-- חתן חתן  phone: 0501234567  last 4: 4567  role: couple
-- כלה כלה  phone: 0501234567  last 4: 4567  role: couple
INSERT INTO guests (full_name, phone, table_number, side, role) VALUES
  ('חתן חתן', '0501234567', NULL, 'חתן', 'couple'),
  ('כלה כלה', '0501234567', NULL, 'כלה', 'couple')
ON CONFLICT (full_name, phone) DO UPDATE SET role = 'couple';
