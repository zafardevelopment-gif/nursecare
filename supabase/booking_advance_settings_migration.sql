-- =============================================
-- MIGRATION: Add advance booking limit settings
-- NurseCare+ — Run in Supabase SQL Editor
-- =============================================

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS min_advance_hours  integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_advance_days   integer NOT NULL DEFAULT 30;

-- Update existing row with defaults
UPDATE platform_settings SET
  min_advance_hours = 2,
  max_advance_days  = 30
WHERE min_advance_hours IS NULL OR max_advance_days IS NULL;

COMMENT ON COLUMN platform_settings.min_advance_hours IS
  'Minimum hours before booking start time a booking can be placed (e.g. 2 = must book at least 2h in advance)';

COMMENT ON COLUMN platform_settings.max_advance_days IS
  'Maximum days in advance a booking can be placed (e.g. 30 = cannot book more than 30 days out)';
