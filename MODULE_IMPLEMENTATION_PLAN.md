# NurseCare+ — Module Implementation Plan
## Module 1: Leave Management System + Module 2: Dispute & Complaint Management System

**Document Type:** Pre-Implementation Architecture Plan  
**Date:** 2026-04-22  
**Stack:** Next.js 16 · Supabase · Vercel · React 19  
**Author:** Engineering Review  
**Status:** Awaiting Approval Before Coding Starts

---

## EXECUTIVE SUMMARY

| Question | Answer |
|----------|--------|
| Which module first? | **Module 2 (Disputes)** — builds on existing foundation, lower risk |
| Estimated phases | 6 total — 3 per module |
| Existing code to reuse | `ReportIssueModal.tsx`, `admin/disputes/`, `booking_change_requests`, `shift_availability`, `sendNotifications()` |
| Biggest risk | Leave auto-reassignment touching live bookings |
| Feature flag needed? | Yes — both modules behind flags until stable |
| DB migrations needed | 3 new tables + multiple column additions |

---

## PART A — MODULE SEQUENCING DECISION

### Why Module 2 (Disputes) First

| Factor | Leave Management | Dispute Management |
|--------|-----------------|-------------------|
| Risk to live data | **HIGH** — touches active bookings | LOW — additive only |
| Existing foundation | Partial (shift_availability) | **Strong** — ReportIssueModal, admin/disputes pages already exist |
| Auto-logic complexity | Very high (reassignment engine) | None in MVP |
| DB schema impact | Cascading changes to booking_requests | New isolated table |
| Time to first usable feature | ~3 weeks | ~1 week |
| If it breaks | Active bookings disrupted | Only reporting affected |

**Decision: Build Module 2 (MVP) → then Module 1 (MVP) → then advanced features of each.**

---

## PART B — MODULE 2: DISPUTE & COMPLAINT MANAGEMENT SYSTEM

### Current State Audit

The codebase already has:
- `admin/disputes/page.tsx` — list view with Open/Under Review/Resolved filter
- `admin/disputes/[id]/page.tsx` — detail + resolution form with outcome radio buttons
- `components/ReportIssueModal.tsx` — `PatientReportNoShowBtn`, `ProviderReportIssueBtn`, `DisputeBanner`
- `app/actions/disputeActions.ts` — `reportProviderNoShow`, `reportPatientIssue`, `updateDisputeStatus`
- Dispute data stored as columns on `booking_requests` table (not a separate table)

**Current limitations:**
- Disputes embedded in `booking_requests` — cannot dispute things without a booking
- Only 3 statuses (open, under_review, resolved) — missing rejected, escalated
- No file/proof upload
- No timeline/audit log
- No ticket number
- No priority level
- No SLA tracking
- No repeat offender detection
- No hospital-side reporting
- No nurse-vs-patient direction (only nurse no-show or patient absent)
- No internal admin notes separate from resolution

---

### Module 2 — Phase Breakdown

---

#### PHASE D1 — Database Foundation (Run before any code)

**Goal:** Migrate disputes from `booking_requests` columns to a proper dedicated table. Keep backward compatibility.

##### New Table: `disputes`

```sql
CREATE TABLE disputes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who filed it
  reporter_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reporter_role       text NOT NULL CHECK (reporter_role IN ('patient','provider','hospital','admin')),

  -- Who is being complained about
  respondent_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  respondent_role     text CHECK (respondent_role IN ('patient','provider','hospital')),

  -- Linked context (optional — dispute can exist without a booking)
  booking_id          uuid REFERENCES booking_requests(id) ON DELETE SET NULL,
  hospital_booking_id uuid REFERENCES hospital_booking_requests(id) ON DELETE SET NULL,

  -- Classification
  category            text NOT NULL CHECK (category IN (
                        'no_show',
                        'late_arrival',
                        'misbehavior',
                        'service_quality',
                        'payment_issue',
                        'wrong_cancellation',
                        'safety_issue',
                        'access_denied',
                        'other'
                      )),
  direction           text NOT NULL CHECK (direction IN (
                        'patient_vs_nurse',
                        'nurse_vs_patient',
                        'hospital_vs_nurse',
                        'nurse_vs_hospital',
                        'patient_vs_platform',
                        'nurse_vs_platform'
                      )),
  priority            text NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low','normal','high','critical')),

  -- Content
  title               text NOT NULL,
  description         text NOT NULL,
  proof_urls          text[]    DEFAULT '{}',  -- Supabase Storage URLs

  -- Ticket
  ticket_number       text NOT NULL UNIQUE,    -- e.g. DSP-2026-00042

  -- Workflow
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','under_review','escalated','resolved','rejected')),
  assigned_to         uuid REFERENCES users(id) ON DELETE SET NULL,  -- admin

  -- SLA
  sla_deadline_at     timestamptz,             -- calculated from priority at insert
  sla_breached        boolean NOT NULL DEFAULT false,

  -- Resolution
  resolution_action   text CHECK (resolution_action IN (
                        'warning_issued',
                        'refund_issued',
                        'penalty_applied',
                        'booking_cancelled',
                        'no_action',
                        'escalated_external',
                        'other'
                      )),
  resolution_notes    text,
  resolved_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at         timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_reporter      ON disputes(reporter_id);
CREATE INDEX idx_disputes_respondent    ON disputes(respondent_id);
CREATE INDEX idx_disputes_booking       ON disputes(booking_id);
CREATE INDEX idx_disputes_status        ON disputes(status);
CREATE INDEX idx_disputes_priority      ON disputes(priority, created_at DESC);
CREATE INDEX idx_disputes_sla           ON disputes(sla_deadline_at) WHERE sla_breached = false;
```

