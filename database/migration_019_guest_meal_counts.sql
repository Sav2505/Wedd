-- ============================================================
-- Migration 019 - Guest meal counts
-- ============================================================

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS vegetarian_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vegan_count INTEGER NOT NULL DEFAULT 0;

UPDATE guests
SET
  vegetarian_count = CASE WHEN requested_dish_type = 'vegetarian' THEN GREATEST(COALESCE(number_of_guests, 1), 1) ELSE 0 END,
  vegan_count = CASE WHEN requested_dish_type = 'vegan' THEN GREATEST(COALESCE(number_of_guests, 1), 1) ELSE 0 END
WHERE vegetarian_count = 0
  AND vegan_count = 0
  AND requested_dish_type IN ('vegetarian', 'vegan');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_guests_meal_counts_within_party'
  ) THEN
    ALTER TABLE guests
      ADD CONSTRAINT chk_guests_meal_counts_within_party
      CHECK (
        vegetarian_count >= 0
        AND vegan_count >= 0
        AND vegetarian_count + vegan_count <= number_of_guests
      );
  END IF;
END
$$;