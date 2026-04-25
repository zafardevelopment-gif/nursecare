-- ─────────────────────────────────────────────────────────────────────────────
-- Fill Developer Settings — Run in Supabase SQL Editor
-- Replace every <<PLACEHOLDER>> value with your actual key/value.
-- Safe to re-run — uses INSERT ... ON CONFLICT DO UPDATE (upsert).
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. GOOGLE MAPS  (already have this key from env)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO developer_settings (category, key_name, key_value, description, is_sensitive, is_active)
VALUES
  ('maps', 'maps_api_key',      'AIzaSyCXfDCo2fsl0eX-BCkLiFTbAYHg_kqvY9w', 'Google Maps JavaScript API key',   true,  true),
  ('maps', 'places_api_key',    'AIzaSyCXfDCo2fsl0eX-BCkLiFTbAYHg_kqvY9w', 'Google Places API key',            true,  true),
  ('maps', 'geocoding_enabled', 'true',                                      'Enable geocoding features',        false, true),
  ('maps', 'enabled',           'true',                                      'Enable Google Maps integration',   false, true)
ON CONFLICT (category, key_name) DO UPDATE
  SET key_value  = EXCLUDED.key_value,
      is_active  = EXCLUDED.is_active,
      updated_at = now();


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. WHATSAPP BUSINESS API
--    Get these from: Meta Business Manager → WhatsApp → API Setup
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO developer_settings (category, key_name, key_value, description, is_sensitive, is_active)
VALUES
  ('whatsapp', 'provider_name',        'Meta',                     'Provider: Meta / Twilio / WATI / 360dialog', false, true),
  ('whatsapp', 'api_url',              'https://graph.facebook.com/v18.0', 'WhatsApp Cloud API base URL',        false, true),
  ('whatsapp', 'access_token',         '<<WHATSAPP_ACCESS_TOKEN>>', 'Bearer token from Meta Business Manager', true,  true),
  ('whatsapp', 'phone_number_id',      '<<WHATSAPP_PHONE_NUMBER_ID>>', 'From Meta API Setup page',             false, true),
  ('whatsapp', 'business_account_id',  '<<WHATSAPP_WABA_ID>>',     'WhatsApp Business Account ID',            false, true),
  ('whatsapp', 'webhook_verify_token', '<<WHATSAPP_VERIFY_TOKEN>>', 'Any secret string you choose',            true,  true),
  ('whatsapp', 'webhook_secret',       '<<WHATSAPP_WEBHOOK_SECRET>>', 'App Secret from Meta App Dashboard',   true,  true),
  ('whatsapp', 'default_country_code', '966',                      'Saudi Arabia country code',               false, true),
  ('whatsapp', 'test_number',          '<<TEST_PHONE_966XXXXXXXX>>','Number to test API (with country code)', false, true),
  ('whatsapp', 'enabled',              'false',                    'Set true to enable WhatsApp globally',    false, true)
ON CONFLICT (category, key_name) DO UPDATE
  SET key_value  = EXCLUDED.key_value,
      is_active  = EXCLUDED.is_active,
      updated_at = now();


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. MOYASAR PAYMENT GATEWAY
--    Get these from: moyasar.com → Dashboard → API Keys
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO developer_settings (category, key_name, key_value, description, is_sensitive, is_active)
VALUES
  ('moyasar', 'publishable_key', '<<MOYASAR_PUBLISHABLE_KEY_pk_>>',  'Starts with pk_test_ or pk_live_', false, true),
  ('moyasar', 'secret_key',      '<<MOYASAR_SECRET_KEY_sk_>>',       'Starts with sk_test_ or sk_live_', true,  true),
  ('moyasar', 'callback_url',    'https://your-vercel-domain.vercel.app/api/payment/callback', 'After payment redirect URL', false, true),
  ('moyasar', 'webhook_secret',  '<<MOYASAR_WEBHOOK_SECRET>>',       'From Moyasar webhook settings',    true,  true),
  ('moyasar', 'currency',        'SAR',                              'Saudi Riyal',                      false, true),
  ('moyasar', 'sandbox_mode',    'true',                             'true=test mode, false=live',       false, true),
  ('moyasar', 'enabled',         'false',                            'Set true when ready to accept payments', false, true)
