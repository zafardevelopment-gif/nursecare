'use client'

import { useState, useTransition } from 'react'
import { saveDeveloperSettings } from './developerActions'
import type { DeveloperSettingsMap } from '@/lib/developer-settings'

/* ── Types ──────────────────────────────────────────────────────────── */

type SubTab = 'whatsapp' | 'moyasar' | 'sms' | 'smtp' | 'maps' | 'general'

const SUB_TABS: { key: SubTab; icon: string; label: string }[] = [
  { key: 'whatsapp', icon: '💬', label: 'WhatsApp' },
  { key: 'moyasar',  icon: '💳', label: 'Moyasar'  },
  { key: 'sms',      icon: '📱', label: 'SMS'       },
  { key: 'smtp',     icon: '📧', label: 'Email SMTP'},
  { key: 'maps',     icon: '🗺️',  label: 'Maps'     },
  { key: 'general',  icon: '🔑', label: 'General'   },
]

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getVal(map: DeveloperSettingsMap, cat: string, key: string, fallback = ''): string {
  return map[cat]?.[key]?.key_value ?? fallback
}

function isSensitive(map: DeveloperSettingsMap, cat: string, key: string): boolean {
  return map[cat]?.[key]?.is_sensitive ?? false
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function FieldLabel({ label, description, required }: { label: string; description?: string; required?: boolean }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--ink)' }}>
        {label}
        {required && <span style={{ color: '#E04A4A', marginLeft: 3 }}>*</span>}
      </span>
      {description && (
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1, lineHeight: 1.4 }}>{description}</div>
      )}
    </div>
  )
}

function SecretInput({ name, defaultValue, placeholder }: { name: string; defaultValue: string; placeholder?: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        name={name}
        type={revealed ? 'text' : 'password'}
        defaultValue={defaultValue}
        placeholder={placeholder ?? '••••••••'}
        autoComplete="new-password"
        style={{ ...fieldStyle, paddingRight: 60, width: '100%' }}
      />
      <button
        type="button"
        onClick={() => setRevealed(r => !r)}
        style={{
          position: 'absolute', right: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)',
          fontFamily: 'inherit', padding: '2px 4px',
        }}
      >
        {revealed ? '🙈 Hide' : '👁 Show'}
      </button>
    </div>
  )
}

function Toggle2({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input type="hidden" name={name} value={on ? 'true' : 'false'} />
      <button
        type="button"
        onClick={() => setOn(v => !v)}
        style={{
          width: 48, height: 26, borderRadius: 13, border: 'none',
          background: on ? '#27A869' : '#CBD5E0',
          position: 'relative', cursor: 'pointer',
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3,
          left: on ? 24 : 3,
          width: 20, height: 20,
          borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: on ? '#27A869' : '#CBD5E0' }}>
        {on ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  )
}

function SectionDivider({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0.9rem 1.4rem 0.6rem',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(14,123,140,0.025)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(14,123,140,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.95rem', flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{title}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '1rem', padding: '1rem 1.4rem',
    }}>
      {children}
    </div>
  )
}

function Field({ label, description, required, children }: {
  label: string; description?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <FieldLabel label={label} description={description} required={required} />
      {children}
    </div>
  )
}

function SaveBar({ pending, saved, error }: { pending: boolean; saved: boolean; error: string | null }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      gap: 12, padding: '1rem 1.4rem',
      borderTop: '1px solid var(--border)',
      background: 'var(--cream)',
    }}>
      {error && (
        <span style={{ fontSize: '0.78rem', color: '#E04A4A', fontWeight: 700 }}>✗ {error}</span>
      )}
      {saved && !error && (
        <span style={{ fontSize: '0.78rem', color: '#27A869', fontWeight: 700 }}>✓ Saved successfully</span>
      )}
      <button
        type="submit"
        disabled={pending}
        style={{
          background: 'var(--teal)', color: '#fff', border: 'none',
          padding: '8px 22px', borderRadius: 9, fontSize: '0.83rem',
          fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? 'Saving…' : '💾 Save Section'}
      </button>
    </div>
  )
}

/* ── Section forms ───────────────────────────────────────────────────── */

