CREATE TABLE IF NOT EXISTS ride_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id      INTEGER     NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
  creator_guest_id UUID       NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  kind            TEXT        NOT NULL CHECK (kind IN ('offer', 'request')),
  display_name    VARCHAR(80) NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 80),
  contact_phone   VARCHAR(16) CHECK (contact_phone IS NULL OR contact_phone ~ '^[+][1-9][0-9]{7,14}$'),
  origin_text     VARCHAR(120) NOT NULL CHECK (char_length(btrim(origin_text)) BETWEEN 2 AND 120),
  time_from       TIME        NOT NULL,
  time_to         TIME        DEFAULT NULL,
  seats_available SMALLINT    DEFAULT NULL,
  passenger_count SMALLINT    DEFAULT NULL,
  notes           VARCHAR(500) DEFAULT NULL,
  consented_at    TIMESTAMPTZ NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'full', 'closed', 'expired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  CHECK (time_to IS NULL OR time_to >= time_from),
  CHECK (
    (kind = 'offer' AND seats_available BETWEEN 1 AND 8 AND passenger_count IS NULL)
    OR (kind = 'request' AND passenger_count BETWEEN 1 AND 8 AND seats_available IS NULL)
  ),
  CHECK (status <> 'full' OR kind = 'offer'),
  CHECK (status = 'expired' OR contact_phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_ride_posts_wedding_status_expiry
  ON ride_posts (wedding_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_ride_posts_owner_wedding
  ON ride_posts (creator_guest_id, wedding_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ride_posts_active_owner_kind
  ON ride_posts (creator_guest_id, kind)
  WHERE status = 'active';