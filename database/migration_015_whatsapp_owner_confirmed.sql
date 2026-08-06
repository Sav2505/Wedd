-- Migration 015: Persist wedding owner's WhatsApp permission declaration
ALTER TABLE wedding_info
  ADD COLUMN IF NOT EXISTS whatsapp_owner_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
