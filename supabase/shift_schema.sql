-- ============================================================
-- SHIFT-BASED AVAILABILITY SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. nurse_shifts — nurse's recurring weekly shift template
CREATE TABLE IF NOT EXISTS nurse_shifts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id     uuid NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
  day_of_week  integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  shift        text NOT NULL CHECK (shift IN ('morning','evening','night')),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (nurse_id, day_of_week, shift)
);

-- 2. shift_bookings — actual bookings per shift slot
CREATE TABLE IF NOT EXISTS shift_bookings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id           uuid NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
  patient_id         uuid REFERENCES users(id),
  patient_name       text,
  booking_request_id uuid REFERENCES booking_requests(id) ON DELETE SET NULL,
  date               date NOT NULL,
  shift              text NOT NULL CHECK (shift IN ('morning','evening','night')),
  start_time         time NOT NULL,
  end_time           time NOT NULL,
  booked_hours       numeric(4,1) NOT NULL,
  booking_type       text NOT NULL DEFAULT 'patient' CHECK (booking_type IN ('patient','hospital')),
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','cancelled','completed')),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_bookings_nurse_date ON shift_bookings(nurse_id, date);
CREATE INDEX IF NOT EXISTS idx_shift_bookings_date_shift ON shift_bookings(date, shift);

-- 3. shift_availability — cached availability status per nurse+date+shift
CREATE TABLE IF NOT EXISTS shift_availability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id     uuid NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
  date         date NOT NULL,
  shift        text NOT NULL CHECK (shift IN ('morning','evening','night')),
  total_hours  numeric(4,1) NOT NULL DEFAULT 8,
  booked_hours numeric(4,1) NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'available'
               CHECK (status IN ('available','partial','booked')),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (nurse_id, date, shift)
);

CREATE INDEX IF NOT EXISTS idx_shift_availability_date ON shift_availability(date, shift, status);
CREATE INDEX IF NOT EXISTS idx_shift_availability_nurse ON shift_availability(nurse_id, date);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE nurse_shifts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_availability ENABLE ROW LEVEL SECURITY;

-- nurse_shifts: nurse can manage own rows
CREATE POLICY "nurse_shifts_own"
  ON nurse_shifts FOR ALL
  USING (
    nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid())
  );

-- shift_bookings: nurse can read own; patient can read own; anyone can read for availability checks
CREATE POLICY "shift_bookings_nurse_read"
  ON shift_bookings FOR SELECT
  USING (
    nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid())
    OR patient_id = auth.uid()
  );

-- shift_availability: publicly readable (needed for patient booking page)
CREATE POLICY "shift_availability_public_read"
  ON shift_availability FOR SELECT
  USING (true);
