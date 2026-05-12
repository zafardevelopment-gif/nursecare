-- ============================================================
-- NurseCare+ Performance Optimization v2
-- Run once on Supabase SQL Editor
-- All CREATE OR REPLACE / IF NOT EXISTS — safe to re-run
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 1: MISSING INDEXES
-- ────────────────────────────────────────────────────────────

-- nurses: specialization filter dropdown + status counts
CREATE INDEX IF NOT EXISTS idx_nurses_specialization    ON nurses(specialization) WHERE specialization IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nurses_status_created    ON nurses(status, created_at DESC);

-- booking_requests: composite for payment dashboard counts
CREATE INDEX IF NOT EXISTS idx_bookings_status_payment  ON booking_requests(status, payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline ON booking_requests(payment_deadline_at) WHERE payment_status != 'paid';

-- users: role+city composite for filtered list queries
CREATE INDEX IF NOT EXISTS idx_users_role_city          ON users(role, city);
-- NOTE: last_sign_in_at lives in auth.users (Supabase managed), not public.users
-- The index below goes on auth.users — Supabase creates this automatically, no manual index needed.

-- leave_requests: dashboard group-by
CREATE INDEX IF NOT EXISTS idx_leave_status_blocked     ON leave_requests(status, is_blocked, auto_approved);

-- activity_logs: dashboard recent feed (already has created_at but add actor_role)
CREATE INDEX IF NOT EXISTS idx_activity_actor_role      ON activity_logs(actor_role, created_at DESC);

-- nurse_update_requests: composite for pending count
CREATE INDEX IF NOT EXISTS idx_nurse_updates_status_created ON nurse_update_requests(status, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- SECTION 2: RPC FUNCTIONS (GROUP BY in DB, not in JS)
-- ────────────────────────────────────────────────────────────

-- 2a. count_nurses_by_status
-- Used by: admin/nurses, admin/dashboard
-- Returns: [{ status text, count bigint }]
CREATE OR REPLACE FUNCTION count_nurses_by_status()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT status::text, COUNT(*)::bigint AS count
  FROM nurses
  GROUP BY status;
$$;

-- 2b. count_bookings_by_status
-- Used by: admin/bookings, admin/dashboard
-- Returns: [{ status text, payment_status text, count bigint }]
CREATE OR REPLACE FUNCTION count_bookings_by_status()
RETURNS TABLE(status text, payment_status text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT status::text, payment_status::text, COUNT(*)::bigint AS count
  FROM booking_requests
  GROUP BY status, payment_status;
$$;

-- 2c. count_hosp_bookings_by_status
-- Used by: admin/bookings, admin/hospital-bookings, admin/dashboard
-- Returns: [{ status text, count bigint }]
CREATE OR REPLACE FUNCTION count_hosp_bookings_by_status()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT status::text, COUNT(*)::bigint AS count
  FROM hospital_booking_requests
  GROUP BY status;
$$;

-- 2d. count_leaves_by_status
-- Used by: admin/dashboard
-- Returns: [{ status text, is_blocked bool, auto_approved bool, count bigint }]
CREATE OR REPLACE FUNCTION count_leaves_by_status()
RETURNS TABLE(status text, is_blocked boolean, auto_approved boolean, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT status::text, is_blocked, auto_approved, COUNT(*)::bigint AS count
  FROM leave_requests
  GROUP BY status, is_blocked, auto_approved;
$$;

-- 2e. user_summary_counts
-- Used by: admin/reports/users
-- Replaces 5 separate COUNT queries with 1 scan
-- Returns: [{ total_users, total_patients, total_nurses, total_hospitals, active_users }]
CREATE OR REPLACE FUNCTION user_summary_counts(active_since timestamptz)
RETURNS TABLE(
  total_users     bigint,
  total_patients  bigint,
  total_nurses    bigint,
  total_hospitals bigint,
  active_users    bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*)                                                                        AS total_users,
    COUNT(*) FILTER (WHERE u.role = 'patient')                                     AS total_patients,
    COUNT(*) FILTER (WHERE u.role = 'provider')                                    AS total_nurses,
    COUNT(*) FILTER (WHERE u.role = 'hospital')                                    AS total_hospitals,
    COUNT(*) FILTER (WHERE au.last_sign_in_at >= active_since)                     AS active_users
  FROM public.users u
  LEFT JOIN auth.users au ON au.id = u.id;
$$;

-- ────────────────────────────────────────────────────────────
-- SECTION 3: GRANT EXECUTE TO AUTHENTICATED + SERVICE ROLE
-- (Supabase requires explicit grants for RPC calls)
-- ────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION count_nurses_by_status()           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_bookings_by_status()         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_hosp_bookings_by_status()    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_leaves_by_status()           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION user_summary_counts(timestamptz)   TO authenticated, service_role;

-- ────────────────────────────────────────────────────────────
-- SECTION 4: QUERY PLAN HINTS (ANALYZE to update statistics)
-- Run after deploying indexes so Postgres picks them up
-- ────────────────────────────────────────────────────────────

ANALYZE nurses;
ANALYZE booking_requests;
ANALYZE hospital_booking_requests;
ANALYZE users;
ANALYZE leave_requests;
ANALYZE activity_logs;
ANALYZE nurse_update_requests;
