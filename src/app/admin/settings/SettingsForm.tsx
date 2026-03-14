'use client'

import { useState, useTransition } from 'react'
import { savePlatformSettings } from './actions'

interface Settings {
  platform_name?: string
  default_commission?: number
  vat_rate?: number
  free_cancellation_hours?: number
  auto_complete_hours?: number
  allow_emergency_bookings?: boolean
  whatsapp_notifications?: boolean
  sms_notifications?: boolean
}

export default function SettingsForm({ settings }: { settings: Settings | null }) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const [emergencyBookings, setEmergencyBookings] = useState(settings?.allow_emergency_bookings ?? true)
  const [whatsapp, setWhatsapp]                   = useState(settings?.whatsapp_notifications ?? false)
  const [sms, setSms]                             = useState(settings?.sms_notifications ?? true)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    // Inject toggle values (checkboxes don't submit when unchecked)
    fd.set('allow_emergency_bookings', String(emergencyBookings))
    fd.set('whatsapp_notifications',   String(whatsapp))
    fd.set('sms_notifications',        String(sms))

    startTransition(async () => {
      await savePlatformSettings(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Platform Settings</span>
        {saved && <span style={{ fontSize: '0.75rem', color: '#27A869', fontWeight: 600 }}>✓ Saved</span>}
      </div>
      <div className="dash-card-body">
        <form onSubmit={handleSubmit}>

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
            description="Hours before booking start"
          >
            <NumberInput name="free_cancellation_hours" defaultValue={settings?.free_cancellation_hours ?? 24} unit="hours" />
          </SettingRow>

          <SettingRow
            label="Auto-complete Booking"
            description="If patient doesn't mark complete"
          >
            <NumberInput name="auto_complete_hours" defaultValue={settings?.auto_complete_hours ?? 24} unit="hours" />
          </SettingRow>

          <SettingRow label="Allow Emergency Bookings">
            <Toggle checked={emergencyBookings} onChange={setEmergencyBookings} />
          </SettingRow>

          <SettingRow label="WhatsApp Notifications">
            <Toggle checked={whatsapp} onChange={setWhatsapp} />
          </SettingRow>

          <SettingRow label="SMS Notifications" last>
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
  description?: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '1rem', padding: '0.85rem 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</div>
        {description && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1px' }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
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
