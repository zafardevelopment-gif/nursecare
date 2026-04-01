'use client'

import { useState, useTransition, useRef } from 'react'
import { savePlatformSettings, uploadLogo } from './actions'

interface Settings {
  platform_name?: string
  logo_url?: string | null
  default_commission?: number
  vat_rate?: number
  free_cancellation_hours?: number
  auto_complete_hours?: number
  allow_emergency_bookings?: boolean
  email_notifications?: boolean
  whatsapp_notifications?: boolean
  sms_notifications?: boolean
  chat_enabled?: boolean
}

export default function SettingsForm({ settings }: { settings: Settings | null }) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const [emergencyBookings, setEmergencyBookings] = useState(settings?.allow_emergency_bookings ?? true)
  const [chatEnabled, setChatEnabled] = useState(settings?.chat_enabled ?? true)
  const [email, setEmail]       = useState(settings?.email_notifications ?? true)
  const [whatsapp, setWhatsapp] = useState(settings?.whatsapp_notifications ?? false)
  const [sms, setSms]           = useState(settings?.sms_notifications ?? true)

  // Logo state
  const [logoUrl, setLogoUrl]         = useState<string | null>(settings?.logo_url ?? null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('allow_emergency_bookings', String(emergencyBookings))
    fd.set('chat_enabled',             String(chatEnabled))
    fd.set('email_notifications',      String(email))
    fd.set('whatsapp_notifications',   String(whatsapp))
    fd.set('sms_notifications',        String(sms))
    if (logoUrl) fd.set('logo_url', logoUrl)

    startTransition(async () => {
      await savePlatformSettings(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError(null)

    // Client-side pre-validation
    if (file.size > 512 * 1024) { setLogoError('File too large. Max 512 KB.'); return }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setLogoError('Only PNG, JPG, or WebP allowed.'); return }

    setLogoUploading(true)
    const fd = new FormData()
    fd.append('logo', file)
    const result = await uploadLogo(fd)
    setLogoUploading(false)

    if (result.error) { setLogoError(result.error); return }
    if (result.url) setLogoUrl(result.url)
  }

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Platform Settings</span>
        {saved && <span style={{ fontSize: '0.75rem', color: '#27A869', fontWeight: 600 }}>✓ Saved</span>}
      </div>
      <div className="dash-card-body">
        <form onSubmit={handleSubmit}>

          {/* ── Logo Upload ── */}
          <SettingRow
            label="Platform Logo"
            description="PNG, JPG or WebP · max 512 KB · displayed at 40×40 px in header"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {logoUrl
                ? <img src={logoUrl} alt="logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--border)', background: '#f9f9f9' }} />
                : <div style={{ width: 40, height: 40, borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: 'var(--cream)', color: 'var(--muted)' }}>🏥</div>
              }
              <div>
                <button
                  type="button"
                  disabled={logoUploading}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--cream)', fontSize: '0.8rem', fontWeight: 600, cursor: logoUploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', color: 'var(--teal)' }}
                >
                  {logoUploading ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleLogoChange} />
                {logoError && <div style={{ fontSize: '0.72rem', color: '#E53E3E', marginTop: 4 }}>{logoError}</div>}
              </div>
            </div>
          </SettingRow>

          <SettingRow
            label="Platform Name"
            description="Displayed in header and emails"
          >
            <input
              type="text"
              name="platform_name"
              defaultValue={settings?.platform_name ?? 'NurseCare+'}
              style={inputStyle}
            />
          </SettingRow>

          <SettingRow
            label="Default Commission (%)"
            description="Applied to all new professions"
          >
            <NumberInput name="default_commission" defaultValue={settings?.default_commission ?? 10} unit="%" />
          </SettingRow>

          <SettingRow
            label="VAT Rate (%)"
            description="Saudi ZATCA compliant"
          >
            <NumberInput name="vat_rate" defaultValue={settings?.vat_rate ?? 15} unit="%" />
          </SettingRow>

          <SettingRow
            label="Free Cancellation Window"
            description={
              <>
                Hours before booking start time within which patient can cancel <strong>for free</strong>.
                After this window, cancellation fee applies.
                <br />
                <span style={{ color: 'var(--teal)' }}>e.g. 24 hrs → cancel by 8 AM for 8 AM next-day booking</span>
              </>
            }
          >
            <NumberInput name="free_cancellation_hours" defaultValue={settings?.free_cancellation_hours ?? 24} unit="hours" />
          </SettingRow>

          <SettingRow
            label="Auto-complete Booking"
            description={
              <>
                Hours after booking end time before the system <strong>auto-marks it complete</strong> if the patient hasn't done so manually.
                Triggers automatic payout to provider.
                <br />
                <span style={{ color: 'var(--teal)' }}>e.g. 24 hrs → booking ending at 5 PM auto-completes at 5 PM next day</span>
              </>
            }
          >
            <NumberInput name="auto_complete_hours" defaultValue={settings?.auto_complete_hours ?? 24} unit="hours" />
          </SettingRow>

          <SettingRow label="Allow Emergency Bookings" description="Patients can request same-day urgent bookings">
            <Toggle checked={emergencyBookings} onChange={setEmergencyBookings} />
          </SettingRow>

          <div style={{ marginTop: '1rem', marginBottom: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Chat &amp; Messaging
          </div>

          <SettingRow
            label="Enable Chat Feature"
            description={
              <>
                Allow nurses, patients, and hospitals to message each other.
                <br />
                <span style={{ color: chatEnabled ? 'var(--teal)' : '#E04A4A', fontWeight: 600 }}>
                  {chatEnabled ? '✓ Chat is currently ON for all users' : '✕ Chat is currently DISABLED for all users'}
                </span>
              </>
            }
          >
            <Toggle checked={chatEnabled} onChange={setChatEnabled} />
          </SettingRow>

          <div style={{ marginTop: '1rem', marginBottom: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Notifications
          </div>

          <SettingRow label="Email Notifications" description="Booking confirmations, reminders, and status updates via email">
            <Toggle checked={email} onChange={setEmail} />
          </SettingRow>

          <SettingRow label="WhatsApp Notifications" description="Send booking alerts via WhatsApp Business API">
            <Toggle checked={whatsapp} onChange={setWhatsapp} />
          </SettingRow>

          <SettingRow label="SMS Notifications" description="Send booking alerts via SMS" last>
            <Toggle checked={sms} onChange={setSms} />
          </SettingRow>

          <button
            type="submit"
            disabled={pending}
            style={{
              marginTop: '1.2rem',
              background: 'var(--teal)', color: '#fff',
              border: 'none', padding: '9px 24px',
              borderRadius: '9px', fontSize: '0.88rem',
              fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────── */

function SettingRow({ label, description, children, last }: {
  label: string
  description?: React.ReactNode
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: '1rem', padding: '0.85rem 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</div>
        {description && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '3px', lineHeight: 1.5 }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0, paddingTop: 2 }}>{children}</div>
    </div>
  )
}

function NumberInput({ name, defaultValue, unit }: { name: string; defaultValue: number; unit: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        min="0"
        step="0.01"
        style={{ ...inputStyle, width: '80px', textAlign: 'center' }}
      />
      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{unit}</span>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 48, height: 26, borderRadius: 13, border: 'none',
        background: checked ? '#27A869' : '#CBD5E0',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 24 : 3,
        width: 20, height: 20,
        borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', borderRadius: '8px',
  border: '1px solid var(--border)', fontSize: '0.85rem',
  fontFamily: 'inherit', background: 'var(--cream)',
  width: '160px',
}
