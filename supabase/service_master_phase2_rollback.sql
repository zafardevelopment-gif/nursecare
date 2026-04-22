-- ============================================================
-- Service Master Phase 2 — ROLLBACK
-- ============================================================

-- Remove service_id from booking_requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name  = 'booking_requests'
      AND column_name = 'service_id'
  ) THEN
    ALTER TABLE booking_requests DROP COLUMN service_id;
  END IF;
END $$;

-- Revert nurse_services FK back to users(id) if needed
-- (Only run if you need to fully revert Phase 1 + Phase 2)
-- ALTER TABLE nurse_services DROP CONSTRAINT IF EXISTS nurse_services_nurse_id_fkey;
-- ALTER TABLE nurse_services ADD CONSTRAINT nurse_services_nurse_id_fkey
--   FOREIGN KEY (nurse_id) REFERENCES users(id) ON DELETE CASCADE;
