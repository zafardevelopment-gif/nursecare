-- ─────────────────────────────────────────────────────────────────
-- PHASE 3 — Dispute & Complaint Time Limit Rules
-- Run this in Supabase SQL Editor (safe to re-run — IF NOT EXISTS / IF EXISTS guards)
-- ─────────────────────────────────────────────────────────────────

-- 1. Add completed_at timestamp to booking_requests
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Backfill existing completed bookings with a reasonable timestamp
-- (uses created_at as proxy since booking_requests has no updated_at column)
UPDATE booking_requests
SET completed_at = created_at
WHERE status = 'completed'
  AND completed_at IS NULL;

-- 2. Add dispute/complaint settings columns to platform_settings
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS disputes_enabled              boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS complaints_enabled            boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dispute_window_hours          integer     NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS complaint_window_hours        integer     NOT NULL DEFAULT 168;  -- 7 days

-- 3. Add expired_attempt_blocked status tracking to disputes and complaints
-- disputes live inside booking_requests — no table change needed
-- complaints table: add expired_at for soft-expiry bookkeeping
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS expires_at     timestamptz,
  ADD COLUMN IF NOT EXISTS is_expired     boolean NOT NULL DEFAULT false;

-- Backfill expires_at for existing open complaints using complaint_window_hours default (168 h)
UPDATE complaints
SET expires_at = created_at + INTERVAL '168 hours'
WHERE expires_at IS NULL;

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_booking_requests_completed_at
  ON booking_requests (completed_at)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_is_expired
  ON complaints (is_expired);
