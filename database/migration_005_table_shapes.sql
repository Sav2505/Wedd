-- ============================================================
-- Migration 005 — Rectangular (knights) table support
-- Adds orientation column to tables for rect-shaped tables.
-- Run: psql -U <user> -d <database> -f migration_005_table_shapes.sql
-- ============================================================

-- Add orientation column (h = landscape, v = portrait)
ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS orientation TEXT DEFAULT NULL
  CONSTRAINT chk_tables_orientation CHECK (orientation IN ('h', 'v'));
