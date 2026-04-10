-- =============================================
-- MIGRATION: Payment deadline auto-cancel feature
-- NurseCare+ — Run in Supabase SQL Editor
-- =============================================

-- 1. Add payment_deadline_hours to platform_settings
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS payment_deadline_hours integer NOT NULL DEFAULT 24;

COMMENT ON COLUMN platform_settings.payment_deadline_hours IS
  'Hours after booking confirmation within which patient must pay, or booking is auto-cancelled. 0 = disabled.';

UPDATE platform_settings SET payment_deadline_hours = 24 WHERE payment_deadline_hours IS NULL;

-- 2. Add deadline + cancel tracking columns to booking_requests
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS payment_deadline_at  timestamptz,
  ADD COLUMN IF NOT EXISTS payment_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_status       text NOT NULL DEFAULT 'unpaid';
  -- 'unpaid' | 'paid' | 'refunded'

COMMENT ON COLUMN booking_requests.payment_deadline_at IS
  'Timestamp by which patient must complete payment, else booking is auto-cancelled.';
COMMENT ON COLUMN booking_requests.payment_cancelled_at IS
  'Timestamp when booking was cancelled due to non-payment.';
COMMENT ON COLUMN booking_requests.payment_status IS
  'Payment state: unpaid | paid | refunded';

-- 3. Notifications table (in-app notifications for patients and nurses)
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  -- 'payment_reminder' | 'booking_cancelled' | 'booking_accepted' | 'booking_completed' | etc.
  title       text NOT NULL,
  body        text NOT NULL,
  data        jsonb DEFAULT '{}',
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_user_idx     ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_unread_idx   ON notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notif_read_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Service role can do everything
CREATE POLICY "notif_service_all" ON notifications
  FOR ALL USING (true);

-- Mark read
CREATE POLICY "notif_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