##### New Table: `dispute_events` (Timeline / Audit Log)

```sql
CREATE TABLE dispute_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id   uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_role   text,
  event_type   text NOT NULL CHECK (event_type IN (
                 'created',
                 'status_changed',
                 'note_added',
                 'proof_added',
                 'assigned',
                 'escalated',
                 'resolved',
                 'rejected',
                 'sla_breached'
               )),
  old_value    text,
  new_value    text,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispute_events_dispute ON dispute_events(dispute_id, created_at);
```

##### New Table: `dispute_notes` (Internal Admin Notes)

```sql
CREATE TABLE dispute_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id   uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  author_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note         text NOT NULL,
  is_internal  boolean NOT NULL DEFAULT true,  -- false = visible to reporter
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispute_notes_dispute ON dispute_notes(dispute_id);
```

##### New Table: `dispute_offender_log` (Repeat Offender Detection)

```sql
CREATE TABLE dispute_offender_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dispute_id      uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  category        text NOT NULL,
  was_upheld      boolean,          -- set when dispute resolved
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_offender_log_user ON dispute_offender_log(user_id, created_at DESC);

-- View: repeat offender count
CREATE OR REPLACE VIEW v_repeat_offenders AS
SELECT user_id, count(*) AS total_upheld_complaints
FROM dispute_offender_log
WHERE was_upheld = true
GROUP BY user_id
HAVING count(*) >= 2;
```

##### platform_settings additions

```sql
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS dispute_sla_low_hours     integer NOT NULL DEFAULT 120;  -- 5 days
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS dispute_sla_normal_hours  integer NOT NULL DEFAULT 72;   -- 3 days
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS dispute_sla_high_hours    integer NOT NULL DEFAULT 24;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS dispute_sla_critical_hours integer NOT NULL DEFAULT 4;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS dispute_proof_max_mb      integer NOT NULL DEFAULT 10;
```

##### Ticket Number Generator (Supabase Function)

```sql
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  seq integer;
  yr  text;
BEGIN
  yr  := to_char(now(), 'YYYY');
  seq := nextval('dispute_ticket_seq');
  RETURN 'DSP-' || yr || '-' || lpad(seq::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS dispute_ticket_seq START 1;
```

##### RLS Policies

```sql
ALTER TABLE disputes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_offender_log ENABLE ROW LEVEL SECURITY;

-- Reporter can see their own disputes
CREATE POLICY d_reporter_read   ON disputes FOR SELECT
  USING (reporter_id = auth.uid());
CREATE POLICY d_reporter_insert ON disputes FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Admins see all
CREATE POLICY d_admin_all ON disputes FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Events: reporter sees own dispute's events
CREATE POLICY de_reporter_read ON dispute_events FOR SELECT
  USING (dispute_id IN (SELECT id FROM disputes WHERE reporter_id = auth.uid()));
CREATE POLICY de_admin_all ON dispute_events FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Notes: internal notes admin only; non-internal visible to reporter
CREATE POLICY dn_admin_all ON dispute_notes FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY dn_reporter_read ON dispute_notes FOR SELECT
  USING (
    is_internal = false
    AND dispute_id IN (SELECT id FROM disputes WHERE reporter_id = auth.uid())
  );
```

**Migration file:** `supabase/dispute_management_migration.sql`

---

#### PHASE D2 — Backend Actions & File Storage

**Goal:** Server actions for submit, update, note, file upload. No UI changes yet.

##### New file: `src/app/actions/disputeActionsV2.ts`

Key server actions to build:

```
submitDisputeAction(formData)
  → validates reporter role, booking ownership if booking_id provided
  → generates ticket_number via DB function
  → calculates sla_deadline_at from priority + platform_settings
  → inserts dispute row
  → inserts dispute_events row (event_type: 'created')
  → inserts dispute_offender_log row for respondent
  → sendNotifications: reporter confirmation + all admin IDs
  → returns { ticketNumber, disputeId }

updateDisputeStatusAction(formData)
  → requireRole('admin')
  → validates status transition (cannot go from resolved back to open)
  → updates dispute row
  → inserts dispute_events row (status_changed)
  → if resolved: set was_upheld on dispute_offender_log
  → sendNotifications: reporter notified of status change
  → returns {}

addDisputeNoteAction(formData)
  → requireRole('admin')
  → inserts dispute_notes row
  → if is_internal=false: sendNotification to reporter
  → inserts dispute_events row (note_added)

uploadDisputeProofAction(formData)
  → accepts file via formData
  → uploads to Supabase Storage bucket 'dispute-proofs/{disputeId}/{filename}'
  → appends URL to disputes.proof_urls array
  → inserts dispute_events row (proof_added)

checkSlaBreaches()  ← for cron / admin trigger
  → finds disputes where sla_deadline_at < now() and sla_breached = false
  → updates sla_breached = true
  → sends admin notification for each breach
```

