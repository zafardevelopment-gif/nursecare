-- ============================================================
-- NurseCare+ Performance Optimization v3
-- Run on Supabase SQL Editor (idempotent — safe to re-run)
-- Adds RPCs to replace multiple round-trip count queries
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. count_provider_bookings_by_status(p_nurse_id)
-- Replaces 4 separate COUNT queries on provider dashboard
-- Used by: src/app/provider/dashboard/page.tsx
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION count_provider_bookings_by_status(p_nurse_id uuid)
RETURNS TABLE(status text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT status::text, COUNT(*)::bigint AS count
  FROM booking_requests
  WHERE nurse_id = p_nurse_id
  GROUP BY status;
$$;

GRANT EXECUTE ON FUNCTION count_provider_bookings_by_status(uuid) TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 2. booking_report_summary()
-- Replaces 4 COUNTs + a SUM-via-JS for admin/reports/bookings
-- Returns: { total, completed, pending, cancelled, total_revenue }
-- Used by: src/app/admin/reports/bookings/page.tsx
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION booking_report_summary()
RETURNS TABLE(
  total          bigint,
  completed      bigint,
  pending        bigint,
  cancelled      bigint,
  total_revenue  numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COUNT(*)                                                                            AS total,
    COUNT(*) FILTER (WHERE status = 'completed')                                        AS completed,
    COUNT(*) FILTER (WHERE status = 'pending')                                          AS pending,
    COUNT(*) FILTER (WHERE status IN ('cancelled','declined'))                          AS cancelled,
    COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::numeric      AS total_revenue
  FROM booking_requests;
$$;

GRANT EXECUTE ON FUNCTION booking_report_summary() TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 3. city_aggregates()
-- Replaces full-table scan + JS aggregation for admin/reports/city
-- Returns one row per city with booking + nurse stats
-- Used by: src/app/admin/reports/city/page.tsx
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION city_aggregates()
RETURNS TABLE(
  city       text,
  bookings   bigint,
  completed  bigint,
  revenue    numeric,
  nurses     bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH b AS (
    SELECT
      COALESCE(NULLIF(TRIM(city), ''), 'Unknown')::text AS city,
      COUNT(*)::bigint                                                                  AS bookings,
      COUNT(*) FILTER (WHERE status = 'completed')::bigint                              AS completed,
      COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::numeric    AS revenue
    FROM booking_requests
    GROUP BY 1
  ),
  n AS (
    SELECT
      COALESCE(NULLIF(TRIM(city), ''), 'Unknown')::text AS city,
      COUNT(*) FILTER (WHERE status = 'approved')::bigint                               AS nurses
    FROM nurses
    GROUP BY 1
  )
  SELECT
    COALESCE(b.city, n.city)        AS city,
    COALESCE(b.bookings, 0)         AS bookings,
    COALESCE(b.completed, 0)        AS completed,
    COALESCE(b.revenue, 0)          AS revenue,
    COALESCE(n.nurses, 0)           AS nurses
  FROM b
  FULL OUTER JOIN n ON n.city = b.city
  ORDER BY bookings DESC;
$$;

GRANT EXECUTE ON FUNCTION city_aggregates() TO authenticated, service_role;


-- ────────────────────────────────────────────────────────────
-- 4. ANALYZE so the planner picks up new RPC stats
-- ────────────────────────────────────────────────────────────
ANALYZE booking_requests;
ANALYZE nurses;
