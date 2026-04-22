# NurseCare+ — Production Deployment Checklist
**Stack:** Next.js 16 · Supabase · Vercel · React 19  
**Prepared:** 2026-04-22  
**Scope:** Service Master (Phases 1–3) + Phase 3.5 Stabilization

---

## SECTION 1 — Database Migrations

Run in Supabase SQL Editor **before** deploying the app build.

### 1.1 Consolidated Migration (Single File — Safe to Re-Run)

```
File: supabase/service_master_run_all_migrations.sql
```

**Steps:**

1. Open Supabase Dashboard → SQL Editor
2. Open `service_master_run_all_migrations.sql` and paste the full contents
3. Click **Run**
4. Look for no red errors — warnings about columns already existing are safe
5. If any error occurs, check the message and scroll to the specific `DO $$` block

**What this migration covers:**

| Phase | Tables Created / Altered |
|-------|--------------------------|
| Phase 1 | `service_categories`, `services`, `nurse_services`, `booking_service_items` |
| Phase 2 | `booking_requests.service_id`, `booking_change_requests` |
| Phase 2.5 | `platform_settings.min_advance_hours`, `platform_settings.max_advance_days` |
| Phase 3 | `hospital_booking_requests` columns: `service_id`, `priority`, `internal_notes`, `is_recurring`, `recurrence_type`, `recurrence_end_date` |
| All | RLS policies, indexes, FK corrections |

### 1.2 Verify Migration Applied

Run each query in SQL Editor — all should return rows or `true`:

```sql
-- Tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'service_categories','services','nurse_services',
  'booking_service_items','booking_change_requests'
);
-- Expected: 5 rows

-- platform_settings has required columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'platform_settings'
AND column_name IN (
  'service_master_enabled','min_advance_hours',
  'max_advance_days','free_cancellation_hours',
  'payment_deadline_hours','require_nurse_approval'
);
-- Expected: 6 rows

-- hospital_booking_requests has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'hospital_booking_requests'
AND column_name IN ('service_id','priority','internal_notes','is_recurring','recurrence_type','recurrence_end_date');
-- Expected: 6 rows

-- RLS enabled on SM tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('service_categories','services','nurse_services','booking_service_items','booking_change_requests');
-- Expected: rowsecurity = true for all 5
```

### 1.3 platform_settings Row Must Exist

The app reads `platform_settings` with `.limit(1).single()` — if no row exists, the flag check will return `false` (safe default) but settings like `payment_deadline_hours` will fall back to code defaults. Verify:

```sql
SELECT * FROM platform_settings LIMIT 1;
```

If no row exists, insert the defaults:

```sql
INSERT INTO platform_settings (
  service_master_enabled,
  require_nurse_approval,
  payment_deadline_hours,
  free_cancellation_hours,
  min_advance_hours,
  max_advance_days
) VALUES (false, true, 24, 24, 2, 30);
```

---

## SECTION 2 — Feature Flag Default State

**`service_master_enabled` must be `false` at go-live.**

The flag is read in `src/lib/platform-settings.ts` → `getServiceMasterEnabled()`.  
On any DB error it returns `false` — this is intentional safe-default behaviour.

### Pre-launch state:
```sql
SELECT service_master_enabled FROM platform_settings LIMIT 1;
-- Must return: false
```

### When to enable:
Enable the flag ONLY after:
- At least one active category exists
- At least one active service exists  
- One test booking end-to-end has passed (see Section 10)

Enable via: `/admin/settings` → Service Master toggle  
Or directly: `UPDATE platform_settings SET service_master_enabled = true;`

---

## SECTION 3 — Environment Variables

### 3.1 Required Variables

All must be set in Vercel → Project → Settings → Environment Variables for the **Production** environment.

| Variable | Type | Description | Check |
|----------|------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL | [ ] |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon/public key | [ ] |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Service role key — server-only, never exposed client-side | [ ] |
| `NEXT_PUBLIC_APP_URL` | Public | Full production URL (e.g. `https://nursecare.vercel.app`) — used for redirects and links | [ ] |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public | Google Maps API key for address fields | [ ] |