##### Supabase Storage

- Create bucket: `dispute-proofs`
- Bucket policy: authenticated users can upload to their own dispute subfolder
- Max file size: read from `platform_settings.dispute_proof_max_mb`
- Allowed types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

##### Backward compatibility

Keep `app/actions/disputeActions.ts` (existing) fully intact. New actions in `disputeActionsV2.ts`. Old booking-level disputes continue working until migration complete.

---

#### PHASE D3 — Frontend Pages

**Goal:** Replace existing thin dispute pages with full-featured UI. Zero regression on existing flows.

##### Pages to build:

```
/patient/disputes/new           → Submit form (category, direction auto-set, proof upload)
/patient/disputes               → My disputes list with ticket numbers + status
/patient/disputes/[id]          → Detail view: timeline, status, admin notes (non-internal only)

/provider/disputes/new          → Submit form (nurse perspective)
/provider/disputes              → My disputes list
/provider/disputes/[id]         → Detail view

/hospital/disputes/new          → Submit form (hospital perspective)
/hospital/disputes              → My disputes list
/hospital/disputes/[id]         → Detail view

/admin/disputes                 → REPLACE existing — full table with ticket#, priority, SLA countdown
/admin/disputes/[id]            → REPLACE existing — timeline, notes panel, all actions
/admin/disputes/sla-breaches    → NEW — breached SLA list
```

##### Admin dispute detail page additions vs. current:

| Feature | Current | Phase D3 |
|---------|---------|----------|
| Status | 3 states | 5 states + transition guard |
| Resolution | Radio + textarea | + action type dropdown |
| Internal notes | None | Dedicated notes panel |
| Timeline | None | Full event log |
| Proof files | None | Image/PDF viewer |
| SLA | None | Countdown badge |
| Repeat offender | None | Badge on respondent name |
| Ticket number | None | DSP-YYYY-NNNNN in header |
| Escalated state | None | Full escalation flow |

##### New component: `DisputeTimeline.tsx`

```tsx
// Shows dispute_events sorted ascending
// Event types have icons: 📋 created, 🔄 status_changed, 📝 note_added,
//                         📎 proof_added, ⚖️ resolved, ❌ rejected, 🚨 sla_breached
```

##### New component: `DisputeProofViewer.tsx`

```tsx
// Renders proof_urls array
// Images: <img> in lightbox
// PDFs: new tab link
```

##### Trigger point to open dispute form (where to add button):

| Page | Button |
|------|--------|
| `/patient/bookings/[id]` | "🚨 Report Issue" button (already has no-show, extend to full form) |
| `/provider/bookings/[id]` | "⚠️ Report Issue" button (already exists, extend) |
| `/hospital/booking/[id]` | New "⚠️ Report Issue" button |
| Standalone | `/patient/disputes/new?type=general` for non-booking disputes |

---

## PART C — MODULE 1: LEAVE MANAGEMENT SYSTEM

### Current State Audit

Relevant existing tables:
- `nurse_shifts` — recurring weekly shift template
- `shift_bookings` — actual per-date slot bookings
- `shift_availability` — cached availability (available/partial/booked)
- `booking_requests` — patient booking records with `nurse_id`
- `nurses` — nurse profiles with `status`
- `nurse_services` — services a nurse offers

**No leave table exists.** No reassignment logic exists.

### Critical Design Decision: Reassignment Safety

Auto-reassignment of a confirmed booking is **irreversible if done wrong** — a patient could show up expecting Nurse A and find Nurse B with no notice, or worse, no nurse at all. The safest design:

```
Leave Request Submitted
        ↓
[ASYNC BACKGROUND CHECK — never blocks nurse's leave request UI]
        ↓
    No bookings in period?
        → Auto-approve OR queue for admin approval (per platform setting)
        ↓
    Bookings exist?
        → Status: 'pending_reassignment'
        → Notify admin immediately
        → Run replacement search (read-only — do NOT auto-assign yet)
        → Show admin: suggested replacement nurses with match score
        → Admin manually confirms reassignment
        ↓
    Admin confirms replacement:
        → Update booking_requests.nurse_id
        → Update shift_bookings rows
        → Recalc shift_availability for old and new nurse
        → Send notifications: patient + hospital + old nurse + new nurse
        ↓
    No replacement found:
        → Leave status: 'pending_no_replacement'
        → Admin must manually handle (contact patient, arrange external nurse)
```

**Why not full auto-assignment?** The system has no way to verify the replacement nurse is willing, has the right soft skills for that specific patient, or is properly briefed. Admin review adds 15 minutes of safety for a patient's care.

---

### Module 1 — Phase Breakdown

---

#### PHASE L1 — Database Foundation

**Goal:** New tables for leave requests and reassignment tracking.

