-- ============================================================
-- NurseCare+ Service Master — Run-All Migration Script
-- Run this ONCE in Supabase SQL Editor if starting fresh.
-- All statements use IF NOT EXISTS — safe to re-run.
-- ============================================================

-- ── PHASE 1: Core Service Master tables ──────────────────────

CREATE TABLE IF NOT EXISTS service_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  description text,
  icon        text        NOT NULL DEFAULT '🏥',
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         uuid        REFERENCES service_categories(id) ON DELETE SET NULL,
  name                text        NOT NULL,
  description         text,
  base_price          numeric(10,2) NOT NULL CHECK (base_price >= 0),
  min_price           numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_price >= 0),
  max_price           numeric(10,2) CHECK (max_price IS NULL OR max_price >= 0),
  duration_minutes    integer,
  requires_equipment  boolean     NOT NULL DEFAULT false,
  is_active           boolean     NOT NULL DEFAULT true,
  sort_order          integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nurse_services (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id    uuid        NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
  service_id  uuid        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  my_price    numeric(10,2) NOT NULL CHECK (my_price >= 0),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nurse_id, service_id)
);

CREATE TABLE IF NOT EXISTS booking_service_items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid        NOT NULL,
  booking_type  text        NOT NULL CHECK (booking_type IN ('patient', 'hospital')),
  service_id    uuid        REFERENCES services(id) ON DELETE SET NULL,
  service_name  text        NOT NULL,
  unit_price    numeric(10,2) NOT NULL,
  quantity      integer     NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_category_id       ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active         ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_nurse_services_nurse_id    ON nurse_services(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_services_service_id  ON nurse_services(service_id);
CREATE INDEX IF NOT EXISTS idx_nurse_services_is_active   ON nurse_services(is_active);
CREATE INDEX IF NOT EXISTS idx_bsi_booking_id             ON booking_service_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_bsi_booking_type           ON booking_service_items(booking_type);

-- RLS
ALTER TABLE service_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE services             ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_service_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='service_categories' AND policyname='sc_public_read') THEN
    CREATE POLICY sc_public_read  ON service_categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='service_categories' AND policyname='sc_admin_all') THEN
    CREATE POLICY sc_admin_all    ON service_categories FOR ALL
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='services' AND policyname='svc_public_read') THEN
    CREATE POLICY svc_public_read ON services FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='services' AND policyname='svc_admin_all') THEN
    CREATE POLICY svc_admin_all   ON services FOR ALL
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nurse_services' AND policyname='ns_active_read') THEN
    CREATE POLICY ns_active_read  ON nurse_services FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nurse_services' AND policyname='ns_nurse_own') THEN
    CREATE POLICY ns_nurse_own    ON nurse_services FOR ALL
      USING (nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nurse_services' AND policyname='ns_admin_all') THEN
    CREATE POLICY ns_admin_all    ON nurse_services FOR ALL
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_service_items' AND policyname='bsi_admin_all') THEN
    CREATE POLICY bsi_admin_all   ON booking_service_items FOR ALL
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Add service_master_enabled to platform_settings if not present
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS service_master_enabled boolean NOT NULL DEFAULT false;

-- ── PHASE 2: Link service_id to booking_requests ─────────────

ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_booking_requests_service_id ON booking_requests(service_id);

-- Fix nurse_services FK if it incorrectly points to users(id)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    JOIN information_schema.referential_constraints rc  ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.table_constraints tc2       ON rc.unique_constraint_name = tc2.constraint_name
    WHERE tc.table_name = 'nurse_services'
      AND ccu.column_name = 'nurse_id'
      AND tc2.table_name = 'users'
  ) THEN
    ALTER TABLE nurse_services DROP CONSTRAINT IF EXISTS nurse_services_nurse_id_fkey;
    ALTER TABLE nurse_services ADD CONSTRAINT nurse_services_nurse_id_fkey
      FOREIGN KEY (nurse_id) REFERENCES nurses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── PHASE 2.5: Booking change requests ───────────────────────

CREATE TABLE IF NOT EXISTS booking_change_requests (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid        NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  patient_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type      text        NOT NULL CHECK (request_type IN ('cancel', 'reschedule')),
  reason            text,
  new_date          date,
  new_shift         text,
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note        text,
  resolved_by       uuid        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bcr_booking_id        ON booking_change_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_bcr_patient_id        ON booking_change_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_bcr_status            ON booking_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_bcr_booking_id_status ON booking_change_requests(booking_id, status);

ALTER TABLE booking_change_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_change_requests' AND policyname='bcr_patient_own') THEN
    CREATE POLICY bcr_patient_own ON booking_change_requests
      FOR ALL USING (patient_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_change_requests' AND policyname='bcr_admin_all') THEN
    CREATE POLICY bcr_admin_all ON booking_change_requests
      FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ── PHASE 3: Hospital booking enhancements ───────────────────

ALTER TABLE hospital_booking_requests ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_hbr_service_id ON hospital_booking_requests(service_id);

ALTER TABLE hospital_booking_requests ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('normal', 'urgent', 'critical'));

ALTER TABLE hospital_booking_requests ADD COLUMN IF NOT EXISTS internal_notes text;

ALTER TABLE hospital_booking_requests ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;

ALTER TABLE hospital_booking_requests ADD COLUMN IF NOT EXISTS recurrence_type text
  CHECK (recurrence_type IN ('weekly', 'monthly', 'custom'));

ALTER TABLE hospital_booking_requests ADD COLUMN IF NOT EXISTS recurrence_end_date date;

-- ── Done ─────────────────────────────────────────────────────
-- After running this script, go to /admin/services to add
-- categories and services before enabling the feature flag.
-- ============================================================
