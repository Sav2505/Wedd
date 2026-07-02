-- ============================================================
-- Migration 009 — Store photo binaries directly in Postgres
-- Adds thumbnail_data (400px) and full_data (1920px) BYTEA columns
-- Makes url nullable for backward-compat with existing disk photos
-- ============================================================

ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS thumbnail_data BYTEA        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS full_data      BYTEA        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mime_type      TEXT         NOT NULL DEFAULT 'image/jpeg';

-- Allow url to be NULL — new binary photos won't have a file-system URL
ALTER TABLE photos
  ALTER COLUMN url DROP NOT NULL,
  ALTER COLUMN url SET DEFAULT NULL;