##### New Table: `leave_requests`

```sql
CREATE TABLE leave_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id            uuid NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
  nurse_user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Leave period
  leave_type          text NOT NULL CHECK (leave_type IN (
                        'full_day',
                        'partial_shift',
                        'emergency',
                        'planned'
                      )),
  start_date          date NOT NULL,
  end_date            date NOT NULL,
  affected_shifts     text[] DEFAULT '{}',  -- ['morning','evening','night'] or subset

  -- Partial shift details
  partial_start_time  time,
  partial_end_time    time,

  -- Reason
  reason              text NOT NULL,
  is_emergency        boolean NOT NULL DEFAULT false,

  -- Workflow status
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending',
                          'approved',
                          'rejected',
                          'pending_reassignment',  -- approved but bookings need handling
                          'pending_no_replacement' -- approved, no replacement found yet
                        )),

  -- Admin fields
  admin_note          text,
  reviewed_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,

  -- Booking impact
  affected_booking_count integer NOT NULL DEFAULT 0,
  reassignment_complete  boolean NOT NULL DEFAULT false,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leave_nurse_id    ON leave_requests(nurse_id);
CREATE INDEX idx_leave_status      ON leave_requests(status);
CREATE INDEX idx_leave_date_range  ON leave_requests(start_date, end_date);
```

##### New Table: `leave_reassignments`

```sql
CREATE TABLE leave_reassignments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id      uuid NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  booking_request_id    uuid NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,

  -- Original nurse
  original_nurse_id     uuid REFERENCES nurses(id) ON DELETE SET NULL,
  original_nurse_name   text,

  -- Suggested replacement (set by system search)
  suggested_nurse_id    uuid REFERENCES nurses(id) ON DELETE SET NULL,
  suggested_nurse_name  text,
  suggestion_score      integer,  -- match score 0-100

  -- Confirmed replacement (set by admin)
  replacement_nurse_id   uuid REFERENCES nurses(id) ON DELETE SET NULL,
  replacement_nurse_name text,
  replacement_nurse_user_id uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Pricing impact
  original_price        numeric(10,2),
  replacement_price     numeric(10,2),
  price_delta           numeric(10,2) GENERATED ALWAYS AS (replacement_price - original_price) STORED,

  -- Status
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending',        -- admin needs to act
                            'confirmed',      -- admin confirmed replacement
                            'no_match',       -- no suitable nurse found
                            'patient_notified' -- notification sent
                          )),

  confirmed_by          uuid REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at          timestamptz,
  patient_notified_at   timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lr_leave_id    ON leave_reassignments(leave_request_id);
CREATE INDEX idx_lr_booking_id  ON leave_reassignments(booking_request_id);
CREATE INDEX idx_lr_status      ON leave_reassignments(status);
```

##### New Table: `nurse_leave_blocks` (Applied approved leave — blocks availability)

```sql
CREATE TABLE nurse_leave_blocks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id        uuid NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
  leave_request_id uuid REFERENCES leave_requests(id) ON DELETE CASCADE,
  date            date NOT NULL,
  shift           text CHECK (shift IN ('morning','evening','night')),  -- null = full day
  partial_start   time,
  partial_end     time,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nurse_id, date, shift)
);

CREATE INDEX idx_leave_blocks_nurse_date ON nurse_leave_blocks(nurse_id, date);
```

##### platform_settings additions

```sql
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS leave_auto_approve_no_bookings boolean NOT NULL DEFAULT false;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS leave_min_advance_hours         integer NOT NULL DEFAULT 48;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS leave_emergency_min_hours       integer NOT NULL DEFAULT 2;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS leave_auto_search_replacement   boolean NOT NULL DEFAULT true;
```

##### RLS Policies

```sql
ALTER TABLE leave_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_reassignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_leave_blocks   ENABLE ROW LEVEL SECURITY;

-- Nurse: own leaves
CREATE POLICY lr_nurse_own ON leave_requests FOR ALL
  USING (nurse_user_id = auth.uid());

-- Admin: all
CREATE POLICY lr_admin_all ON leave_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Reassignments: admin only
CREATE POLICY lra_admin_all ON leave_reassignments FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Leave blocks: publicly readable (needed for availability display)
CREATE POLICY lb_public_read ON nurse_leave_blocks FOR SELECT USING (true);
CREATE POLICY lb_admin_all   ON nurse_leave_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
```

**Migration file:** `supabase/leave_management_migration.sql`

---

#### PHASE L2 — Backend Actions

**Goal:** Safe server actions for leave request lifecycle. No auto-assignment yet.

##### New file: `src/app/actions/leaveActions.ts`

