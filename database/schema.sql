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
  first_name  TEXT        DEFAULT NULL,
  last_name   TEXT        DEFAULT NULL,
  guest_group_id UUID     DEFAULT NULL REFERENCES guest_groups(id) ON DELETE SET NULL,
  plus_count  INTEGER     DEFAULT 0,
  rsvp_status rsvp_status DEFAULT 'pending',
  number_of_guests INTEGER     DEFAULT 1,
  rsvp_updated_at TIMESTAMPTZ DEFAULT NULL,
  gift_amount INTEGER     DEFAULT NULL,
  wedding_id  INTEGER     NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
  CONSTRAINT uq_guests_wedding_name_phone UNIQUE (wedding_id, full_name, phone)
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
  id SERIAL PRIMARY KEY,
  bride_name TEXT NOT NULL,
  groom_name TEXT NOT NULL,
  wedding_date DATE NOT NULL,
  wedding_time TIME DEFAULT NULL,
  wedding_canpoy_time TIME DEFAULT '20:30:00',
  venue_name TEXT DEFAULT NULL,
  venue_address TEXT DEFAULT NULL,
  venue_lat DECIMAL(10,7) DEFAULT NULL,
  venue_lng DECIMAL(10,7) DEFAULT NULL,
  dress_code TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  message TEXT DEFAULT NULL,
  hero_image_url TEXT DEFAULT NULL,
  is_tables_published BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: wedding_requests
-- (single-row configuration for the wedding requests and statuses)
-- ============================================================
CREATE TABLE IF NOT EXISTS wedding_requests (
  id              SERIAL      PRIMARY KEY,
  bride_name      TEXT        NOT NULL DEFAULT 'הכלה',
  groom_name      TEXT        NOT NULL DEFAULT 'החתן',
  wedding_date    DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'new' CONSTRAINT chk_wedding_requests_status CHECK (status IN ('new', 'confirmed', 'cancelled')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email           TEXT        NOT NULL,
  phone_number    TEXT        NOT NULL,
  first_contact_sent_at TIMESTAMPTZ DEFAULT NULL,
  opened_at       TIMESTAMPTZ DEFAULT NULL,
  opened_by       UUID        DEFAULT NULL REFERENCES guests(id),
  open_notes      TEXT        DEFAULT NULL
);