### 3.2 Security Checks

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set as **Sensitive** in Vercel (never visible after save)
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` has HTTP referrer restrictions in Google Cloud Console — restrict to your production domain only
- [ ] `.env.local` is in `.gitignore` — confirm it is NOT committed to the repository
- [ ] No secrets appear in `next.config.ts` or any client-side file
- [ ] `VERCEL_OIDC_TOKEN` in `.env.local` is ephemeral — do not copy it to production settings; Vercel injects it automatically

### 3.3 Verify at Runtime

After deploying, visit `/api/health` (if you have one) or open browser DevTools → Network on any page and confirm:
- No `SUPABASE_SERVICE_ROLE_KEY` value appears in any response
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is visible (this is intentional — it is public)

---

## SECTION 4 — Production Error Logging Plan

Next.js 16 on Vercel has no built-in error aggregation. Use the following approach without adding new dependencies:

### 4.1 Vercel Built-In (Zero Setup)

- **Runtime Logs:** Vercel Dashboard → Project → Functions tab → shows all `console.error` output in real time
- **Build Logs:** stored per deployment — check after every deploy
- **Error tab:** Vercel Dashboard → Project → Observability → Errors — shows unhandled exceptions

### 4.2 Existing `console.error` Coverage

The codebase already logs errors at these points — verify they appear in Vercel logs after go-live:

| File | What Is Logged |
|------|----------------|
| `patient/booking/actions.ts` | `[submitBooking] booking_requests error` + `[submitBooking] unexpected error` |
| `patient/bookings/actions.ts` | Implicit — returns `{ error }` from Supabase |
| `hospital/booking/actions.ts` | Returns `{ error: error.message }` |
| `admin/services/actions.ts` | Returns `{ error }` from Supabase |

### 4.3 Recommended Additions (Low Effort — No New Package)

Add these two lines to `src/app/global-error.tsx` (Next.js global error boundary) if it doesn't exist:

```tsx
// src/app/global-error.tsx
'use client'
export default function GlobalError({ error }: { error: Error }) {
  console.error('[GlobalError]', error.message, error.stack)
  return <html><body><h2>Something went wrong. Please refresh.</h2></body></html>
}
```

This catches unhandled client-side errors and surfaces them in Vercel logs.

### 4.4 Third-Party Aggregation (Recommended Post-Launch Week 1)

When ready: add **Sentry** (free tier covers this traffic level). One `npm install @sentry/nextjs` + `npx @sentry/wizard` and all unhandled errors, slow server actions, and DB timeouts are captured automatically with stack traces.

---

## SECTION 5 — Admin Monitoring Checklist

Run these checks in Supabase SQL Editor every morning during the first week.

### 5.1 Daily Health Queries

```sql
-- New bookings in last 24 hours
SELECT status, count(*) FROM booking_requests
WHERE created_at > now() - interval '24 hours'
GROUP BY status ORDER BY count DESC;

-- Booking failures (stuck in pending > 48h without nurse)
SELECT id, patient_name, service_type, created_at, status
FROM booking_requests
WHERE status = 'pending'
AND nurse_id IS NULL
AND created_at < now() - interval '48 hours'
ORDER BY created_at;

-- Unread admin notifications (proxy for action items)
SELECT type, count(*) FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE u.role = 'admin' AND n.is_read = false
GROUP BY type ORDER BY count DESC;

-- Pending change requests (cancel/reschedule needing admin action)
SELECT request_type, count(*) FROM booking_change_requests
WHERE status = 'pending'
GROUP BY request_type;

-- Hospital requests last 24h
SELECT priority, status, count(*) FROM hospital_booking_requests
WHERE created_at > now() - interval '24 hours'
GROUP BY priority, status ORDER BY priority;

