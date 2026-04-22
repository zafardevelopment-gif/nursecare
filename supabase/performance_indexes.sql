-- ============================================================
-- NurseCare+ Performance Indexes
-- Run once on Supabase SQL editor
-- All use IF NOT EXISTS — safe to re-run
-- ============================================================

-- ── users ────────────────────────────────────────────────────
-- Used by auth.ts on every page load: .eq('id', user.id)
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
-- Used by role-based routing
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ── nurses ───────────────────────────────────────────────────
-- Provider layout + dashboard: .eq('user_id', user.id)
CREATE INDEX IF NOT EXISTS idx_nurses_user_id ON nurses(user_id);
-- Admin nurse list: .eq('status', ...)
CREATE INDEX IF NOT EXISTS idx_nurses_status ON nurses(status);
-- Booking search: .eq('city', ...).eq('is_available', true)
CREATE INDEX IF NOT EXISTS idx_nurses_city_available ON nurses(city, is_available);

-- ── booking_requests ─────────────────────────────────────────
-- Patient dashboard: .eq('patient_id', user.id)
CREATE INDEX IF NOT EXISTS idx_bookings_patient_id ON booking_requests(patient_id);
-- Provider dashboard + bookings page: .eq('nurse_id', user.id)
CREATE INDEX IF NOT EXISTS idx_bookings_nurse_id ON booking_requests(nurse_id);
-- Status filters used everywhere
CREATE INDEX IF NOT EXISTS idx_bookings_status ON booking_requests(status);
-- Provider city-based pending bookings in layout
CREATE INDEX IF NOT EXISTS idx_bookings_status_city ON booking_requests(status, city);
-- Admin booking list sorted by created_at
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON booking_requests(created_at DESC);
-- Composite for nurse dashboard query
CREATE INDEX IF NOT EXISTS idx_bookings_nurse_status ON booking_requests(nurse_id, status);

-- ── hospital_booking_requests ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hosp_bookings_hospital_id ON hospital_booking_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hosp_bookings_status ON hospital_booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_hosp_bookings_created_at ON hospital_booking_requests(created_at DESC);
-- GIN index for JSONB nurse_selections (used in provider dashboard filter)
CREATE INDEX IF NOT EXISTS idx_hosp_bookings_nurse_selections ON hospital_booking_requests USING GIN(nurse_selections);

-- ── hospitals ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hospitals_user_id ON hospitals(user_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status);

-- ── nurse_documents ──────────────────────────────────────────
-- Provider layout fetches photo: .eq('nurse_id', ...).eq('doc_type', 'photo')
CREATE INDEX IF NOT EXISTS idx_nurse_docs_nurse_id ON nurse_documents(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_docs_type ON nurse_documents(doc_type);

-- ── agreements ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agreements_nurse_id ON agreements(nurse_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_hospital_id ON agreements(hospital_id);

-- ── hospital_agreements ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hosp_agreements_hospital_id ON hospital_agreements(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hosp_agreements_status ON hospital_agreements(status);

-- ── notifications ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
-- Composite for unread count badge
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- ── complaints ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_complaints_reporter_id ON complaints(reporter_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- ── leave_requests ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leave_nurse_user_id ON leave_requests(nurse_user_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

-- ── nurse_update_requests ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_nurse_updates_status ON nurse_update_requests(status);
CREATE INDEX IF NOT EXISTS idx_nurse_updates_nurse_id ON nurse_update_requests(nurse_id);

-- ── shift_availability + shift_bookings ─────────────────────
CREATE INDEX IF NOT EXISTS idx_shift_avail_nurse_id ON shift_availability(nurse_id);
CREATE INDEX IF NOT EXISTS idx_shift_bookings_request_id ON shift_bookings(booking_request_id);
CREATE INDEX IF NOT EXISTS idx_shift_bookings_nurse_id ON shift_bookings(nurse_id);

-- ── platform_settings ────────────────────────────────────────
-- Single-row table — no index needed, already fast
