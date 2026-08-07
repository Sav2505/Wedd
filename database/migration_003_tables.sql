-- ============================================================
-- Migration 003 — Seating tables
-- ============================================================

CREATE TABLE IF NOT EXISTS tables (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number INTEGER      NOT NULL,
  label        TEXT         DEFAULT NULL,
  capacity     INTEGER      NOT NULL DEFAULT 10,
  pos_x        NUMERIC(6,2) NOT NULL DEFAULT 50.00,
  pos_y        NUMERIC(6,2) NOT NULL DEFAULT 50.00,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  wedding_id   ID           NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
  CONSTRAINT uq_table_number UNIQUE (table_number, wedding_id)
);
