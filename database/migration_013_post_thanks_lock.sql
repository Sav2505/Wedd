-- Add dedicated lock column for the post-wedding thanks template.
ALTER TABLE wedding_message_schedule
ADD COLUMN IF NOT EXISTS post_thanks_locked_at TIMESTAMPTZ DEFAULT NULL;
