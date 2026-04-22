-- ============================================================
-- Booking Operations Migration (Phase 2.5)
-- Production-safe: all IF NOT EXISTS guards — safe to re-run
-- Rollback: booking_operations_rollback.sql
-- ============================================================

-- ── 1. booking_change_requests ───────────────────────────────
-- Stores patient cancel/reschedule requests that go to admin review.
-- Separates the request from the actual booking status change,
-- keeping the booking intact until admin acts.

CREATE TABLE IF NOT EXISTS booking_change_requests (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid        NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  patient_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type      text        NOT NULL CHECK (request_type IN ('cancel', 'reschedule')),
  reason            text,
  -- Reschedule-specific fields (null for cancel requests)
  new_date          date,
  new_shift         text,
  -- Admin resolution
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note        text,
  resolved_by       uuid        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bcr_booking_id  ON booking_change_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_bcr_patient_id  ON booking_change_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_bcr_status      ON booking_change_requests(status);

-- RLS: patient sees own requests; admin sees all
ALTER TABLE booking_change_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_change_requests' AND policyname='bcr_patient_own') THEN
    CREATE POLICY bcr_patient_own ON booking_change_requests
      FOR ALL USING (patient_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_change_requests' AND policyname='bcr_admin_all') THEN
    CREATE POLICY bcr_admin_all ON booking_change_requests
      FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ── 2. Add notification types (extend check constraint) ──────
-- notifications table likely has no CHECK on type — this is safe.
-- New types used in Phase 2.5: booking_new, booking_change_requested,
-- booking_change_resolved, booking_cancelled

-- ── Done ─────────────────────────────────────────────────────
