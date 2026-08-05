-- Migration 014: Persist per-wedding floor plan scale
ALTER TABLE wedding_info
  ADD COLUMN IF NOT EXISTS table_scale_factor DECIMAL(4,2) NOT NULL DEFAULT 1.00;
