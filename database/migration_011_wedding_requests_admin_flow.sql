-- ============================================================
-- Migration 011 - Wedding requests admin workflow fields
-- ============================================================

ALTER TABLE wedding_requests
  ADD COLUMN IF NOT EXISTS first_contact_sent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS opened_by UUID REFERENCES guests(id),
  ADD COLUMN IF NOT EXISTS open_notes TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_wedding_requests_status_updated_at
  ON wedding_requests(status, updated_at DESC);
