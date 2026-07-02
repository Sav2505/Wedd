-- ============================================================
-- Migration 007 — Venue Pricing Fields
-- Adds price_per_plate and min_commitment to wedding_tasks
-- for smart venue cost calculation.
-- Run: npx ts-node --transpile-only src/db/run_migration_007.ts
-- ============================================================

ALTER TABLE wedding_tasks
  ADD COLUMN IF NOT EXISTS price_per_plate  NUMERIC(10,2) DEFAULT NULL
    CONSTRAINT chk_tasks_ppp_nn CHECK (price_per_plate IS NULL OR price_per_plate >= 0),
  ADD COLUMN IF NOT EXISTS min_commitment   INTEGER       DEFAULT NULL
    CONSTRAINT chk_tasks_min_nn CHECK (min_commitment IS NULL OR min_commitment >= 0);
