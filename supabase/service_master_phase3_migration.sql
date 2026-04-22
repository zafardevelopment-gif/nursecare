-- ============================================================
-- Service Master Phase 3 — Hospital Integration Migration
-- Production-safe: all IF NOT EXISTS / DO $$ guards — safe to re-run
-- Rollback: service_master_phase3_rollback.sql
-- ============================================================

-- ── 1. Add service_id to hospital_booking_requests ───────────
-- Links a hospital booking to a structured service from the catalog.
-- NULL for legacy bookings (flag OFF path) — always backward-safe.

ALTER TABLE hospital_booking_requests
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hbr_service_id ON hospital_booking_requests(service_id);

-- ── 2. Add priority field ────────────────────────────────────
-- Normal / Urgent / Critical — affects admin queue ordering.

ALTER TABLE hospital_booking_requests
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'urgent', 'critical'));

-- ── 3. Add internal_notes (hospital-side, admin-visible) ─────

ALTER TABLE hospital_booking_requests
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- ── 4. Add recurring request fields ─────────────────────────
-- is_recurring: true when hospital wants same booking to repeat.
-- recurrence_type: weekly | monthly | custom
-- recurrence_end_date: when the recurring series stops.

ALTER TABLE hospital_booking_requests
  ADD COLUMN IF NOT EXISTS is_recurring       boolean  NOT NULL DEFAULT false;

ALTER TABLE hospital_booking_requests
  ADD COLUMN IF NOT EXISTS recurrence_type    text
    CHECK (recurrence_type IN ('weekly', 'monthly', 'custom'));

ALTER TABLE hospital_booking_requests
  ADD COLUMN IF NOT EXISTS recurrence_end_date date;

-- ── Done ─────────────────────────────────────────────────────
