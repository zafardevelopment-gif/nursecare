-- ─────────────────────────────────────────────────────────────────────────────
-- Developer Settings Migration
-- Stores third-party API credentials managed by super admin only.
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards throughout).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Main developer_settings table
CREATE TABLE IF NOT EXISTS developer_settings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text        NOT NULL,          -- 'whatsapp' | 'moyasar' | 'sms' | 'smtp' | 'maps' | 'general'
  key_name    text        NOT NULL,
  key_value   text        NOT NULL DEFAULT '',
  description text        NOT NULL DEFAULT '',
  is_sensitive boolean    NOT NULL DEFAULT false,  -- mask in UI by default
  is_active   boolean     NOT NULL DEFAULT true,
  updated_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, key_name)
);

-- 2. History / audit table — stores previous values on every change
CREATE TABLE IF NOT EXISTS developer_settings_history (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id    uuid        NOT NULL REFERENCES developer_settings(id) ON DELETE CASCADE,
  category      text        NOT NULL,
  key_name      text        NOT NULL,
  old_value     text        NOT NULL DEFAULT '',
  new_value     text        NOT NULL DEFAULT '',
  changed_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name text      NOT NULL DEFAULT '',
  changed_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_developer_settings_category ON developer_settings (category);
CREATE INDEX IF NOT EXISTS idx_developer_settings_history_setting_id ON developer_settings_history (setting_id);
CREATE INDEX IF NOT EXISTS idx_developer_settings_history_changed_at ON developer_settings_history (changed_at DESC);

-- 4. RLS — only service_role can read/write (no direct client access)
ALTER TABLE developer_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_settings_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe re-run)
DROP POLICY IF EXISTS "no_direct_access_settings"  ON developer_settings;
DROP POLICY IF EXISTS "no_direct_access_history"   ON developer_settings_history;

-- Block all direct client access — only service_role (used in server actions) can bypass
CREATE POLICY "no_direct_access_settings"
  ON developer_settings FOR ALL TO authenticated
  USING (false);

CREATE POLICY "no_direct_access_history"
  ON developer_settings_history FOR ALL TO authenticated
  USING (false);

-- 5. Seed default rows (insert only if category+key_name doesn't exist yet)
INSERT INTO developer_settings (category, key_name, key_value, description, is_sensitive, is_active) VALUES

-- WhatsApp
('whatsapp', 'provider_name',       '',  'Meta / Twilio / 360dialog / WATI / Custom',     false, false),
('whatsapp', 'api_url',             '',  'WhatsApp API endpoint URL',                      false, false),
('whatsapp', 'access_token',        '',  'Bearer token for API authentication',            true,  false),
('whatsapp', 'phone_number_id',     '',  'Meta Phone Number ID',                           false, false),
('whatsapp', 'business_account_id', '',  'Meta Business Account ID',                       false, false),
('whatsapp', 'webhook_verify_token','',  'Token to verify incoming webhooks from Meta',    true,  false),
('whatsapp', 'webhook_secret',      '',  'HMAC secret for webhook payload verification',   true,  false),
('whatsapp', 'default_country_code','966','Default country code (without +)',              false, false),
('whatsapp', 'test_number',         '',  'Phone number to use for connection test',         false, false),
('whatsapp', 'enabled',             'false', 'Enable WhatsApp notifications globally',     false, false),

-- Moyasar
('moyasar', 'publishable_key',  '', 'Moyasar publishable key (pk_)',           false, false),
('moyasar', 'secret_key',       '', 'Moyasar secret key (sk_)',                true,  false),
('moyasar', 'callback_url',     '', 'Payment callback / redirect URL',         false, false),
('moyasar', 'webhook_secret',   '', 'Webhook signing secret from Moyasar',     true,  false),
('moyasar', 'currency',         'SAR', 'Payment currency (SAR, USD, etc.)',    false, false),
('moyasar', 'sandbox_mode',     'true',  'true = sandbox, false = live',       false, false),
('moyasar', 'enabled',          'false', 'Enable Moyasar payment gateway',     false, false),

-- SMS
('sms', 'provider_name', '', 'SMS provider name (e.g. Unifonic, Twilio)', false, false),
('sms', 'api_key',        '', 'API key for SMS provider',                  true,  false),
('sms', 'sender_id',      '', 'Sender ID / alphanumeric name',             false, false),
('sms', 'enabled',        'false', 'Enable SMS notifications',             false, false),

-- SMTP
('smtp', 'host',       '', 'SMTP server hostname',               false, false),
('smtp', 'port',       '587', 'SMTP port (587, 465, 25)',        false, false),
('smtp', 'username',   '', 'SMTP username / email',              false, false),
('smtp', 'password',   '', 'SMTP password',                      true,  false),
('smtp', 'from_name',  'NurseCare+', 'Sender display name',      false, false),
('smtp', 'from_email', '', 'From email address',                 false, false),
('smtp', 'use_ssl',    'true', 'true = SSL/TLS, false = STARTTLS', false, false),
('smtp', 'enabled',    'false', 'Enable email via SMTP',          false, false),

-- Google Maps
('maps', 'maps_api_key',       '', 'Google Maps JavaScript API key',     true,  false),
('maps', 'places_api_key',     '', 'Google Places API key',              true,  false),
('maps', 'geocoding_enabled',  'false', 'Enable geocoding features',     false, false),
('maps', 'enabled',            'false', 'Enable Google Maps integration', false, false),

-- General / Internal
('general', 'openai_api_key',    '', 'OpenAI API key (sk-...)',                true,  false),
('general', 'webhook_url',       '', 'Internal webhook receiver URL',          false, false),
('general', 'cron_secret',       '', 'Bearer token for cron job authorization', true,  false),
('general', 'internal_app_token','', 'Internal service-to-service token',      true,  false)

ON CONFLICT (category, key_name) DO NOTHING;
