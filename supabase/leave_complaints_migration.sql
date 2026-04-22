-- ============================================================
-- NurseCare+ — Leave Management + Complaints Migration
-- Run ONCE in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).
-- ============================================================

-- ── MODULE 1: Leave Management ────────────────────────────────

CREATE TABLE IF NOT EXISTS leave_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_user_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nurse_name      text        NOT NULL DEFAULT '',
  leave_date      date        NOT NULL,
  leave_type      text        NOT NULL DEFAULT 'full_day'
                              CHECK (leave_type IN ('full_day', 'half_day')),
  reason          text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note      text,
  reviewed_by     uuid        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  -- Snapshot of booking conflicts at request time (for admin info)
  has_bookings    boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_nurse_user ON leave_requests(nurse_user_id);
CREATE INDEX IF NOT EXISTS idx_leave_status     ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_date       ON leave_requests(leave_date);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leave_requests' AND policyname='lr_nurse_own') THEN
    CREATE POLICY lr_nurse_own ON leave_requests
      FOR ALL USING (nurse_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leave_requests' AND policyname='lr_admin_all') THEN
    CREATE POLICY lr_admin_all ON leave_requests
      FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ── MODULE 2: Complaints ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS complaints (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who filed it
  reporter_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reporter_role   text        NOT NULL CHECK (reporter_role IN ('patient','provider','hospital')),
  reporter_name   text        NOT NULL DEFAULT '',
  -- Optional booking link
  booking_id      uuid        REFERENCES booking_requests(id) ON DELETE SET NULL,
  -- Classification
  complaint_type  text        NOT NULL CHECK (complaint_type IN (
                                'no_show',
                                'late_arrival',
                                'misbehavior',
                                'service_quality',
                                'payment_issue',
                                'wrong_cancellation',
                                'safety_issue',
                                'other'
                              )),
  description     text        NOT NULL,
  -- Optional proof image URL (Supabase Storage)
  image_url       text,
  -- Workflow
  status          text        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'resolved', 'rejected')),
  admin_note      text,
  reviewed_by     uuid        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints(reporter_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status   ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_booking  ON complaints(booking_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created  ON complaints(created_at DESC);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='complaints' AND policyname='c_reporter_own') THEN
    CREATE POLICY c_reporter_own ON complaints
      FOR ALL USING (reporter_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='complaints' AND policyname='c_admin_all') THEN
    CREATE POLICY c_admin_all ON complaints
      FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ── Supabase Storage bucket for complaint images ──────────────
-- Run this separately in Supabase Dashboard > Storage > New bucket:
--   Name: complaint-images
--   Public: false
--   File size limit: 5MB
--   Allowed MIME types: image/jpeg, image/png, image/webp

-- ── Done ─────────────────────────────────────────────────────
