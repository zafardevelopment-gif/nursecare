-- Activity Logs table for NurseCare+ admin audit trail
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS activity_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   text,
  actor_role   text        NOT NULL,  -- admin, patient, provider, hospital
  action       text        NOT NULL,  -- e.g. booking_created, nurse_approved, complaint_resolved
  entity_type  text,                  -- booking, nurse, complaint, leave, agreement, user, setting
  entity_id    uuid,
  description  text        NOT NULL,
  meta         jsonb       DEFAULT '{}',
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast filtering and pagination
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id    ON activity_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_role  ON activity_logs (actor_role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action      ON activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at  ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_role ON activity_logs (created_at DESC, actor_role);

-- RLS: Only admins can read all logs; users can read their own
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert (used by server actions)
CREATE POLICY "service_role_all" ON activity_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Admins can read all logs
CREATE POLICY "admin_read_all" ON activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can read their own activity
CREATE POLICY "user_read_own" ON activity_logs
  FOR SELECT USING (actor_id = auth.uid());
