DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'wedding_info'
      AND column_name = 'paybox_url'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'wedding_info'
        AND column_name = 'bride_paybox_url'
    ) THEN
      ALTER TABLE wedding_info RENAME COLUMN paybox_url TO bride_paybox_url;
    ELSE
      UPDATE wedding_info
        SET bride_paybox_url = COALESCE(bride_paybox_url, paybox_url),
          paybox_url = NULL;
    END IF;
  END IF;
END $$;

ALTER TABLE wedding_info
  ADD COLUMN IF NOT EXISTS bride_paybox_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS groom_paybox_url TEXT DEFAULT NULL;