```
submitLeaveRequest(formData)
  → requireRole('provider')
  → validate: start_date >= today + leave_min_advance_hours
                (emergency: start_date >= today + leave_emergency_min_hours)
  → validate: end_date >= start_date
  → validate: at least one affected_shift selected
  → find affected bookings:
      SELECT from booking_requests
      WHERE nurse_id = user.id
      AND start_date BETWEEN leave.start_date AND leave.end_date
      AND status IN ('pending','accepted','confirmed')
  → set affected_booking_count = count of above
  → if count = 0 AND leave_auto_approve_no_bookings = true:
      → status = 'approved', auto-insert nurse_leave_blocks
  → else:
      → status = 'pending'
  → insert leave_requests row
  → sendNotifications: admin(s) — leave request submitted
  → return { leaveId, affectedBookings: count }

approveLeaveRequest(leaveId, adminNote?)
  → requireRole('admin')
  → fetch leave request + affected bookings
  → if affected_booking_count > 0:
      → status = 'pending_reassignment'
      → for each affected booking: insert leave_reassignments row
        + run findReplacementNurses() — read-only search
        + store suggestion in suggested_nurse_id
  → else:
      → status = 'approved'
      → insert nurse_leave_blocks rows for each date in range
  → sendNotifications: nurse (approved) + admin (bookings need handling if any)
  → return {}

rejectLeaveRequest(leaveId, adminNote)
  → requireRole('admin')
  → update status = 'rejected'
  → sendNotification to nurse
  → return {}

confirmReassignment(reassignmentId, replacementNurseId)
  → requireRole('admin')
  → fetch reassignment + booking + replacement nurse
  → validate replacement nurse is approved + available on that date/shift
  → update booking_requests: nurse_id, nurse_name
  → update shift_bookings rows for that booking_request_id
  → recalcShiftAvailability for old nurse + new nurse for each affected date
  → update leave_reassignments: status = 'confirmed', confirmed_by, confirmed_at
  → check if all reassignments for this leave are confirmed
      → if yes: update leave_requests.status = 'approved', reassignment_complete = true
                + insert nurse_leave_blocks
  → sendNotifications:
      patient: "Your nurse has been changed to [NewNurse] for [date]"
      new nurse: "You have been assigned a booking from [OldNurse] on [date]"
      old nurse: "Booking on [date] has been reassigned"
      admin(s): confirmation receipt
  → return {}

markNoReplacement(reassignmentId, adminNote)
  → requireRole('admin')
  → update leave_reassignments status = 'no_match'
  → check if all reassignments are resolved (confirmed or no_match)
      → update leave_requests status = 'pending_no_replacement'
  → sendNotifications: patient warned, admin flagged
  → return {}
```

##### Replacement Search Algorithm: `findReplacementNurses(bookingId, date, shift)`

```
Input: bookingId, date, shift

1. Get original booking details:
   service_type, city, patient_condition, original nurse's specializations

2. Find candidate nurses:
   SELECT nurses WHERE status = 'approved'
   AND id NOT IN (
     SELECT nurse_id FROM shift_bookings WHERE date = ? AND shift = ?
   )
   AND id NOT IN (
     SELECT nurse_id FROM nurse_leave_blocks WHERE date = ? AND (shift IS NULL OR shift = ?)
   )
   AND id != original_nurse_id

3. Score each candidate (0-100):
   +40  Same city as booking
   +30  Offers same service_type
   +20  Matching specialization
   +10  Gender preference match

4. Return top 5 sorted by score DESC
```

This is a **suggestion** — admin confirms. No auto-write to booking.

---

#### PHASE L3 — Frontend Pages

##### Nurse-facing pages:

```
/provider/leave                 → My leave history + status list
/provider/leave/new             → Submit leave request form
/provider/leave/[id]            → Detail: status, admin note, affected bookings count
```

Leave submission form fields:
- Leave type: Full Day / Partial Shift / Emergency / Planned
- Start date (min = today + platform min_advance_hours, except emergency)
- End date
- Affected shifts (checkboxes: morning, evening, night)
- If Partial Shift: start time + end time pickers
- Reason (textarea, required)
- Emergency checkbox (unlocks shorter advance window + flags as urgent)

##### Admin-facing pages:

```
/admin/leave                    → Leave requests list — filter by status, date range
/admin/leave/[id]               → Leave detail + approve/reject + reassignment panel
/admin/leave/reassignments      → All pending reassignments across all leaves
```

Admin leave detail page sections:
1. **Leave Summary** — nurse, dates, reason, type, status
2. **Affected Bookings** — table of impacted booking_requests
3. **Reassignment Panel** (shown if pending_reassignment):
   - Each booking row shows: patient name, date, shift, service
   - Suggested replacement nurses with match score (from findReplacementNurses)
   - Dropdown to select replacement + confirm button
   - "No Replacement Found" button
4. **Timeline** — events log
5. **Admin Actions** — Approve / Reject with note

##### Availability calendar update:

The existing `AvailabilityClient.tsx` at `/provider/availability` should read `nurse_leave_blocks` and show leave days as blocked (different color from bookings). Add this as a **non-breaking visual-only change** — leave blocks are read-only display.

---

## PART D — SHARED / CROSS-CUTTING CONCERNS

### Notification System

Reuse existing `sendNotifications()` from `src/lib/notifications.ts`. Add new notification types:

```typescript
// Add to NotificationType in notifications.ts:
| 'dispute_submitted'
| 'dispute_status_changed'
| 'dispute_resolved'
| 'dispute_note_added'
| 'leave_submitted'
| 'leave_approved'
| 'leave_rejected'
| 'leave_reassignment_needed'
| 'leave_nurse_replaced'
| 'leave_no_replacement'
```

