-- Migration 008: Add stage_label to wedding_info
ALTER TABLE wedding_info
  ADD COLUMN IF NOT EXISTS stage_label VARCHAR(50) DEFAULT 'חופה';
