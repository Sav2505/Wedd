-- Admin-reviewed, scheduled WhatsApp messages for wedding guests.

CREATE TABLE IF NOT EXISTS wedding_custom_message_requests (
  id BIGSERIAL PRIMARY KEY,
  wedding_id INTEGER NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES guests(id) ON DELETE SET NULL,
  audience TEXT NOT NULL CHECK (audience IN ('COMING', 'PENDING', 'ALL')),
  message_body VARCHAR(1024) NOT NULL CHECK (char_length(btrim(message_body)) BETWEEN 1 AND 1024),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'sending', 'sent', 'sent_with_errors', 'expired')),
  admin_note TEXT DEFAULT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ DEFAULT NULL,
  decided_by UUID REFERENCES guests(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wcmsg_requests_pending
  ON wedding_custom_message_requests (submitted_at DESC)
  WHERE status = 'pending_approval';

CREATE INDEX IF NOT EXISTS idx_wcmsg_requests_due
  ON wedding_custom_message_requests (scheduled_at)
  WHERE status IN ('approved', 'pending_approval');

CREATE INDEX IF NOT EXISTS idx_wcmsg_requests_wedding
  ON wedding_custom_message_requests (wedding_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wedding_custom_message_deliveries (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES wedding_custom_message_requests(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  guest_first_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  whatsapp_message_id VARCHAR(120) DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ DEFAULT NULL,
  sent_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_wcmsg_delivery_request_guest UNIQUE (request_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_wcmsg_deliveries_request_status
  ON wedding_custom_message_deliveries (request_id, status);