### Admin Dashboard Additions

New KPI cards to add to `/admin/dashboard`:

```
Module 2 — Disputes:
  Open Disputes (link → /admin/disputes?status=open)
  SLA Breached (link → /admin/disputes/sla-breaches)
  Pending Resolution (link → /admin/disputes?status=under_review)

Module 1 — Leave:
  Pending Leave Requests (link → /admin/leave?status=pending)
  Pending Reassignments (link → /admin/leave/reassignments)
  No-Replacement Cases (link → /admin/leave?status=pending_no_replacement)
```

Add to existing admin nav sidebar:
- "Disputes" → `/admin/disputes` (already exists — upgrade in D3)
- "Leave Requests" → `/admin/leave` (new in L3)

---

## PART E — RISK POINTS, EDGE CASES & BUGS

### Module 2 — Disputes

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Reporter submits duplicate dispute for same booking | Medium | Unique constraint: one open dispute per (reporter_id, booking_id, category) |
| Large proof file crashes server action | High | Validate file size client-side + server-side against `dispute_proof_max_mb`. Reject before upload |
| Malicious file upload (script as .pdf) | Critical | Server-side MIME type check (not just extension). Use Supabase Storage signed URLs, never expose raw upload paths |
| Admin marks dispute resolved without action | Low | `resolution_action` is required field when status = resolved |
| SLA breach not detected if no traffic | Medium | Need scheduled cron or database trigger. Add to deployment checklist |
| Dispute filed against wrong person | Medium | Reporter must confirm respondent identity before submit. Show respondent name in review step |
| Sensitive data in proof files exposed | High | Bucket must be private — use signed URLs with 1-hour expiry, never public |
| Hospital can dispute nurse not in their booking | Medium | Server validates: hospital_booking_id must belong to reporter's hospital_id |

### Module 1 — Leave Management

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Nurse approved leave but patient's booking untouched | **CRITICAL** | Status `pending_reassignment` forces admin action before leave can be marked fully approved. No auto-approve with bookings |
| Race condition: two admins confirm different replacements | High | Optimistic lock: check `leave_reassignments.status = 'pending'` before confirming; fail if already 'confirmed' |
| Replacement nurse becomes unavailable after suggestion | Medium | Re-validate availability at confirmation time, not suggestion time |
| Leave block inserted for nurse but booking_requests not updated | **CRITICAL** | Transactional: insert leave_blocks ONLY after all reassignments are confirmed |
| Emergency leave with 2-hour notice on confirmed booking | High | Always require admin review for bookings; never auto-reassign emergency leaves |
| Nurse cancels leave after admin already reassigned | High | Only allow leave cancellation when status = 'pending' (not yet approved) |
| Same nurse re-booked after leave block | Medium | `findReplacementNurses()` already excludes nurses with leave blocks. Patient booking form should also check leave_blocks table |
| Price change when expensive nurse replaces cheaper one | Medium | `price_delta` shown to admin before confirming. Admin must acknowledge delta |
| Partial shift leave overlaps with partial booking | Medium | Leave validation checks time ranges, not just date+shift. `partial_start_time` and `partial_end_time` must not overlap with existing bookings |
| Weekly/monthly recurring booking spans leave period | High | `submitLeaveRequest` must expand recurring booking_requests into their session dates before checking conflicts |
| Hospital booking nurse assignment changed mid-contract | High | Hospital bookings (hospital_booking_requests) also need reassignment handling. Phase L2 v2 feature |

---

## PART F — SECURITY CONSIDERATIONS

### Module 2 — Disputes

1. **File upload injection** — Never execute or serve uploaded files as code. Use Supabase Storage with content-type enforcement. Signed URLs expire.
2. **Reporter impersonation** — `reporter_id` is always set to `auth.uid()` server-side — never trust client-submitted reporter_id.
3. **Respondent data leak** — A reporter should only see their own dispute details. Cannot enumerate other users' disputes via respondent_id.
4. **Admin note leak** — `is_internal = true` notes never returned in reporter-facing queries. RLS enforced at DB level.
5. **Ticket number enumeration** — Ticket numbers are sequential (DSP-2026-00042). Do not expose other users' tickets via ticket number lookup.
6. **Proof file path traversal** — Storage bucket organized as `{disputeId}/{filename}`. Server validates that `disputeId` belongs to the authenticated user before inserting URL.

### Module 1 — Leave Management

1. **Nurse cannot reassign their own booking** — `confirmReassignment` requires `admin` role. Nurses only submit leave — they never touch booking_requests directly.
2. **Leave block integrity** — `nurse_leave_blocks` only written by admin-confirmed flows, never by nurse directly.
3. **Patient data exposure in leave admin page** — Admin sees patient name + date only (needed for reassignment). No medical notes exposed.
4. **Replacement nurse profile exposure** — `findReplacementNurses()` returns only nurse_id, name, city, specialization — no contact details or private fields.

---

## PART G — ROLLBACK PLAN

### Per-Phase Rollback

