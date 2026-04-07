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
  min_booking_hours?: number
  allow_emergency_bookings?: boolean
  require_work_start_confirmation?: boolean
  require_work_completion_confirmation?: boolean
  work_start_enable_hours_before?: number
  email_notifications?: boolean
  whatsapp_notifications?: boolean
  sms_notifications?: boolean
  chat_enabled?: boolean
}

type Tab = 'general' | 'provider' | 'patient' | 'hospital'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'general',  label: 'General',  icon: '⚙️' },
  { key: 'provider', label: 'Provider', icon: '👩‍⚕️' },
  { key: 'patient',  label: 'Patient',  icon: '🏥' },
  { key: 'hospital', label: 'Hospital', icon: '🏨' },
]

export default function SettingsForm({ settings }: { settings: Settings | null }) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const [emergencyBookings, setEmergencyBookings] = useState(settings?.allow_emergency_bookings ?? true)
  const [requireWorkStart, setRequireWorkStart]   = useState(settings?.require_work_start_confirmation ?? true)
  const [requireWorkDone, setRequireWorkDone]     = useState(settings?.require_work_completion_confirmation ?? true)
  const [chatEnabled, setChatEnabled] = useState(settings?.chat_enabled ?? true)
  const [email, setEmail]       = useState(settings?.email_notifications ?? true)
  const [whatsapp, setWhatsapp] = useState(settings?.whatsapp_notifications ?? false)
  const [sms, setSms]           = useState(settings?.sms_notifications ?? true)

  const [logoUrl, setLogoUrl]             = useState<string | null>(settings?.logo_url ?? null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError]         = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('allow_emergency_bookings',             String(emergencyBookings))
    fd.set('require_work_start_confirmation',       String(requireWorkStart))
    fd.set('require_work_completion_confirmation',  String(requireWorkDone))
    fd.set('chat_enabled',                          String(chatEnabled))
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
    <form onSubmit={handleSubmit}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '9px 18px', borderRadius: 10, border: activeTab === tab.key ? 'none' : '1px solid var(--border)',
              background: activeTab === tab.key ? 'var(--teal)' : 'var(--cream)',
              color: activeTab === tab.key ? '#fff' : 'var(--muted)',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: activeTab === tab.key ? '0 2px 10px rgba(14,123,140,0.25)' : 'none',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && <span style={{ fontSize: '0.78rem', color: '#27A869', fontWeight: 700 }}>✓ Saved successfully</span>}
          <button
            type="submit"
            disabled={pending}
            style={{
              background: 'var(--teal)', color: '#fff', border: 'none',
              padding: '9px 24px', borderRadius: 9, fontSize: '0.85rem',
              fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Saving…' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      {/* ── GENERAL TAB ── */}
      {activeTab === 'general' && (
        <div className="dash-card">
          <SectionHeader icon="🏢" title="Platform Identity" sub="Branding and display settings" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow label="Platform Logo" description="PNG, JPG or WebP · max 512 KB · displayed at 40×40 px in header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {logoUrl
                  ? <img src={logoUrl} alt="logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--border)', background: '#f9f9f9' }} />
                  : <div style={{ width: 40, height: 40, borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: 'var(--cream)', color: 'var(--muted)' }}>🏥</div>
                }
                <div>
                  <button type="button" disabled={logoUploading} onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--cream)', fontSize: '0.8rem', fontWeight: 600, cursor: logoUploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', color: 'var(--teal)' }}>
                    {logoUploading ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleLogoChange} />
                  {logoError && <div style={{ fontSize: '0.72rem', color: '#E53E3E', marginTop: 4 }}>{logoError}</div>}
                </div>
              </div>
            </SettingRow>
            <SettingRow label="Platform Name" description="Displayed in header and emails">
              <input type="text" name="platform_name" defaultValue={settings?.platform_name ?? 'NurseCare+'} style={inputStyle} />
            </SettingRow>
          </div>

          <SectionHeader icon="💰" title="Billing & Rates" sub="Commission, VAT, and pricing rules" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow label="Default Commission (%)" description="Platform commission applied on top of nurse's hourly rate for patients">
              <NumberInput name="default_commission" defaultValue={settings?.default_commission ?? 10} unit="%" />
            </SettingRow>
            <SettingRow label="VAT Rate (%)" description="Saudi ZATCA compliant — applied to total booking amount">
              <NumberInput name="vat_rate" defaultValue={settings?.vat_rate ?? 15} unit="%" />
            </SettingRow>
          </div>

          <SectionHeader icon="🔔" title="Notifications" sub="Control how users receive alerts and updates" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow label="Email Notifications" description="Booking confirmations, reminders, and status updates via email">
              <Toggle checked={email} onChange={setEmail} />
            </SettingRow>
            <SettingRow label="WhatsApp Notifications" description="Send booking alerts via WhatsApp Business API">
              <Toggle checked={whatsapp} onChange={setWhatsapp} />
            </SettingRow>
            <SettingRow label="SMS Notifications" description="Send booking alerts via SMS" last>
              <Toggle checked={sms} onChange={setSms} />
            </SettingRow>
          </div>
        </div>
      )}

      {/* ── PROVIDER TAB ── */}
      {activeTab === 'provider' && (
        <div className="dash-card">
          <SectionHeader icon="🏃" title="Work Confirmation Flow" sub="Control how nurses mark work start and completion" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow
              label="Require Work Started Confirmation"
              description={
                <>
                  Nurse must tap <strong>"Mark Work Started"</strong> when they arrive at patient location.
                  <br />
                  <span style={{ color: 'var(--teal)' }}>Booking status changes to <strong>In Progress</strong> — only nurse can trigger this.</span>
                </>
              }
            >
              <Toggle checked={requireWorkStart} onChange={setRequireWorkStart} />
            </SettingRow>

            <SettingRow
              label="Enable Work Start — Hours Before"
              description={
                <>
                  How many hours <strong>before</strong> the booking's start time the nurse can tap "Mark Work Started".
                  <br />
                  <span style={{ color: 'var(--teal)' }}>e.g. 1 hr → button unlocks 1 hour before the shift begins. 0 = only on exact start time.</span>
                </>
              }
            >
              <NumberInput name="work_start_enable_hours_before" defaultValue={settings?.work_start_enable_hours_before ?? 1} unit="hrs before" />
            </SettingRow>

            <SettingRow
              label="Require Work Completion Confirmation"
              description={
                <>
                  Nurse marks <strong>"Work Done"</strong>, then patient must tap <strong>"Confirm Completion"</strong> to release payment.
                  <br />
                  <span style={{ color: requireWorkDone ? 'var(--teal)' : '#E04A4A', fontWeight: 600 }}>
                    {requireWorkDone
                      ? '✓ Both parties must confirm — payment releases after patient confirms'
                      : '✕ Only nurse confirmation needed — payment releases automatically'}
                  </span>
                </>
              }
              last
            >
              <Toggle checked={requireWorkDone} onChange={setRequireWorkDone} />
            </SettingRow>
          </div>

          <SectionHeader icon="💬" title="Communication" sub="Chat and messaging features for providers" />
          <div style={{ padding: '0 1.2rem' }}>
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
              last
            >
              <Toggle checked={chatEnabled} onChange={setChatEnabled} />
            </SettingRow>
          </div>
        </div>
      )}

      {/* ── PATIENT TAB ── */}
      {activeTab === 'patient' && (
        <div className="dash-card">
          <SectionHeader icon="📅" title="Booking Rules" sub="Control how patients can create and manage bookings" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow
              label="Minimum Booking Hours"
              description={
                <>
                  Minimum hours a patient must book per session.
                  <br />
                  <span style={{ color: 'var(--teal)' }}>e.g. 3 hrs → patient cannot book less than 3 hours per shift</span>
                </>
              }
            >
              <NumberInput name="min_booking_hours" defaultValue={settings?.min_booking_hours ?? 2} unit="hours" />
            </SettingRow>

            <SettingRow
              label="Allow Emergency Bookings"
              description="Patients can request same-day urgent bookings outside regular scheduling"
            >
              <Toggle checked={emergencyBookings} onChange={setEmergencyBookings} />
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
                  Hours after booking end time before the system <strong>auto-marks it complete</strong> if patient hasn't confirmed manually.
                  Triggers automatic payout to provider.
                  <br />
                  <span style={{ color: 'var(--teal)' }}>e.g. 24 hrs → booking ending at 5 PM auto-completes at 5 PM next day</span>
                </>
              }
              last
            >
              <NumberInput name="auto_complete_hours" defaultValue={settings?.auto_complete_hours ?? 24} unit="hours" />
            </SettingRow>
          </div>
        </div>
      )}

      {/* ── HOSPITAL TAB ── */}
      {activeTab === 'hospital' && (
        <div className="dash-card">
          <SectionHeader icon="🏨" title="Hospital Settings" sub="Configuration for hospital and institutional clients" />
          <div style={{ padding: '0 1.2rem 1.2rem' }}>
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏨</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', marginBottom: 6 }}>Hospital Module</div>
              <div style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
                Hospital-specific settings such as ward management, bulk booking rules,<br />
                and institutional billing will appear here once the hospital module is enabled.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden inputs for toggles that aren't in active tab — ensure they always submit */}
      <input type="hidden" name="allow_emergency_bookings"             value={String(emergencyBookings)} />
      <input type="hidden" name="require_work_start_confirmation"       value={String(requireWorkStart)} />
      <input type="hidden" name="require_work_completion_confirmation"  value={String(requireWorkDone)} />
      <input type="hidden" name="chat_enabled"                          value={String(chatEnabled)} />
      <input type="hidden" name="email_notifications"                   value={String(email)} />
      <input type="hidden" name="whatsapp_notifications"                value={String(whatsapp)} />
      <input type="hidden" name="sms_notifications"                     value={String(sms)} />
    </form>
  )
}

/* ── Sub-components ──────────────────────────────────────────────── */

function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ padding: '1rem 1.2rem 0.6rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(14,123,140,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>{title}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  )
}

function SettingRow({ label, description, children, last }: {
  label: string
  description?: React.ReactNode
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: '1rem', padding: '0.9rem 0',
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
        step="1"
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
