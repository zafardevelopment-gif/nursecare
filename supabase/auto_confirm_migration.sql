-- =============================================
-- MIGRATION: Auto-confirm work_done bookings
-- NurseCare+ — Run in Supabase SQL Editor
-- =============================================

-- 1. Add tracking columns to booking_requests
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS work_done_at     timestamptz,
  ADD COLUMN IF NOT EXISTS auto_confirm_at  timestamptz,
  ADD COLUMN IF NOT EXISTS auto_confirmed_at timestamptz;

COMMENT ON COLUMN booking_requests.work_done_at IS
  'Timestamp when nurse marked work as done.';
COMMENT ON COLUMN booking_requests.auto_confirm_at IS
  'Deadline for patient to confirm. If passed, system auto-confirms booking as completed.';
COMMENT ON COLUMN booking_requests.auto_confirmed_at IS
  'Timestamp when system auto-confirmed the booking (no patient action needed).';

-- 2. Add auto_complete_hours to platform_settings (if not already present)
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS auto_complete_hours integer NOT NULL DEFAULT 24;

COMMENT ON COLUMN platform_settings.auto_complete_hours IS
  'Hours after nurse marks work done within which patient must confirm. If not confirmed, system auto-completes. 0 = disabled.';

UPDATE platform_settings SET auto_complete_hours = 24 WHERE auto_complete_hours IS NULL;
