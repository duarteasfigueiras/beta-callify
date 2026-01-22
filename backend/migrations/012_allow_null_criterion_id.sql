-- Migration: Allow NULL criterion_id in call_criteria_results
-- This allows preserving historical results when a criterion is deleted

-- Drop the NOT NULL constraint and update foreign key to SET NULL on delete
ALTER TABLE call_criteria_results
  ALTER COLUMN criterion_id DROP NOT NULL;

-- Update foreign key to SET NULL on delete (need to drop and recreate)
ALTER TABLE call_criteria_results
  DROP CONSTRAINT IF EXISTS call_criteria_results_criterion_id_fkey;

ALTER TABLE call_criteria_results
  ADD CONSTRAINT call_criteria_results_criterion_id_fkey
  FOREIGN KEY (criterion_id)
  REFERENCES criteria(id)
  ON DELETE SET NULL;

-- Add criterion_name column if it doesn't exist to store the name for historical reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'call_criteria_results' AND column_name = 'criterion_name'
  ) THEN
    ALTER TABLE call_criteria_results ADD COLUMN criterion_name TEXT;
  END IF;
END $$;

-- Backfill criterion_name for existing records
UPDATE call_criteria_results ccr
SET criterion_name = c.name
FROM criteria c
WHERE ccr.criterion_id = c.id
  AND ccr.criterion_name IS NULL;