ON CONFLICT (category, key_name) DO UPDATE
  SET key_value  = EXCLUDED.key_value,
      is_active  = EXCLUDED.is_active,
      updated_at = now();


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. SMS PROVIDER
--    Recommended for Saudi Arabia: Unifonic / Taqnyat / Msegat
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO developer_settings (category, key_name, key_value, description, is_sensitive, is_active)
VALUES
  ('sms', 'provider_name', '<<SMS_PROVIDER_NAME>>',  'e.g. Unifonic / Taqnyat / Msegat', false, true),
  ('sms', 'api_key',       '<<SMS_API_KEY>>',         'API key from SMS provider dashboard', true, true),
  ('sms', 'sender_id',     'NurseCare',               'Max 11 characters alphanumeric',   false, true),
  ('sms', 'enabled',       'false',                   'Set true to enable SMS',           false, true)
ON CONFLICT (category, key_name) DO UPDATE
  SET key_value  = EXCLUDED.key_value,
      is_active  = EXCLUDED.is_active,
      updated_at = now();


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. EMAIL SMTP
--    Recommended: SendGrid / Resend / Amazon SES / Brevo
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO developer_settings (category, key_name, key_value, description, is_sensitive, is_active)
VALUES
  ('smtp', 'host',       '<<SMTP_HOST>>',        'e.g. smtp.sendgrid.net / smtp.resend.com', false, true),
  ('smtp', 'port',       '587',                  '587 for STARTTLS, 465 for SSL',            false, true),
  ('smtp', 'username',   '<<SMTP_USERNAME>>',    'e.g. apikey (SendGrid) or your email',     false, true),
  ('smtp', 'password',   '<<SMTP_PASSWORD>>',    'SMTP password or API key',                 true,  true),
  ('smtp', 'from_name',  'NurseCare+',           'Sender name shown in inbox',               false, true),
  ('smtp', 'from_email', '<<FROM_EMAIL>>',       'e.g. no-reply@nursecare.sa',               false, true),
  ('smtp', 'use_ssl',    'true',                 'true=SSL/TLS, false=STARTTLS',             false, true),
  ('smtp', 'enabled',    'false',                'Set true to enable SMTP email',            false, true)
ON CONFLICT (category, key_name) DO UPDATE
  SET key_value  = EXCLUDED.key_value,
      is_active  = EXCLUDED.is_active,
      updated_at = now();


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. GENERAL / INTERNAL
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO developer_settings (category, key_name, key_value, description, is_sensitive, is_active)
VALUES
  ('general', 'openai_api_key',     '<<OPENAI_API_KEY_sk_>>',         'OpenAI key if using AI features',         true,  true),
  ('general', 'webhook_url',        'https://your-vercel-domain.vercel.app/api/webhooks', 'Incoming webhook endpoint', false, true),
  ('general', 'cron_secret',        '<<CRON_SECRET_STRONG_RANDOM>>',  'Random strong secret for cron auth',      true,  true),
  ('general', 'internal_app_token', '<<INTERNAL_TOKEN_RANDOM>>',      'Service-to-service token',                true,  true)
ON CONFLICT (category, key_name) DO UPDATE
  SET key_value  = EXCLUDED.key_value,
      is_active  = EXCLUDED.is_active,
      updated_at = now();


-- ── Verify: see all rows ──────────────────────────────────────────────────────
SELECT
  category,
  key_name,
  CASE WHEN is_sensitive THEN '••••••' ELSE key_value END AS value_preview,
  is_active,
  updated_at
FROM developer_settings
ORDER BY category, key_name;
