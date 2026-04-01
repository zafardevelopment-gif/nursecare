-- ============================================================
-- Nurse ID Card System Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS nurse_id_cards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id        uuid NOT NULL REFERENCES nurses(id) ON DELETE CASCADE,
  unique_id_code  text NOT NULL UNIQUE,          -- e.g. "NC-2024-00042"
  issue_date      date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date     date NOT NULL,
  status          text NOT NULL DEFAULT 'active' -- active | revoked
    CHECK (status IN ('active', 'revoked')),
  generated_by    uuid REFERENCES auth.users(id),
  revoked_by      uuid REFERENCES auth.users(id),
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one active card per nurse at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_id_cards_nurse_active
  ON nurse_id_cards(nurse_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_id_cards_unique_code ON nurse_id_cards(unique_id_code);
CREATE INDEX IF NOT EXISTS idx_id_cards_nurse       ON nurse_id_cards(nurse_id);

-- RLS
ALTER TABLE nurse_id_cards ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "id_cards_admin_all" ON nurse_id_cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Nurse: read own card only
CREATE POLICY "id_cards_nurse_read" ON nurse_id_cards
  FOR SELECT USING (
    nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid())
  );

-- Public verification: SELECT by unique_id_code (via service role in API)
-- (handled server-side with service role, no RLS policy needed for anon)

-- Sequence for human-readable ID codes
CREATE SEQUENCE IF NOT EXISTS nurse_id_card_seq START 1000;