-- Service ledger writes (confirm pricing is being captured)
SELECT booking_type, count(*), avg(unit_price) FROM booking_service_items
WHERE created_at > now() - interval '24 hours'
GROUP BY booking_type;
```

### 5.2 Admin UI Checks

| Page | What to Verify |
|------|---------------|
| `/admin/bookings` | No unexplained `null` nurse assignments on accepted bookings |
| `/admin/services` | Service Master flag shows correct state |
| `/admin/notifications` | No notification delivery backlog |
| `/admin/bookings?tab=change-requests` | Pending cancel/reschedule requests are actioned same day |

---

## SECTION 6 — Daily Backup Recommendation

### 6.1 Supabase Automatic Backups

Supabase Pro plan: daily backups retained for 7 days — enabled automatically.  
Free plan: no automatic backups — **manual export required**.

### 6.2 Manual Backup (Free Plan)

Run weekly or before any migration:

```bash
# Using Supabase CLI (install once: npm install -g supabase)
supabase db dump --db-url "postgresql://postgres:[password]@db.wvzfumxlvycsppfynuky.supabase.co:5432/postgres" \
  -f nursecare_backup_$(date +%Y%m%d).sql
```

Or from Supabase Dashboard → Settings → Database → Download backup.

### 6.3 Critical Tables to Protect

| Table | Why |
|-------|-----|
| `booking_requests` | Core business data |
| `booking_service_items` | Immutable pricing ledger — never editable |
| `booking_change_requests` | Audit trail |
| `hospital_booking_requests` | Hospital operations |
| `platform_settings` | Feature flags + business rules |
| `users` | Account data |
| `nurses` | Provider profiles |

### 6.4 Before Every Migration

Always export a schema + data dump before running any SQL migration:

```sql
-- Quick row count snapshot before migration (save the output)
SELECT
  'booking_requests' AS t, count(*) FROM booking_requests UNION ALL
  SELECT 'booking_service_items', count(*) FROM booking_service_items UNION ALL
  SELECT 'service_categories', count(*) FROM service_categories UNION ALL
  SELECT 'services', count(*) FROM services UNION ALL
  SELECT 'nurse_services', count(*) FROM nurse_services;
```

---

## SECTION 7 — Rollback Steps

### 7.1 Application Rollback (Vercel — Instant)

If a production issue is detected after a deploy:

1. Vercel Dashboard → Project → Deployments
2. Find the last known-good deployment
3. Click **⋯** → **Promote to Production**
4. Takes ~30 seconds — zero downtime

### 7.2 Feature Flag Rollback (Instant — No Deploy Needed)

To disable Service Master immediately without a code deploy:

```sql
UPDATE platform_settings SET service_master_enabled = false;
```

This reverts all booking flows to the legacy path immediately. No restart required — `getServiceMasterEnabled()` reads the DB on every request.

### 7.3 Database Rollback Scripts

Rollback SQL files exist for each phase:

| Phase | Rollback File |
|-------|---------------|
| Phase 1 | `supabase/service_master_phase1_rollback.sql` |
| Phase 2 | `supabase/service_master_phase2_rollback.sql` |
| Phase 3 | `supabase/service_master_phase3_rollback.sql` |

**Warning:** Running rollback scripts drops tables and columns. Only use if the feature flag rollback (7.2) and app rollback (7.1) are insufficient.  
**Always take a backup (Section 6.4) before running any rollback script.**

### 7.4 Rollback Decision Tree

```
Issue detected after deploy
│
├─ UI broken / JS error → Vercel Promote Previous (7.1) — 30 sec
│
├─ Booking failures with Service Master → Disable flag (7.2) — instant
│    Users fall back to legacy flow automatically
│
├─ Data corruption suspected → Take backup first → DB rollback (7.3)
│    Then investigate before re-enabling
│
└─ Auth / login broken → Check SUPABASE_SERVICE_ROLE_KEY in Vercel env vars
     Redeploy after correcting
```

---

## SECTION 8 — First-Week Observation Metrics

Run these queries daily in Supabase SQL Editor for the first 7 days. Log the results.

### 8.1 Bookings Created

```sql
SELECT
  date_trunc('day', created_at) AS day,
  booking_type,
  status,
  count(*) AS total
