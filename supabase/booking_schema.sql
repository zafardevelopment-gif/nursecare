-- ============================================================
-- booking_requests — parent record (one per booking submission)
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_name      text,
  patient_email     text,
  service_type      text NOT NULL,
  patient_condition text,
  shift             text NOT NULL,
  duration_hours    integer NOT NULL DEFAULT 8,
  city              text,
  address           text,
  notes             text,
  booking_type      text NOT NULL DEFAULT 'one_time'
                    CHECK (booking_type IN ('one_time', 'weekly', 'monthly')),
  start_date        date NOT NULL,
  end_date          date,
  days_of_week      integer[],
  total_sessions    integer NOT NULL DEFAULT 1,
  nurse_id          uuid REFERENCES users(id),
  nurse_name        text,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled', 'confirmed')),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- ============================================================
-- bookings — individual session rows (one per date)
-- ============================================================
-- Drop old bookings table and recreate with new schema
-- WARNING: only run this if old bookings table has no data you need to keep
-- OR use ALTER TABLE to add columns instead (see below)

-- Option A: Add missing columns to existing bookings table (SAFE — preserves existing data)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_id        uuid REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_name      text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_email     text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_request_id uuid REFERENCES booking_requests(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS session_number    integer DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_type      text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_condition text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date              date;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shift             text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_hours    integer DEFAULT 8;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city              text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address           text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes             text;

-- Make sure status column exists (old table may have it already)
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Enable RLS
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- RLS: patients can read/insert their own requests
CREATE POLICY IF NOT EXISTS "patients_own_requests"
  ON booking_requests
  FOR ALL
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- RLS: nurses/providers can read all pending requests
CREATE POLICY IF NOT EXISTS "providers_read_requests"
  ON booking_requests
  FOR SELECT
  USING (true);

-- RLS: patients can read their own bookings
CREATE POLICY IF NOT EXISTS "patients_own_bookings"
  ON bookings
  FOR SELECT
  USING (patient_id = auth.uid());
