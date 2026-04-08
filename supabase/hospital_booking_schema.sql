-- =============================================
-- HOSPITAL BOOKING REQUESTS SCHEMA
-- NurseCare+ — Run in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS hospital_booking_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id           uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  requested_by_user_id  uuid REFERENCES auth.users(id),

  booking_mode          text NOT NULL DEFAULT 'smart',
  -- 'smart' | 'browse'

  -- Period
  start_date            date NOT NULL,
  end_date              date NOT NULL,
  duration_days         integer NOT NULL DEFAULT 7,

  -- Requirements
  shifts                text[]    NOT NULL DEFAULT '{}',
  specializations       text[]    DEFAULT '{}',
  total_nurses          integer   NOT NULL DEFAULT 1,
  language_preference   text[]    DEFAULT '{}',
  gender_preference     text      DEFAULT 'any',
  special_instructions  text,

  -- Department breakdown (JSON array of {deptId, deptName, morning, evening, night})
  dept_breakdown        jsonb     DEFAULT '[]',

  -- Selected nurses (JSON array of {deptId, deptName, shift, nurseId, nurseName, nurseSpecialization})
  nurse_selections      jsonb     DEFAULT '[]',

  -- Workflow status
  status                text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'reviewing' | 'matched' | 'confirmed' | 'cancelled'

  -- Admin fields
  reviewed_by           uuid REFERENCES auth.users(id),
  reviewed_at           timestamptz,
  admin_notes           text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hbr_hospital_id_idx ON hospital_booking_requests(hospital_id);
CREATE INDEX IF NOT EXISTS hbr_status_idx ON hospital_booking_requests(status);
CREATE INDEX IF NOT EXISTS hbr_created_idx ON hospital_booking_requests(created_at DESC);

-- RLS
ALTER TABLE hospital_booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hbr_hospital_read" ON hospital_booking_requests
  FOR SELECT USING (
    hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid())
  );
CREATE POLICY "hbr_hospital_insert" ON hospital_booking_requests
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid())
  );
CREATE POLICY "hbr_service_all" ON hospital_booking_requests FOR ALL USING (true);

-- =============================================
-- MIGRATION: Add nurse_selections if table already exists
-- Run this if the table was created before nurse_selections was added
-- =============================================
ALTER TABLE hospital_booking_requests
  ADD COLUMN IF NOT EXISTS nurse_selections jsonb DEFAULT '[]';
