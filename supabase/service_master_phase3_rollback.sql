-- ============================================================
-- Service Master Phase 3 — ROLLBACK
-- ============================================================
ALTER TABLE hospital_booking_requests DROP COLUMN IF EXISTS service_id;
ALTER TABLE hospital_booking_requests DROP COLUMN IF EXISTS priority;
ALTER TABLE hospital_booking_requests DROP COLUMN IF EXISTS internal_notes;
ALTER TABLE hospital_booking_requests DROP COLUMN IF EXISTS is_recurring;
ALTER TABLE hospital_booking_requests DROP COLUMN IF EXISTS recurrence_type;
ALTER TABLE hospital_booking_requests DROP COLUMN IF EXISTS recurrence_end_date;
