-- =============================================
-- MIGRATION: No-show / Dispute tracking
-- NurseCare+ — Run in Supabase SQL Editor
-- =============================================

-- 1. Add dispute columns to booking_requests
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS dispute_type        text CHECK (dispute_type IN ('provider_no_show', 'patient_absent', 'access_denied', 'quality_issue', 'other')),
  ADD COLUMN IF NOT EXISTS dispute_reason      text,
  ADD COLUMN IF NOT EXISTS dispute_raised_by   uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS dispute_raised_at   timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_status      text DEFAULT 'none' CHECK (dispute_status IN ('none', 'open', 'under_review', 'resolved')),
  ADD COLUMN IF NOT EXISTS dispute_resolution  text,
  ADD COLUMN IF NOT EXISTS dispute_resolved_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz;

-- 2. Extend status enum to include no_show and disputed
-- (Supabase/Postgres: we update the CHECK constraint)
ALTER TABLE booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_status_check;

ALTER TABLE booking_requests
  ADD CONSTRAINT booking_requests_status_check
  CHECK (status IN (
    'pending', 'accepted', 'confirmed', 'declined',
    'in_progress', 'work_done', 'completed', 'cancelled',
    'no_show', 'disputed'
  ));

COMMENT ON COLUMN booking_requests.dispute_type IS
  'Type of issue: provider_no_show (patient reports nurse absent), patient_absent (nurse reports patient/access issue), quality_issue, other';

COMMENT ON COLUMN booking_requests.dispute_status IS
  'Lifecycle of the dispute: none → open → under_review → resolved';
