-- Smart Leave Management System Migration
-- Safe to run multiple times (all IF NOT EXISTS / IF EXISTS)

-- 1. Extend leave_requests table
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_start_date date;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_end_date   date;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS auto_approved    boolean NOT NULL DEFAULT false;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS conflict_count   int     NOT NULL DEFAULT 0;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS is_blocked       boolean NOT NULL DEFAULT false;

-- Backfill: copy existing leave_date into leave_start_date / leave_end_date
UPDATE leave_requests
SET    leave_start_date = leave_date,
       leave_end_date   = leave_date
WHERE  leave_start_date IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leave_start_date ON leave_requests (leave_start_date);
CREATE INDEX IF NOT EXISTS idx_leave_end_date   ON leave_requests (leave_end_date);
CREATE INDEX IF NOT EXISTS idx_leave_blocked    ON leave_requests (is_blocked);

-- 2. Add is_paused to nurses table
ALTER TABLE nurses ADD COLUMN IF NOT EXISTS is_paused        boolean NOT NULL DEFAULT false;
ALTER TABLE nurses ADD COLUMN IF NOT EXISTS pause_until      date;
ALTER TABLE nurses ADD COLUMN IF NOT EXISTS paused_reason    text;

CREATE INDEX IF NOT EXISTS idx_nurses_paused ON nurses (is_paused);

-- 3. Cron log table (for auto-reactivation audit trail)
CREATE TABLE IF NOT EXISTS cron_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name   text        NOT NULL,
  ran_at     timestamptz NOT NULL DEFAULT now(),
  affected   int         DEFAULT 0,
  details    jsonb       DEFAULT '{}'
);
