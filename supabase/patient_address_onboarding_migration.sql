-- ============================================================
-- Patient Address Onboarding Migration
-- ============================================================

-- 1. patient_profiles — tracks onboarding completion per patient
CREATE TABLE IF NOT EXISTS patient_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_user_id ON patient_profiles(user_id);

-- 2. patient_addresses — saved addresses per patient
CREATE TABLE IF NOT EXISTS patient_addresses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label            text NOT NULL CHECK (label IN ('home','office','mother','father','relative','child','other')),
  custom_label     text,
  person_name      text NOT NULL,
  mobile           text NOT NULL,
  alternate_mobile text,
  relationship     text,
  latitude         double precision,
  longitude        double precision,
  full_address     text,
  building         text,
  street           text,
  area             text,
  city             text,
  state            text,
  country          text,
  postal_code      text,
  is_default       boolean NOT NULL DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_addresses_patient_id ON patient_addresses(patient_id);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_addresses ENABLE ROW LEVEL SECURITY;

-- patient_profiles: patients can only see/edit their own row
CREATE POLICY "patient_profiles_select_own" ON patient_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "patient_profiles_insert_own" ON patient_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "patient_profiles_update_own" ON patient_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- patient_addresses: patients can only see/edit their own rows
CREATE POLICY "patient_addresses_select_own" ON patient_addresses
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "patient_addresses_insert_own" ON patient_addresses
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "patient_addresses_update_own" ON patient_addresses
  FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "patient_addresses_delete_own" ON patient_addresses
  FOR DELETE USING (auth.uid() = patient_id);

-- Admin can read everything
CREATE POLICY "patient_profiles_admin_select" ON patient_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "patient_addresses_admin_select" ON patient_addresses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
