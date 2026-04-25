/**
 * Seed script: populate developer_settings table from existing .env.local values.
 *
 * Run with:
 *   node scripts/seed-developer-settings.mjs
 *
 * Requires Node 18+ (uses native fetch + fs.readFileSync).
 * Reads .env.local automatically — no extra packages needed.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── Parse .env.local ──────────────────────────────────────────────────────────
function loadEnv() {
  const envFile = resolve(root, '.env.local')
  if (!existsSync(envFile)) return {}
  const env = {}
  const lines = readFileSync(envFile, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

const env = loadEnv()

const SUPABASE_URL  = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY   = env['SUPABASE_SERVICE_ROLE_KEY']
const MAPS_KEY      = env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'] ?? ''
const APP_URL       = env['NEXT_PUBLIC_APP_URL'] ?? ''

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  process.exit(1)
}

// ── Supabase REST helpers ─────────────────────────────────────────────────────

const headers = {
  'apikey':        SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=representation',
}

async function select(category, key_name) {
  const url = `${SUPABASE_URL}/rest/v1/developer_settings?category=eq.${encodeURIComponent(category)}&key_name=eq.${encodeURIComponent(key_name)}&select=id,key_value`
  const res = await fetch(url, { headers })
  const data = await res.json()
  return Array.isArray(data) ? data[0] : null
}

async function update(id, fields) {
  const url = `${SUPABASE_URL}/rest/v1/developer_settings?id=eq.${id}`
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(fields) })
  if (!res.ok) { const t = await res.text(); throw new Error(t) }
}

async function insert(row) {
  const url = `${SUPABASE_URL}/rest/v1/developer_settings`
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(row) })
  if (!res.ok) { const t = await res.text(); throw new Error(t) }
}

// ── Seed rows ─────────────────────────────────────────────────────────────────
// Format: [category, key_name, value, description, is_sensitive]

const seeds = [
  // Google Maps — key already in env
  ['maps', 'maps_api_key',      MAPS_KEY,  'Google Maps JavaScript API key',                            true ],
  ['maps', 'places_api_key',    MAPS_KEY,  'Google Places API key (same key if using multi-purpose)',   true ],
  ['maps', 'geocoding_enabled', 'false',   'Enable geocoding features',                                 false],
  ['maps', 'enabled',           MAPS_KEY ? 'true' : 'false', 'Enable Google Maps integration',         false],

  // General
  ['general', 'webhook_url',        APP_URL ? `${APP_URL}/api/webhooks` : '', 'Internal webhook receiver URL',   false],
  ['general', 'openai_api_key',     '', 'OpenAI API key (sk-...)',                                              true ],
  ['general', 'cron_secret',        '', 'Bearer token to authorize cron job calls',                            true ],
  ['general', 'internal_app_token', '', 'Service-to-service authorization token',                             true ],

  // WhatsApp
  ['whatsapp', 'provider_name',        '',    'Meta / Twilio / WATI / 360dialog / Custom',     false],
  ['whatsapp', 'api_url',              '',    'WhatsApp API endpoint URL',                      false],
  ['whatsapp', 'access_token',         '',    'Bearer token for API authentication',            true ],
  ['whatsapp', 'phone_number_id',      '',    'Meta Phone Number ID',                           false],
  ['whatsapp', 'business_account_id',  '',    'Meta Business Account ID',                       false],
  ['whatsapp', 'webhook_verify_token', '',    'Token to verify incoming webhooks from Meta',    true ],
  ['whatsapp', 'webhook_secret',       '',    'HMAC secret for webhook payload verification',   true ],
  ['whatsapp', 'default_country_code', '966', 'Default country code (without +)',               false],
  ['whatsapp', 'test_number',          '',    'Phone number for connection test',                false],
  ['whatsapp', 'enabled',              'false','Enable WhatsApp notifications globally',        false],

  // Moyasar
  ['moyasar', 'publishable_key', '', 'Moyasar publishable key (pk_)',                           false],
  ['moyasar', 'secret_key',      '', 'Moyasar secret key (sk_)',                                true ],
  ['moyasar', 'callback_url',    APP_URL ? `${APP_URL}/api/payment/callback` : '', 'Payment callback URL', false],
  ['moyasar', 'webhook_secret',  '', 'Webhook signing secret from Moyasar',                    true ],
  ['moyasar', 'currency',        'SAR',  'Payment currency',                                   false],
  ['moyasar', 'sandbox_mode',    'true', 'true = sandbox, false = live',                       false],
  ['moyasar', 'enabled',         'false','Enable Moyasar payment gateway',                     false],

  // SMS
  ['sms', 'provider_name', '',          'SMS provider name (e.g. Unifonic, Twilio)',            false],
  ['sms', 'api_key',        '',         'API key for SMS provider',                             true ],
  ['sms', 'sender_id',      'NurseCare','Sender ID / alphanumeric name',                        false],
  ['sms', 'enabled',        'false',    'Enable SMS notifications',                             false],

  // SMTP
  ['smtp', 'host',       '',          'SMTP server hostname',                false],
  ['smtp', 'port',       '587',       'SMTP port',                           false],
  ['smtp', 'username',   '',          'SMTP username / email',               false],
  ['smtp', 'password',   '',          'SMTP password',                       true ],
  ['smtp', 'from_name',  'NurseCare+','Sender display name',                 false],
  ['smtp', 'from_email', '',          'From email address',                  false],
  ['smtp', 'use_ssl',    'true',      'true = SSL/TLS, false = STARTTLS',    false],
  ['smtp', 'enabled',    'false',     'Enable email via SMTP',               false],
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔗  ${SUPABASE_URL}`)
  console.log(`📦  Seeding ${seeds.length} developer settings rows...\n`)

  let updated = 0, skipped = 0, errors = 0

  for (const [category, key_name, key_value, description, is_sensitive] of seeds) {
    try {
      const existing = await select(category, key_name)

      if (existing) {
        if (existing.key_value === '' && key_value !== '') {
          await update(existing.id, { key_value, description, is_sensitive })
          const masked = is_sensitive ? '***' : key_value
          console.log(`  ✅  [${category}] ${key_name} = ${masked}`)
          updated++
        } else {
          console.log(`  ⏭   [${category}] ${key_name} — skipped (already has value)`)
          skipped++
        }
      } else {
        await insert({ category, key_name, key_value, description, is_sensitive, is_active: true })
        const masked = is_sensitive ? '***' : key_value
        console.log(`  ➕  [${category}] ${key_name} = ${masked} (inserted)`)
        updated++
      }
    } catch (err) {
      console.error(`  ❌  [${category}] ${key_name}: ${err.message}`)
      errors++
    }
  }

  console.log(`\n─────────────────────────────────`)
  console.log(`✅  Updated : ${updated}`)
  console.log(`⏭   Skipped : ${skipped}`)
  console.log(`❌  Errors  : ${errors}`)
  console.log(`─────────────────────────────────\n`)

  if (errors > 0) process.exit(1)
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