function WhatsAppForm({ map }: { map: DeveloperSettingsMap }) {
  const cat = 'whatsapp'
  const [pending, startTransition] = useTransition()
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fields: Record<string, string> = {}
    for (const [k, v] of fd.entries()) fields[k] = v as string
    startTransition(async () => {
      setError(null)
      const res = await saveDeveloperSettings({ category: cat, fields })
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionDivider icon="💬" title="WhatsApp Business API" sub="Meta / Twilio / WATI / 360dialog credentials" />
      <FieldGrid>
        <Field label="Provider Name" description="Meta / Twilio / WATI / 360dialog / Custom">
          <input name="provider_name" type="text" defaultValue={getVal(map, cat, 'provider_name')} placeholder="e.g. Meta (Cloud API)" style={fieldStyle} />
        </Field>
        <Field label="API URL" description="Base endpoint for sending messages">
          <input name="api_url" type="text" defaultValue={getVal(map, cat, 'api_url')} placeholder="https://graph.facebook.com/v18.0" style={fieldStyle} />
        </Field>
        <Field label="Access Token" description="Bearer token for API calls" required>
          <SecretInput name="access_token" defaultValue={getVal(map, cat, 'access_token')} placeholder="EAABsz..." />
        </Field>
        <Field label="Phone Number ID" description="Meta phone number ID (not the phone number)">
          <input name="phone_number_id" type="text" defaultValue={getVal(map, cat, 'phone_number_id')} placeholder="1234567890" style={fieldStyle} />
        </Field>
        <Field label="Business Account ID" description="WhatsApp Business Account (WABA) ID">
          <input name="business_account_id" type="text" defaultValue={getVal(map, cat, 'business_account_id')} placeholder="9876543210" style={fieldStyle} />
        </Field>
        <Field label="Webhook Verify Token" description="Token sent by Meta to verify your webhook URL">
          <SecretInput name="webhook_verify_token" defaultValue={getVal(map, cat, 'webhook_verify_token')} placeholder="my_verify_secret" />
        </Field>
        <Field label="Webhook Secret" description="HMAC secret for payload signature verification">
          <SecretInput name="webhook_secret" defaultValue={getVal(map, cat, 'webhook_secret')} />
        </Field>
        <Field label="Default Country Code" description="Used when dialing without country prefix">
          <input name="default_country_code" type="text" defaultValue={getVal(map, cat, 'default_country_code', '966')} placeholder="966" style={{ ...fieldStyle, width: '100px' }} />
        </Field>
        <Field label="Test Message Number" description="Phone number for connection test (with country code, no +)">
          <input name="test_number" type="text" defaultValue={getVal(map, cat, 'test_number')} placeholder="966500000000" style={fieldStyle} />
        </Field>
      </FieldGrid>

      <div style={{ padding: '0 1.4rem 0.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Enable WhatsApp Notifications</span>
        <Toggle2 name="enabled" defaultChecked={getVal(map, cat, 'enabled') === 'true'} />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  )
}

function MoyasarForm({ map }: { map: DeveloperSettingsMap }) {
  const cat = 'moyasar'
  const [pending, startTransition] = useTransition()
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fields: Record<string, string> = {}
    for (const [k, v] of fd.entries()) fields[k] = v as string
    startTransition(async () => {
      setError(null)
      const res = await saveDeveloperSettings({ category: cat, fields })
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionDivider icon="💳" title="Moyasar Payment Gateway" sub="Saudi payment gateway credentials and configuration" />
      <FieldGrid>
        <Field label="Publishable Key" description="Used client-side for payment forms">
          <input name="publishable_key" type="text" defaultValue={getVal(map, cat, 'publishable_key')} placeholder="pk_test_..." style={fieldStyle} />
        </Field>
        <Field label="Secret Key" description="Used server-side for payment operations" required>
          <SecretInput name="secret_key" defaultValue={getVal(map, cat, 'secret_key')} placeholder="sk_test_..." />
        </Field>
        <Field label="Callback URL" description="URL Moyasar redirects to after payment">
          <input name="callback_url" type="text" defaultValue={getVal(map, cat, 'callback_url')} placeholder="https://yourdomain.com/payment/callback" style={fieldStyle} />
        </Field>
        <Field label="Webhook Secret" description="Secret to verify Moyasar webhook payloads">
          <SecretInput name="webhook_secret" defaultValue={getVal(map, cat, 'webhook_secret')} />
        </Field>
        <Field label="Currency" description="3-letter ISO currency code">
          <input name="currency" type="text" defaultValue={getVal(map, cat, 'currency', 'SAR')} placeholder="SAR" style={{ ...fieldStyle, width: '100px' }} />
        </Field>
      </FieldGrid>

      <div style={{ padding: '0 1.4rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Sandbox Mode</span>
          <Toggle2 name="sandbox_mode" defaultChecked={getVal(map, cat, 'sandbox_mode', 'true') === 'true'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Enable Moyasar</span>
          <Toggle2 name="enabled" defaultChecked={getVal(map, cat, 'enabled') === 'true'} />
        </div>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  )
}

function SmsForm({ map }: { map: DeveloperSettingsMap }) {
  const cat = 'sms'
  const [pending, startTransition] = useTransition()
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fields: Record<string, string> = {}
    for (const [k, v] of fd.entries()) fields[k] = v as string
    startTransition(async () => {
      setError(null)
      const res = await saveDeveloperSettings({ category: cat, fields })
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionDivider icon="📱" title="SMS Provider" sub="SMS gateway credentials for text message notifications" />
      <FieldGrid>
        <Field label="Provider Name" description="e.g. Unifonic, Twilio, Taqnyat, Msegat">
          <input name="provider_name" type="text" defaultValue={getVal(map, cat, 'provider_name')} placeholder="Unifonic" style={fieldStyle} />
        </Field>
        <Field label="API Key" description="Provider API key or authentication token" required>
          <SecretInput name="api_key" defaultValue={getVal(map, cat, 'api_key')} />
        </Field>
        <Field label="Sender ID" description="Alphanumeric sender name (max 11 characters)">
          <input name="sender_id" type="text" defaultValue={getVal(map, cat, 'sender_id')} placeholder="NurseCare" style={{ ...fieldStyle, width: '180px' }} maxLength={11} />
        </Field>
      </FieldGrid>

      <div style={{ padding: '0 1.4rem 0.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Enable SMS Notifications</span>
        <Toggle2 name="enabled" defaultChecked={getVal(map, cat, 'enabled') === 'true'} />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  )
}

function SmtpForm({ map }: { map: DeveloperSettingsMap }) {
  const cat = 'smtp'
  const [pending, startTransition] = useTransition()
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fields: Record<string, string> = {}
    for (const [k, v] of fd.entries()) fields[k] = v as string
    startTransition(async () => {
      setError(null)
      const res = await saveDeveloperSettings({ category: cat, fields })
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionDivider icon="📧" title="Email SMTP" sub="Outbound email server configuration" />
      <FieldGrid>
        <Field label="SMTP Host" description="Hostname of your mail server" required>
          <input name="host" type="text" defaultValue={getVal(map, cat, 'host')} placeholder="smtp.sendgrid.net" style={fieldStyle} />
        </Field>
        <Field label="Port" description="587 (STARTTLS) · 465 (SSL) · 25 (plain)">
          <input name="port" type="number" defaultValue={getVal(map, cat, 'port', '587')} placeholder="587" style={{ ...fieldStyle, width: '100px' }} />
        </Field>
        <Field label="Username" description="SMTP authentication username or email">
          <input name="username" type="text" defaultValue={getVal(map, cat, 'username')} placeholder="apikey or email@domain.com" style={fieldStyle} />
        </Field>
        <Field label="Password / API Key" description="SMTP password or API key" required>
          <SecretInput name="password" defaultValue={getVal(map, cat, 'password')} />
        </Field>
        <Field label="From Name" description="Display name shown in recipient's inbox">
          <input name="from_name" type="text" defaultValue={getVal(map, cat, 'from_name', 'NurseCare+')} placeholder="NurseCare+" style={fieldStyle} />
        </Field>
        <Field label="From Email" description="Sender email address" required>
          <input name="from_email" type="email" defaultValue={getVal(map, cat, 'from_email')} placeholder="no-reply@nursecare.sa" style={fieldStyle} />
        </Field>
      </FieldGrid>

      <div style={{ padding: '0 1.4rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Use SSL/TLS</span>
          <Toggle2 name="use_ssl" defaultChecked={getVal(map, cat, 'use_ssl', 'true') === 'true'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Enable Email via SMTP</span>
          <Toggle2 name="enabled" defaultChecked={getVal(map, cat, 'enabled') === 'true'} />
        </div>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  )
}

function MapsForm({ map }: { map: DeveloperSettingsMap }) {
  const cat = 'maps'
  const [pending, startTransition] = useTransition()
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fields: Record<string, string> = {}
    for (const [k, v] of fd.entries()) fields[k] = v as string
    startTransition(async () => {
      setError(null)
      const res = await saveDeveloperSettings({ category: cat, fields })
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionDivider icon="🗺️" title="Google Maps / Location" sub="Mapping, places search, and geocoding API keys" />
      <FieldGrid>
        <Field label="Maps JavaScript API Key" description="Used to render interactive maps" required>
          <SecretInput name="maps_api_key" defaultValue={getVal(map, cat, 'maps_api_key')} placeholder="AIzaSy..." />
        </Field>
        <Field label="Places API Key" description="Used for address autocomplete search">
          <SecretInput name="places_api_key" defaultValue={getVal(map, cat, 'places_api_key')} placeholder="AIzaSy..." />
        </Field>
      </FieldGrid>

      <div style={{ padding: '0 1.4rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Enable Geocoding</span>
          <Toggle2 name="geocoding_enabled" defaultChecked={getVal(map, cat, 'geocoding_enabled') === 'true'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Enable Google Maps</span>
          <Toggle2 name="enabled" defaultChecked={getVal(map, cat, 'enabled') === 'true'} />
        </div>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  )
}

function GeneralForm({ map }: { map: DeveloperSettingsMap }) {
  const cat = 'general'
  const [pending, startTransition] = useTransition()
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fields: Record<string, string> = {}
    for (const [k, v] of fd.entries()) fields[k] = v as string
    startTransition(async () => {
      setError(null)
      const res = await saveDeveloperSettings({ category: cat, fields })
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionDivider icon="🔑" title="General / Internal API Keys" sub="AI, webhooks, cron secrets, and internal tokens" />
      <FieldGrid>
        <Field label="OpenAI API Key" description="Used for AI-powered features (sk-...)">
          <SecretInput name="openai_api_key" defaultValue={getVal(map, cat, 'openai_api_key')} placeholder="sk-..." />
        </Field>
        <Field label="Webhook URL" description="Internal URL to receive incoming webhook events">
          <input name="webhook_url" type="text" defaultValue={getVal(map, cat, 'webhook_url')} placeholder="https://yourdomain.com/api/webhooks" style={fieldStyle} />
        </Field>
        <Field label="Cron Secret" description="Bearer token to authorize scheduled cron job calls" required>
          <SecretInput name="cron_secret" defaultValue={getVal(map, cat, 'cron_secret')} placeholder="cron_secret_..." />
        </Field>
        <Field label="Internal App Token" description="Service-to-service authorization token">
          <SecretInput name="internal_app_token" defaultValue={getVal(map, cat, 'internal_app_token')} />
        </Field>
      </FieldGrid>
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  )
}

/* ── Main Component ──────────────────────────────────────────────────── */

export default function DeveloperSettingsTab({ devSettings }: { devSettings: DeveloperSettingsMap }) {
  const [subTab, setSubTab] = useState<SubTab>('whatsapp')

  return (
    <div>
      {/* Warning banner */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        background: 'rgba(224,74,74,0.06)', border: '1.5px solid rgba(224,74,74,0.22)',
        borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem',
      }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#C53030' }}>
            Developer Use Only — Restricted Access
          </div>
          <div style={{ fontSize: '0.75rem', color: '#742A2A', marginTop: 3, lineHeight: 1.5 }}>
            Wrong values may break the live system. Only modify these settings if you know exactly what you are doing.
            All changes are permanently logged with your name and timestamp for audit purposes.
          </div>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSubTab(t.key)}
            style={{
              padding: '7px 14px', borderRadius: 9, border: subTab === t.key ? 'none' : '1px solid var(--border)',
              background: subTab === t.key ? '#7B2FBE' : 'var(--cream)',
              color: subTab === t.key ? '#fff' : 'var(--muted)',
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: subTab === t.key ? '0 2px 8px rgba(123,47,190,0.25)' : 'none',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Section panels */}
      <div className="dash-card" style={{ overflow: 'hidden' }}>
        {subTab === 'whatsapp' && <WhatsAppForm map={devSettings} />}
        {subTab === 'moyasar'  && <MoyasarForm  map={devSettings} />}
        {subTab === 'sms'      && <SmsForm      map={devSettings} />}
        {subTab === 'smtp'     && <SmtpForm     map={devSettings} />}
        {subTab === 'maps'     && <MapsForm     map={devSettings} />}
        {subTab === 'general'  && <GeneralForm  map={devSettings} />}
      </div>
    </div>
  )
}

/* ── Shared styles ───────────────────────────────────────────────────── */

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: '0.83rem',
  fontFamily: 'inherit', background: 'var(--cream)',
  boxSizing: 'border-box',
}
