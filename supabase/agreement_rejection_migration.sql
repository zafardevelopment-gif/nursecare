-- Add rejection_reason column and allow 'rejected' status for nurse reject flow
ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Drop existing status constraint if any and re-add with 'rejected' included
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'agreements' AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%status%'
  ) THEN
    ALTER TABLE agreements DROP CONSTRAINT IF EXISTS agreements_status_check;
  END IF;
END $$;

ALTER TABLE agreements
  ADD CONSTRAINT agreements_status_check
  CHECK (status IN ('pending','admin_approved','nurse_approved','hospital_approved','fully_approved','rejected'));