Each module uses additive-only DB changes (new tables, new columns). No existing tables are altered destructively.

**Feature flags:** Add `disputes_v2_enabled` and `leave_management_enabled` to `platform_settings`. All new UI is behind these flags. If issues arise, set to `false` — old flows remain intact.

```sql
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS disputes_v2_enabled     boolean NOT NULL DEFAULT false;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS leave_management_enabled boolean NOT NULL DEFAULT false;
```

**Application rollback** (Vercel): Promote previous deployment — takes 30 seconds. DB changes are non-destructive so no DB rollback needed for application bugs.

**Database rollback scripts** (only if tables need to be removed):

```sql
-- Module 2 rollback (DESTRUCTIVE — only if truly needed)
DROP TABLE IF EXISTS dispute_offender_log CASCADE;
DROP TABLE IF EXISTS dispute_notes CASCADE;
DROP TABLE IF EXISTS dispute_events CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP SEQUENCE IF EXISTS dispute_ticket_seq;

-- Module 1 rollback (DESTRUCTIVE — only if truly needed)
DROP TABLE IF EXISTS nurse_leave_blocks CASCADE;
DROP TABLE IF EXISTS leave_reassignments CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
```

**Never run rollback scripts** while data exists — export first.

---

## PART H — TESTING CHECKLIST

### Phase D1 (Dispute DB)

- [ ] All 4 new tables created with correct constraints
- [ ] `generate_ticket_number()` returns unique sequential values
- [ ] RLS: patient cannot read another patient's dispute
- [ ] RLS: admin can read all disputes
- [ ] RLS: internal notes not visible to reporter
- [ ] `v_repeat_offenders` view returns correct counts

### Phase D2 (Dispute Actions)

- [ ] `submitDisputeAction`: ticket number generated, SLA deadline correct per priority
- [ ] `submitDisputeAction`: booking ownership validated (patient can only link their bookings)
- [ ] `submitDisputeAction`: file size rejection works above limit
- [ ] `submitDisputeAction`: MIME type enforcement on upload
- [ ] `updateDisputeStatusAction`: cannot transition resolved → open
- [ ] `addDisputeNoteAction`: internal note not visible to reporter
- [ ] Notifications sent to correct recipients on each action
- [ ] `checkSlaBreaches`: correctly flags overdue disputes

### Phase D3 (Dispute UI)

- [ ] Patient can submit dispute with and without booking link
- [ ] Patient can attach proof file (image + PDF)
- [ ] Patient can view timeline events
- [ ] Patient cannot see internal admin notes
- [ ] Provider can submit dispute from booking detail page
- [ ] Hospital can submit dispute from hospital booking detail page
- [ ] Admin list shows correct SLA countdown
- [ ] Admin can add internal note — not visible to reporter
- [ ] Admin can add public note — visible to reporter
- [ ] Admin can resolve with action type required
- [ ] Repeat offender badge shows on respondent with 2+ upheld complaints
- [ ] Existing `ReportIssueModal` still works (no regression)
- [ ] Existing `admin/disputes` page still shows old booking-level disputes

### Phase L1 (Leave DB)

- [ ] `leave_requests` table created with correct status constraints
- [ ] `leave_reassignments` computed `price_delta` column correct
- [ ] `nurse_leave_blocks` unique constraint (nurse_id, date, shift) enforced
- [ ] RLS: nurse cannot read another nurse's leave
- [ ] RLS: `nurse_leave_blocks` publicly readable for availability check
- [ ] `leave_management_enabled` flag defaults to false

### Phase L2 (Leave Actions)

- [ ] `submitLeaveRequest`: minimum advance validation (planned vs emergency)
- [ ] `submitLeaveRequest`: recurring booking sessions detected correctly
- [ ] `submitLeaveRequest`: affected_booking_count correct
- [ ] `approveLeaveRequest`: with 0 bookings → approved + blocks inserted
- [ ] `approveLeaveRequest`: with bookings → pending_reassignment + reassignment rows created
- [ ] `findReplacementNurses`: excludes nurses with existing bookings on that shift/date
- [ ] `findReplacementNurses`: excludes nurses with leave_blocks on that date
- [ ] `confirmReassignment`: booking_requests.nurse_id updated
- [ ] `confirmReassignment`: shift_bookings updated
- [ ] `confirmReassignment`: shift_availability recalculated for both nurses
- [ ] `confirmReassignment`: leaves fully approved only when all reassignments resolved
- [ ] `confirmReassignment`: patient notification sent with new nurse name
- [ ] Race condition: second admin confirm attempt fails gracefully
- [ ] Nurse cannot access `confirmReassignment` action

### Phase L3 (Leave UI)

- [ ] Nurse: leave form respects min advance hours
- [ ] Nurse: emergency leave unlocks shorter advance window
- [ ] Nurse: cannot cancel leave once in pending_reassignment status
- [ ] Admin: leave list shows correct status badges
- [ ] Admin: reassignment panel shows match scores
- [ ] Admin: price delta warning shown if replacement nurse is more expensive
- [ ] Admin: "No Replacement Found" option available
- [ ] Availability calendar: leave blocks shown in distinct color
- [ ] Patient booking form: blocked dates (leave_blocks) not selectable for that nurse
- [ ] Notifications delivered correctly for all status transitions