FROM booking_requests
WHERE created_at > now() - interval '7 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;
```

**Healthy signal:** Steady or growing `total` per day, majority `pending` → `accepted` → `confirmed`.

### 8.2 Booking Failures

```sql
-- Bookings stuck in pending > 24h (possible submission failure or unmatched nurse)
SELECT id, patient_name, service_type, nurse_id, created_at
FROM booking_requests
WHERE status = 'pending'
AND created_at < now() - interval '24 hours'
ORDER BY created_at;

-- Server action errors surfaced as notifications (payment_reminder sent = submission reached server)
SELECT date_trunc('day', created_at) AS day, count(*) AS submissions_reached_server
FROM notifications
WHERE type = 'payment_reminder'
AND created_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1 DESC;
```

**Alert threshold:** More than 3 stuck-pending bookings per day → investigate nurse matching.

### 8.3 Nurse Matching Failures

```sql
-- Bookings submitted without a nurse (pool/unmatched)
SELECT
  date_trunc('day', created_at) AS day,
  count(*) FILTER (WHERE nurse_id IS NULL) AS unmatched,
  count(*) FILTER (WHERE nurse_id IS NOT NULL) AS matched,
  round(100.0 * count(*) FILTER (WHERE nurse_id IS NULL) / count(*), 1) AS unmatched_pct
FROM booking_requests
WHERE created_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1 DESC;
```

**Alert threshold:** Unmatched > 30% consistently → review nurse availability or onboarding.

### 8.4 Hospital Requests

```sql
SELECT
  date_trunc('day', created_at) AS day,
  priority,
  status,
  count(*) AS total,
  sum(total_nurses) AS nurse_slots_requested
FROM hospital_booking_requests
WHERE created_at > now() - interval '7 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2;
```

**Alert threshold:** Any `critical` priority request unactioned > 4 hours → notify admin team.

### 8.5 Reschedule Requests

```sql
SELECT
  date_trunc('day', created_at) AS day,
  request_type,
  status,
  count(*) AS total
FROM booking_change_requests
WHERE created_at > now() - interval '7 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC;
```

**Alert threshold:** Pending `cancel` or `reschedule` requests older than 48 hours → admin action required.

### 8.6 Service Ledger Health

```sql
-- Confirm pricing is captured for SM bookings
SELECT
  date_trunc('day', bsi.created_at) AS day,
  bsi.booking_type,
  count(*) AS ledger_rows,
  avg(bsi.unit_price)::numeric(10,2) AS avg_price
