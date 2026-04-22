-- ============================================================
-- Service Master Phase 2 Migration
-- Production-safe: all IF NOT EXISTS / IF EXISTS guards
-- Rollback script: service_master_phase2_rollback.sql
-- ============================================================

-- ── 1. Fix nurse_services FK ─────────────────────────────────
-- Phase 1 migration created nurse_id REFERENCES users(id) which
-- is incorrect — nurse_services.nurse_id stores nurses.id (the
-- internal nurses table PK), not users.id.
-- This block drops the wrong constraint and adds the correct one.

DO $$
BEGIN
  -- Drop old FK if it points to users(id)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.table_constraints tc2
      ON rc.unique_constraint_name = tc2.constraint_name
    WHERE tc.table_name   = 'nurse_services'
      AND kcu.column_name = 'nurse_id'
      AND tc2.table_name  = 'users'
  ) THEN
    ALTER TABLE nurse_services
      DROP CONSTRAINT IF EXISTS nurse_services_nurse_id_fkey;
  END IF;

  -- Add correct FK to nurses(id) if not already there
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.table_constraints tc2
      ON rc.unique_constraint_name = tc2.constraint_name
    WHERE tc.table_name   = 'nurse_services'
      AND kcu.column_name = 'nurse_id'
      AND tc2.table_name  = 'nurses'
  ) THEN
    ALTER TABLE nurse_services
      ADD CONSTRAINT nurse_services_nurse_id_fkey
      FOREIGN KEY (nurse_id) REFERENCES nurses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 2. Add service_id to booking_requests ───────────────────
-- Nullable companion to service_type — backward compatible.
-- Old bookings keep service_type; new Service Master bookings
-- populate both service_type (name snapshot) and service_id.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name  = 'booking_requests'
      AND column_name = 'service_id'
  ) THEN
    ALTER TABLE booking_requests
      ADD COLUMN service_id uuid REFERENCES services(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_requests_service_id
  ON booking_requests(service_id);

-- ── Done ─────────────────────────────────────────────────────
-- Run rollback to undo if needed.