---

## PART I — DEPLOYMENT STRATEGY (Zero Downtime)

### Principle: DB First, Code Second, Flag Third

Every phase follows this sequence:

```
1. Run migration SQL  →  no app changes yet, purely additive
2. Deploy app code    →  new code reads new tables; old flows unchanged
3. Enable feature flag → new UI becomes live
```

This means at any point between steps, the old system works perfectly.

### Phase Sequence & Dependencies

```
Phase D1 (Dispute DB migration)
    ↓ no dependency on code
Phase D2 (Dispute actions) — can deploy while D1 migration is live
    ↓
Phase D3 (Dispute UI) — enable disputes_v2_enabled flag after smoke test
    ↓
Phase L1 (Leave DB migration) — independent of D phases
    ↓
Phase L2 (Leave actions) — deploy alongside or after L1
    ↓
Phase L3 (Leave UI) — enable leave_management_enabled flag after smoke test
```

### Each Phase Deploy Checklist

Before each phase:
- [ ] Row-count snapshot (Section 6.4 pattern from DEPLOYMENT_CHECKLIST.md)
- [ ] Feature flag for that module is OFF

After each phase:
- [ ] Run verification queries (check tables/columns exist)
- [ ] Smoke test one full flow
- [ ] Monitor Vercel function logs for 15 minutes
- [ ] Enable flag only after smoke test passes

---

## PART J — MVP vs ADVANCED FEATURES

### Module 2 — Disputes

| Feature | MVP (Build First) | Advanced (Later) |
|---------|------------------|-----------------|
| Submit dispute | ✅ | |
| Category + direction | ✅ | |
| Admin review + resolve | ✅ | |
| 5 status states | ✅ | |
| Timeline log | ✅ | |
| Internal notes | ✅ | |
| Proof upload (image/PDF) | ✅ | |
| Ticket number | ✅ | |
| Priority level | ✅ | |
| SLA deadline calculation | ✅ | |
| Repeat offender detection | ✅ (view only) | Auto-flag + suspension flow |
| SLA breach cron | | Phase 2 (cron job) |
| Refund processing | | Requires payment engine |
| Penalty auto-deduction | | Requires payment engine |
| Email notifications (external) | | Phase 2 |
| Dispute appeal by respondent | | Phase 3 |
| Cross-dispute pattern analysis | | Phase 3 |

### Module 1 — Leave Management

| Feature | MVP (Build First) | Advanced (Later) |
|---------|------------------|-----------------|
| Submit leave request | ✅ | |
| Admin approve/reject | ✅ | |
| Conflict detection (show affected bookings) | ✅ | |
| Admin manual reassignment confirmation | ✅ | |
| Replacement nurse suggestions (scored) | ✅ | |
| Leave blocks on availability calendar | ✅ | |
| Patient notification on nurse change | ✅ | |
| Pricing delta display | ✅ | |
| Emergency leave shorter advance | ✅ | |
| Partial shift leave | ✅ | |
| Full auto-reassignment (no admin) | | Phase 2 (after testing) |
| Hospital booking reassignment | | Phase 2 |
| Recurring booking conflict expansion | ✅ (date expansion) | |
| Leave balance / quota per nurse | | Phase 3 |
| Leave analytics dashboard | | Phase 3 |
| Nurse substitution preference settings | | Phase 3 |

---

## PART K — SUMMARY TABLE

| # | Item | Module | Phase | Priority |
|---|------|--------|-------|----------|
| 1 | Dispute DB schema (4 tables) | D | D1 | P0 |
| 2 | Dispute server actions | D | D2 | P0 |
| 3 | File upload to Supabase Storage | D | D2 | P0 |
| 4 | Admin dispute pages (upgraded) | D | D3 | P0 |
| 5 | Patient/Nurse/Hospital dispute submit | D | D3 | P0 |
| 6 | Dispute timeline component | D | D3 | P1 |
| 7 | SLA countdown display | D | D3 | P1 |
| 8 | Repeat offender badge | D | D3 | P1 |
| 9 | Feature flag: disputes_v2_enabled | D | D1 | P0 |
| 10 | Leave DB schema (3 tables) | L | L1 | P0 |
| 11 | Leave server actions (submit/approve/reject) | L | L2 | P0 |
| 12 | Reassignment action + replacement search | L | L2 | P0 |
| 13 | Nurse leave pages | L | L3 | P0 |
| 14 | Admin leave pages | L | L3 | P0 |
| 15 | Leave blocks on availability calendar | L | L3 | P1 |
| 16 | Patient booking blocks leave-blocked dates | L | L3 | P1 |
| 17 | Feature flag: leave_management_enabled | L | L1 | P0 |
| 18 | Admin dashboard KPI additions | Both | L3/D3 | P1 |
| 19 | Notification types added | Both | D2/L2 | P0 |
| 20 | SLA breach cron job | D | Post-launch | P2 |

---

*Document version: 1.0 · Awaiting approval before implementation begins*
