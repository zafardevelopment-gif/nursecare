-- Activity Logs — safe to re-run (all statements are idempotent)

CREATE TABLE IF NOT EXISTS activity_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   text,
  actor_role   text        NOT NULL,
  action       text        NOT NULL,
  entity_type  text,
  entity_id    uuid,
  description  text        NOT NULL,
  meta         jsonb       DEFAULT '{}',
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Add module column (safe if already exists)
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS module text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id    ON activity_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_role  ON activity_logs (actor_role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action      ON activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module      ON activity_logs (module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at  ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_role ON activity_logs (created_at DESC, actor_role);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies (DROP first so re-running never fails)
DROP POLICY IF EXISTS "service_role_all" ON activity_logs;
DROP POLICY IF EXISTS "admin_read_all"   ON activity_logs;
DROP POLICY IF EXISTS "user_read_own"    ON activity_logs;

CREATE POLICY "service_role_all" ON activity_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "admin_read_all" ON activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_read_own" ON activity_logs
  FOR SELECT USING (actor_id = auth.uid());
