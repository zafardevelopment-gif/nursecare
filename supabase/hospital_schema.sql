-- =============================================
-- HOSPITAL MODULE SCHEMA
-- NurseCare+ — Run in Supabase SQL Editor
-- =============================================

-- 1. hospitals table (profile, separate from users)
CREATE TABLE IF NOT EXISTS hospitals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile fields
  hospital_name     text NOT NULL,
  license_cr        text,
  contact_person    text NOT NULL,
  designation       text,
  email             text,
  phone             text,
  city              text,
  address           text,
  scope_of_services text,

  -- Approval flow (mirrors nurses table pattern)
  status            text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'approved' | 'rejected' | 'agreement_pending' | 'active'
  rejection_reason  text,
  approved_by       uuid REFERENCES auth.users(id),
  approved_at       timestamptz,
  reviewed_at       timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hospitals_user_id_idx ON hospitals(user_id);
CREATE INDEX IF NOT EXISTS hospitals_status_idx  ON hospitals(status);

-- 2. hospital_agreements table
CREATE TABLE IF NOT EXISTS hospital_agreements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  ref_number        text UNIQUE NOT NULL, -- e.g. AGR-2026-0042

  -- Validity
  start_date        date NOT NULL,
  end_date          date NOT NULL,

  -- Payment structure
  payment_type      text NOT NULL DEFAULT 'monthly',
  -- 'advance' | 'daily' | 'weekly' | 'monthly'

  -- Advance fields
  adv_deadline_hrs  integer,

  -- Daily fields
  daily_deadline_hrs   integer,
  daily_grace_hrs      integer,
  daily_cancel_misses  integer,
  daily_missed_action  text, -- 'pause' | 'cancel'

  -- Weekly fields
  weekly_payment_day   text,
  weekly_deadline_hrs  integer,
  weekly_grace_hrs     integer,
  weekly_missed_action text,

  -- Monthly fields
  monthly_billing_day  integer, -- day of month e.g. 25
  monthly_advance_days integer,
  monthly_grace_hrs    integer,
  monthly_missed_action text,

  -- Reminders (array of hours before deadline)
  reminder_hours    integer[] DEFAULT ARRAY[48, 24, 6],

  -- Agreement lifecycle status
  status            text NOT NULL DEFAULT 'draft',
  -- 'draft' | 'admin_approved' | 'sent' | 'hospital_accepted' | 'hospital_rejected' | 'active' | 'expired'

  -- Who did what
  created_by        uuid REFERENCES auth.users(id),
  admin_approved_by uuid REFERENCES auth.users(id),
  admin_approved_at timestamptz,
  sent_at           timestamptz,
  hospital_accepted_at       timestamptz,
  hospital_rejected_at       timestamptz,
  hospital_rejection_reason  text,
  activated_at      timestamptz,

  -- Audit
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ha_hospital_id_idx ON hospital_agreements(hospital_id);
CREATE INDEX IF NOT EXISTS ha_status_idx      ON hospital_agreements(status);
CREATE INDEX IF NOT EXISTS ha_ref_idx         ON hospital_agreements(ref_number);

-- 3. hospital_audit_log table
CREATE TABLE IF NOT EXISTS hospital_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id  uuid REFERENCES hospitals(id) ON DELETE CASCADE,
  agreement_id uuid REFERENCES hospital_agreements(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES auth.users(id),
  actor_role   text,
  action       text NOT NULL,
  -- e.g. 'hospital_registered' | 'admin_approved_hospital' | 'agreement_created'
  --      'agreement_sent' | 'hospital_accepted' | 'hospital_rejected' | 'agreement_activated'
  details      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 4. Add languages column to nurses if not exists (from previous task)
ALTER TABLE nurses
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}';

-- 5. Add work_start_enable_hours_before to platform_settings if not exists
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS work_start_enable_hours_before integer DEFAULT 1;

-- 6. Row Level Security
ALTER TABLE hospitals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_audit_log  ENABLE ROW LEVEL SECURITY;

-- hospitals RLS
CREATE POLICY "hospitals_own_read"   ON hospitals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "hospitals_own_insert" ON hospitals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "hospitals_own_update" ON hospitals FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "hospitals_service_all" ON hospitals FOR ALL USING (true); -- service role bypasses

-- hospital_agreements RLS
CREATE POLICY "ha_hospital_read" ON hospital_agreements
  FOR SELECT USING (
    hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid())
  );
CREATE POLICY "ha_service_all" ON hospital_agreements FOR ALL USING (true);

-- audit log — service role only writes, hospital can read own
CREATE POLICY "hal_hospital_read" ON hospital_audit_log
  FOR SELECT USING (
    hospital_id IN (SELECT id FROM hospitals WHERE user_id = auth.uid())
  );
CREATE POLICY "hal_service_all" ON hospital_audit_log FOR ALL USING (true);
