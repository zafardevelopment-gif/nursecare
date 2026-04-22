-- ============================================================
-- Service Master Phase 1 — ROLLBACK
-- Run this ONLY to fully undo the Phase 1 migration.
-- All Phase 1 tables will be dropped. Existing data will be lost.
-- Does NOT affect: patient_bookings, hospital_booking_requests,
--                  platform_settings (only removes one column)
-- ============================================================

-- Drop tables in dependency order (children first)
DROP TABLE IF EXISTS booking_service_items CASCADE;
DROP TABLE IF EXISTS nurse_services        CASCADE;
DROP TABLE IF EXISTS services              CASCADE;
DROP TABLE IF EXISTS service_categories    CASCADE;

-- Remove feature flag column from platform_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name  = 'platform_settings'
      AND column_name = 'service_master_enabled'
  ) THEN
    ALTER TABLE platform_settings DROP COLUMN service_master_enabled;
  END IF;
END $$;
