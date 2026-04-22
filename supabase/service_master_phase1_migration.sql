-- ============================================================
-- Service Master Phase 1 Migration
-- Production-safe: all CREATE IF NOT EXISTS — safe to re-run
-- Rollback script: service_master_phase1_rollback.sql
-- ============================================================

-- ── 1. service_categories ────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  icon        text        NOT NULL DEFAULT '🏥',
  sort_order  int         NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_categories_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_service_categories_is_active
  ON service_categories (is_active);

CREATE INDEX IF NOT EXISTS idx_service_categories_sort_order
  ON service_categories (sort_order);

-- ── 2. services ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS services (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         uuid           REFERENCES service_categories (id) ON DELETE SET NULL,
  name                text           NOT NULL,
  description         text,
  base_price          numeric(10, 2) NOT NULL CHECK (base_price >= 0),
  min_price           numeric(10, 2) NOT NULL CHECK (min_price >= 0),
  max_price           numeric(10, 2)            CHECK (max_price IS NULL OR max_price >= min_price),
  duration_minutes    int                        CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  requires_equipment  boolean        NOT NULL DEFAULT false,
  is_active           boolean        NOT NULL DEFAULT true,
  sort_order          int            NOT NULL DEFAULT 0,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_category_id
  ON services (category_id);

CREATE INDEX IF NOT EXISTS idx_services_is_active
  ON services (is_active);

CREATE INDEX IF NOT EXISTS idx_services_sort_order
  ON services (sort_order);

-- ── 3. nurse_services ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nurse_services (
  id         uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id   uuid           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  service_id uuid           NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  my_price   numeric(10, 2) NOT NULL CHECK (my_price >= 0),
  is_active  boolean        NOT NULL DEFAULT true,
  created_at timestamptz    NOT NULL DEFAULT now(),
  updated_at timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT nurse_services_unique UNIQUE (nurse_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_nurse_services_nurse_id
  ON nurse_services (nurse_id);

CREATE INDEX IF NOT EXISTS idx_nurse_services_service_id
  ON nurse_services (service_id);

-- ── 4. booking_service_items (immutable pricing ledger) ──────

CREATE TABLE IF NOT EXISTS booking_service_items (
  id            uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid           NOT NULL,
  booking_type  text           NOT NULL CHECK (booking_type IN ('patient', 'hospital')),
  service_id    uuid           REFERENCES services (id) ON DELETE SET NULL,
  service_name  text           NOT NULL,
  unit_price    numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity      int            NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at    timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_service_items_booking
  ON booking_service_items (booking_id, booking_type);

-- ── 5. Feature flag: service_master_enabled ──────────────────
-- platform_settings is a single-row table — add column if missing

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings'
      AND column_name = 'service_master_enabled'
  ) THEN
    ALTER TABLE platform_settings
      ADD COLUMN service_master_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── 6. RLS ───────────────────────────────────────────────────

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_service_items ENABLE ROW LEVEL SECURITY;

-- service_categories: anyone can read; only admin can write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_categories' AND policyname = 'sc_public_read') THEN
    CREATE POLICY sc_public_read ON service_categories FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_categories' AND policyname = 'sc_admin_all') THEN
    CREATE POLICY sc_admin_all ON service_categories FOR ALL
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- services: anyone can read; only admin can write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'svc_public_read') THEN
    CREATE POLICY svc_public_read ON services FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'svc_admin_all') THEN
    CREATE POLICY svc_admin_all ON services FOR ALL
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- nurse_services: active rows are public-readable; nurse manages own rows
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nurse_services' AND policyname = 'ns_public_read') THEN
    CREATE POLICY ns_public_read ON nurse_services FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nurse_services' AND policyname = 'ns_own_write') THEN
    CREATE POLICY ns_own_write ON nurse_services FOR ALL USING (auth.uid() = nurse_id);
  END IF;
END $$;

-- booking_service_items: admin sees all; patients/hospitals see own (handled by app layer)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_service_items' AND policyname = 'bsi_admin_all') THEN
    CREATE POLICY bsi_admin_all ON booking_service_items FOR ALL
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ── Done ─────────────────────────────────────────────────────
-- service_master_enabled defaults to false — zero impact on live users
-- Run rollback script to undo all changes if needed
