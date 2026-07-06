-- ============================================================
-- Wedding Management System — Database Schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: guests
-- ============================================================
CREATE TABLE IF NOT EXISTS guests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  table_number INTEGER    DEFAULT NULL,        -- for seating (future)
  side        TEXT        CHECK (side IN ('חתן', 'כלה', 'שניהם')) DEFAULT NULL,
  role        TEXT        NOT NULL DEFAULT 'guest' CONSTRAINT chk_guests_role CHECK (role IN ('guest', 'couple')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_guests_name_phone UNIQUE (full_name, phone)
);

-- Index for fast login lookups (full_name + last 4 digits)
CREATE INDEX IF NOT EXISTS idx_guests_fullname ON guests (full_name);
CREATE INDEX IF NOT EXISTS idx_guests_phone    ON guests (phone);

-- ============================================================
-- TABLE: photos
-- (stored as URLs/paths; file storage handled separately)
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID        NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  caption     TEXT        DEFAULT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_uploader ON photos (uploader_id);
CREATE INDEX IF NOT EXISTS idx_photos_date     ON photos (uploaded_at DESC);

-- ============================================================
-- TABLE: wedding_info
-- (single-row configuration for the wedding details)
-- ============================================================
CREATE TABLE IF NOT EXISTS wedding_info (
  id              SERIAL      PRIMARY KEY,
  bride_name      TEXT        NOT NULL DEFAULT 'הכלה',
  groom_name      TEXT        NOT NULL DEFAULT 'החתן',
  wedding_date    DATE        NOT NULL,
  wedding_time    TIME        NOT NULL,
  venue_name      TEXT        NOT NULL,
  venue_address   TEXT        NOT NULL,
  venue_lat       DECIMAL(10, 7) DEFAULT NULL,
  venue_lng       DECIMAL(10, 7) DEFAULT NULL,
  dress_code      TEXT        DEFAULT NULL,
  notes           TEXT        DEFAULT NULL,
  message         TEXT        DEFAULT NULL,   -- Tab 4: message from couple
  hero_image_url  TEXT        DEFAULT NULL,   -- couple-uploaded header background
  is_tables_published BOOLEAN   NOT NULL DEFAULT FALSE, -- Tab 3: seating tables published
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);