FROM booking_service_items bsi
WHERE bsi.created_at > now() - interval '7 days'
GROUP BY 1, 2
ORDER BY 1 DESC;
```

**Healthy signal:** Every Service Master booking should produce exactly 1 ledger row.

---

## SECTION 9 — Performance Checks

### 9.1 Vercel Function Duration

After first day of live traffic:

- Vercel Dashboard → Project → Functions → sort by **Duration (P99)**
- **Target:** All server actions < 3000ms P99
- **Investigate if > 3000ms:** `submitBookingAction`, `submitHospitalBookingAction` (these make 3–5 sequential DB calls)

### 9.2 Supabase Query Performance

Run in SQL Editor after 24 hours of traffic:

```sql
-- Slow queries (requires pg_stat_statements — enabled on Pro, not Free)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 500
ORDER BY mean_exec_time DESC
LIMIT 20;
```

If on Free plan, check Supabase Dashboard → Database → Query Performance (visual tool).

### 9.3 Index Coverage Check

These indexes were created by the migration — verify they exist:

```sql
SELECT indexname, tablename FROM pg_indexes
WHERE tablename IN (
  'services','nurse_services','booking_service_items',
  'booking_change_requests','booking_requests'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Expected: 15+ indexes. If any are missing, re-run the relevant section of `service_master_run_all_migrations.sql`.

### 9.4 Supabase Connection Pooling

- Verify Supabase Dashboard → Settings → Database → **Connection Pooling is ON** (mode: Transaction)
- For Vercel serverless functions, Transaction mode is required — Session mode will exhaust connections under load
- Default pool size 15 is sufficient for early traffic

### 9.5 Next.js Build Size Check

After deployment, run locally and compare against current:

```bash
cd nursecare
npm run build
# Check ".next/analyze" or the build output table
# Alert if any route bundle exceeds 250kB (First Load JS)
```

---

## SECTION 10 — Final Go-Live Sequence

Execute in this exact order. Do not skip steps.

### Pre-Deploy (30 minutes before)

- [ ] **10.1** Take database backup snapshot (Section 6.4 row count query — save output)
- [ ] **10.2** Run `service_master_run_all_migrations.sql` in Supabase SQL Editor
- [ ] **10.3** Run all 4 verification queries from Section 1.2 — confirm all pass
- [ ] **10.4** Verify `platform_settings` row exists and `service_master_enabled = false` (Section 2)
- [ ] **10.5** Confirm all 5 environment variables are set in Vercel Production environment (Section 3)

### Deploy

- [ ] **10.6** Push code to production branch (or promote staging deployment in Vercel)
- [ ] **10.7** Watch Vercel build logs — confirm build succeeds with 0 errors
- [ ] **10.8** Note the deployment URL and confirm it is promoted to production

### Smoke Tests (Run Immediately After Deploy)

- [ ] **10.9** Visit production URL → confirm login page loads
- [ ] **10.10** Log in as **admin** → navigate to `/admin/services` → confirm categories/services page loads (Service Master flag is still OFF)
- [ ] **10.11** Log in as **patient** → navigate to `/patient/booking` → confirm legacy booking form loads
- [ ] **10.12** Log in as **hospital** → navigate to `/hospital/booking` → confirm legacy hospital form loads (flag OFF)
- [ ] **10.13** Log in as **admin** → navigate to `/admin/settings` → confirm Service Master toggle shows OFF

### Seed Data (Required Before Enabling Flag)

- [ ] **10.14** As admin: go to `/admin/services` → create at least 1 category (e.g. "General Nursing")
- [ ] **10.15** Create at least 1 active service under that category (e.g. "Home Nursing Visit", base price set)
- [ ] **10.16** Log in as a test nurse → navigate to their services page → add the service with a price

### End-to-End Test (With Flag Still OFF)

- [ ] **10.17** As patient: submit a legacy booking (no service selected) → confirm booking appears in admin
- [ ] **10.18** As hospital: submit a legacy hospital request → confirm it appears in admin

### Enable Service Master

- [ ] **10.19** Admin: `/admin/settings` → enable Service Master toggle
- [ ] **10.20** As patient: go to `/patient/booking` → confirm service step appears, select service + nurse → submit → confirm booking appears in admin with ledger row in `booking_service_items`
- [ ] **10.21** As hospital: go to `/hospital/booking` → confirm SM flow appears → select service → submit → confirm admin receives notification
- [ ] **10.22** In Supabase: `SELECT * FROM booking_service_items ORDER BY created_at DESC LIMIT 5;` — confirm ledger rows exist with correct `unit_price`

### Go Live

- [ ] **10.23** Monitor Vercel Functions log for first 15 minutes — look for any `[submitBooking]` errors
- [ ] **10.24** Run Section 8.1 booking metric query — confirm first bookings are appearing
- [ ] **10.25** Confirm admin team knows to check `/admin/bookings` change-requests tab daily

---

## Quick Reference — Emergency Contacts

| Action | Where |
|--------|-------|
| Disable Service Master (instant) | Supabase SQL: `UPDATE platform_settings SET service_master_enabled = false;` |
| Roll back app deploy | Vercel → Deployments → Promote previous |
| View live server errors | Vercel → Project → Functions → Logs |
| View DB query performance | Supabase → Database → Query Performance |
| Download DB backup | Supabase → Settings → Database → Backups |

---

*Checklist version: Phase 3.5-stable · 2026-04-22*
