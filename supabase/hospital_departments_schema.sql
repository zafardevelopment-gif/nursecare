-- =============================================
-- HOSPITAL DEPARTMENTS SCHEMA
-- NurseCare+ — Run in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS hospital_departments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,

  name            text NOT NULL,
  icon            text NOT NULL DEFAULT '🏥',
  color           text NOT NULL DEFAULT '#0E7B8C',
  bg_color        text NOT NULL DEFAULT '#FFF0F0',

  department_head text,
  total_beds      integer NOT NULL DEFAULT 0,
  occupied_beds   integer NOT NULL DEFAULT 0,
  nurses_needed   integer NOT NULL DEFAULT 0,
  nurses_active   integer NOT NULL DEFAULT 0,

  status          text NOT NULL DEFAULT 'active',
  -- 'active' | 'maintenance' | 'closed'

  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hd_hospital_id_idx ON hospital_departments(hospital_id);
CREATE INDEX IF NOT EXISTS hd_status_idx ON hospital_departments(status);

-- RLS
ALTER TABLE hospital_departments ENABLE ROW LEVEL SECURITY;

-- Hospital can read/write their own departments
CREATE POLICY "hd_hospital_read" ON hospital_departments
  FOR SELECT USING (
    hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid())
  );
CREATE POLICY "hd_service_all" ON hospital_departments FOR ALL USING (true);
