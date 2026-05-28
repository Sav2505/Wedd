-- ============================================================
-- Wedding Management System — Seed Data
-- ============================================================

-- ============================================================
-- Wedding Info (single row, id must = 1)
-- ============================================================
INSERT INTO wedding_info (
  id,
  bride_name,
  groom_name,
  wedding_date,
  wedding_time,
  venue_name,
  venue_address,
  venue_lat,
  venue_lng,
  dress_code,
  notes,
  message
) VALUES (
  1,
  'נועה',
  'יוסי',
  '2026-07-15',
  '19:30',
  'אולם האחוזה',
  'רחוב הפרחים 1, תל אביב',
  32.0853000,
  34.7817600,
  'לבוש חגיגי — גוונים בהירים / לבן / שמנת',
  'אנא הגיעו 30 דקות לפני תחילת האירוע',
  'אתם המשפחה והחברים הקרובים שלנו, ואנו כל כך שמחים לחגוג איתכם את היום המיוחד הזה. תודה שאתם כאן!'
)
ON CONFLICT (id) DO UPDATE SET
  bride_name    = EXCLUDED.bride_name,
  groom_name    = EXCLUDED.groom_name,
  wedding_date  = EXCLUDED.wedding_date,
  wedding_time  = EXCLUDED.wedding_time,
  venue_name    = EXCLUDED.venue_name,
  venue_address = EXCLUDED.venue_address,
  venue_lat     = EXCLUDED.venue_lat,
  venue_lng     = EXCLUDED.venue_lng,
  dress_code    = EXCLUDED.dress_code,
  notes         = EXCLUDED.notes,
  message       = EXCLUDED.message,
  updated_at    = NOW();

-- ============================================================
-- Guests
-- Authentication: full_name + last 4 digits of phone
--
-- User 1: אורח אורח    — phone: 0501234567  → last 4: 4567
-- User 2: אורחת אורחת  — phone: 0501234567  → last 4: 4567
-- ============================================================
INSERT INTO guests (full_name, phone, table_number, side, role) VALUES
  ('אורח אורח',   '0501234567', 1,    'חתן',  'guest'),
  ('אורחת אורחת', '0501234567', 2,    'כלה',  'guest'),
  ('חתן חתן',    '0501234567', NULL, 'חתן',  'couple'),
  ('כלה כלה',    '0501234567', NULL, 'כלה',  'couple')
ON CONFLICT (full_name, phone) DO UPDATE SET role = EXCLUDED.role;

