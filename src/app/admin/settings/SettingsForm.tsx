'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { savePlatformSettings, uploadLogo } from './actions'

interface Settings {
  platform_name?: string
  logo_url?: string | null
  default_commission?: number
  vat_rate?: number
  free_cancellation_hours?: number
  auto_complete_hours?: number
  min_booking_hours?: number
  min_advance_hours?: number
  max_advance_days?: number
  payment_deadline_hours?: number
  allow_emergency_bookings?: boolean
  require_work_start_confirmation?: boolean
  require_work_completion_confirmation?: boolean
  work_start_enable_hours_before?: number
  email_notifications?: boolean
  whatsapp_notifications?: boolean
  sms_notifications?: boolean
  chat_enabled?: boolean
  share_provider_phone_with_patient?: boolean
  show_hospital_contracts?: boolean
  show_price_with_commission?: boolean
  require_nurse_approval?: boolean
  on_the_way_enabled?: boolean
  disputes_enabled?: boolean
  complaints_enabled?: boolean
  dispute_window_hours?: number
  complaint_window_hours?: number
}

type Tab = 'general' | 'provider' | 'patient' | 'hospital' | 'disputes' | 'developer'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'general',   label: 'General',   icon: '⚙️'  },
  { key: 'provider',  label: 'Provider',  icon: '👩‍⚕️' },
  { key: 'patient',   label: 'Patient',   icon: '🏥'  },
  { key: 'hospital',  label: 'Hospital',  icon: '🏨'  },
  { key: 'disputes',  label: 'Disputes',  icon: '⚖️'  },
  { key: 'developer', label: 'Developer', icon: '🔐'  },
]

export default function SettingsForm({
  settings,
  onTabChange,
  developerTabContent,
}: {
  settings: Settings | null
  onTabChange?: (tab: Tab) => void
  developerTabContent?: React.ReactNode
}) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('general')

  function handleTabClick(tab: Tab) {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  const [emergencyBookings, setEmergencyBookings] = useState(settings?.allow_emergency_bookings ?? true)
  const [requireWorkStart, setRequireWorkStart]   = useState(settings?.require_work_start_confirmation ?? true)
  const [requireWorkDone, setRequireWorkDone]     = useState(settings?.require_work_completion_confirmation ?? true)
  const [chatEnabled, setChatEnabled] = useState(settings?.chat_enabled ?? true)
  const [email, setEmail]       = useState(settings?.email_notifications ?? true)
  const [whatsapp, setWhatsapp] = useState(settings?.whatsapp_notifications ?? false)
  const [sms, setSms]           = useState(settings?.sms_notifications ?? true)

  const [sharePhone, setSharePhone]               = useState(settings?.share_provider_phone_with_patient ?? false)
  const [showContracts, setShowContracts]         = useState(settings?.show_hospital_contracts ?? true)
  const [showCommission, setShowCommission]       = useState(settings?.show_price_with_commission ?? true)
  const [requireNurseApproval, setRequireNurseApproval] = useState(settings?.require_nurse_approval ?? true)
  const [onTheWayEnabled, setOnTheWayEnabled]     = useState(settings?.on_the_way_enabled ?? true)
  const [disputesEnabled, setDisputesEnabled]     = useState(settings?.disputes_enabled ?? true)
  const [complaintsEnabled, setComplaintsEnabled] = useState(settings?.complaints_enabled ?? true)

  // Sync all boolean toggles when settings prop changes (server revalidation after save)
  useEffect(() => {
    if (settings?.allow_emergency_bookings !== undefined)             setEmergencyBookings(settings.allow_emergency_bookings)
    if (settings?.require_work_start_confirmation !== undefined)     setRequireWorkStart(settings.require_work_start_confirmation)
    if (settings?.require_work_completion_confirmation !== undefined) setRequireWorkDone(settings.require_work_completion_confirmation)
    if (settings?.chat_enabled !== undefined)                        setChatEnabled(settings.chat_enabled)
    if (settings?.email_notifications !== undefined)                 setEmail(settings.email_notifications)
    if (settings?.whatsapp_notifications !== undefined)              setWhatsapp(settings.whatsapp_notifications)
    if (settings?.sms_notifications !== undefined)                   setSms(settings.sms_notifications)
    if (settings?.share_provider_phone_with_patient !== undefined)   setSharePhone(settings.share_provider_phone_with_patient)
    if (settings?.show_hospital_contracts !== undefined)             setShowContracts(settings.show_hospital_contracts)
    if (settings?.show_price_with_commission !== undefined)          setShowCommission(settings.show_price_with_commission)
    if (settings?.require_nurse_approval !== undefined)              setRequireNurseApproval(settings.require_nurse_approval)
    if (settings?.on_the_way_enabled !== undefined)                  setOnTheWayEnabled(settings.on_the_way_enabled)
    if (settings?.disputes_enabled !== undefined)                    setDisputesEnabled(settings.disputes_enabled)
    if (settings?.complaints_enabled !== undefined)                  setComplaintsEnabled(settings.complaints_enabled)
  }, [
    settings?.allow_emergency_bookings,
    settings?.require_work_start_confirmation,
    settings?.require_work_completion_confirmation,
    settings?.chat_enabled,
    settings?.email_notifications,
    settings?.whatsapp_notifications,
    settings?.sms_notifications,
    settings?.share_provider_phone_with_patient,
    settings?.show_hospital_contracts,
    settings?.show_price_with_commission,
    settings?.require_nurse_approval,
    settings?.on_the_way_enabled,
    settings?.disputes_enabled,
    settings?.complaints_enabled,
  ])

  const [logoUrl, setLogoUrl]             = useState<string | null>(settings?.logo_url ?? null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError]         = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef      = useRef<HTMLFormElement>(null)

  function handleSubmitClick() {
    formRef.current?.requestSubmit()
  }

  // Refs for numeric inputs — read at submit time regardless of active tab
  const refPlatformName            = useRef<HTMLInputElement>(null)
  const refDefaultCommission       = useRef<HTMLInputElement>(null)
  const refVatRate                 = useRef<HTMLInputElement>(null)
  const refFreeCancellation        = useRef<HTMLInputElement>(null)
  const refAutoComplete            = useRef<HTMLInputElement>(null)
  const refMinBookingHours         = useRef<HTMLInputElement>(null)
  const refMinAdvanceHours         = useRef<HTMLInputElement>(null)
  const refMaxAdvanceDays          = useRef<HTMLInputElement>(null)
  const refPaymentDeadline         = useRef<HTMLInputElement>(null)
  const refWorkStartEnableHours    = useRef<HTMLInputElement>(null)
  const refDisputeWindowHours      = useRef<HTMLInputElement>(null)
  const refComplaintWindowHours    = useRef<HTMLInputElement>(null)

  function num(ref: React.RefObject<HTMLInputElement | null>, fallback: number) {
    const v = parseFloat(ref.current?.value ?? '')
    return isNaN(v) ? fallback : v
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (pending) return

    const input = {
      platform_name:                        refPlatformName.current?.value?.trim() || 'NurseCare+',
      logo_url:                             logoUrl,
      default_commission:                   num(refDefaultCommission, settings?.default_commission ?? 10),
      vat_rate:                             num(refVatRate, settings?.vat_rate ?? 15),
      free_cancellation_hours:              num(refFreeCancellation, settings?.free_cancellation_hours ?? 24),
      auto_complete_hours:                  num(refAutoComplete, settings?.auto_complete_hours ?? 24),
      min_booking_hours:                    num(refMinBookingHours, settings?.min_booking_hours ?? 2),
      min_advance_hours:                    num(refMinAdvanceHours, settings?.min_advance_hours ?? 2),
      max_advance_days:                     num(refMaxAdvanceDays, settings?.max_advance_days ?? 30),
      payment_deadline_hours:               num(refPaymentDeadline, settings?.payment_deadline_hours ?? 24),
      work_start_enable_hours_before:       num(refWorkStartEnableHours, settings?.work_start_enable_hours_before ?? 1),
      allow_emergency_bookings:             emergencyBookings,
      require_work_start_confirmation:      requireWorkStart,
      require_work_completion_confirmation: requireWorkDone,
      chat_enabled:                         chatEnabled,
      email_notifications:                  email,
      whatsapp_notifications:               whatsapp,
      sms_notifications:                    sms,
      share_provider_phone_with_patient:    sharePhone,
      show_hospital_contracts:              showContracts,
      show_price_with_commission:           showCommission,
      require_nurse_approval:               requireNurseApproval,
      on_the_way_enabled:                   onTheWayEnabled,
      disputes_enabled:                     disputesEnabled,
      complaints_enabled:                   complaintsEnabled,
      dispute_window_hours:                 num(refDisputeWindowHours, settings?.dispute_window_hours ?? 48),
      complaint_window_hours:               num(refComplaintWindowHours, settings?.complaint_window_hours ?? 168),
    }

    startTransition(async () => {
      await savePlatformSettings(input)
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
    <div>
      {/* Tab bar — outside <form> so developer sub-forms don't nest inside it */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabClick(tab.key)}
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
        {activeTab !== 'developer' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {saved && <span style={{ fontSize: '0.78rem', color: '#27A869', fontWeight: 700 }}>✓ Saved successfully</span>}
            <button
              type="button"
              onClick={handleSubmitClick}
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
        )}
      </div>

      {/* Developer tab renders its own forms — no wrapping <form> needed */}
      {activeTab === 'developer' && developerTabContent}

      {/* All other tabs share one <form> */}
      {activeTab !== 'developer' && <form onSubmit={handleSubmit} ref={formRef}>

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
              <input ref={refPlatformName} type="text" name="platform_name" defaultValue={settings?.platform_name ?? 'NurseCare+'} style={inputStyle} />
            </SettingRow>
          </div>

          <SectionHeader icon="💰" title="Billing & Rates" sub="Commission, VAT, and pricing rules" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow label="Default Commission (%)" description="Platform commission applied on top of nurse's hourly rate for patients">
              <NumberInput name="default_commission" defaultValue={settings?.default_commission ?? 10} unit="%" inputRef={refDefaultCommission} />
            </SettingRow>
            <SettingRow label="VAT Rate (%)" description="Saudi ZATCA compliant — applied to total booking amount">
              <NumberInput name="vat_rate" defaultValue={settings?.vat_rate ?? 15} unit="%" inputRef={refVatRate} />
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
          <SectionHeader icon="✅" title="Booking Approval & Flow" sub="Control whether nurse approval is required before patient pays" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow
              label="Require Nurse Approval Before Payment"
              description={
                <>
                  When <strong>ON</strong>: patient can only pay after nurse accepts the booking.
                  <br />
                  When <strong>OFF</strong>: patient pays immediately after booking — no nurse approval needed.
                  <br />
                  <span style={{ color: requireNurseApproval ? 'var(--teal)' : '#E04A4A', fontWeight: 600 }}>
                    {requireNurseApproval
                      ? '✓ Nurse must accept first — then patient pays'
                      : '✕ Direct payment — nurse approval skipped'}
                  </span>
                </>
              }
            >
              <Toggle checked={requireNurseApproval} onChange={setRequireNurseApproval} />
            </SettingRow>

            <SettingRow
              label="Enable On The Way Feature"
              description={
                <>
                  When <strong>ON</strong>: nurse sees <strong>"On The Way to Patient"</strong> button before "Mark Work Started".
                  <br />
                  Patient is notified that the nurse is en route.
                  <br />
                  <span style={{ color: onTheWayEnabled ? 'var(--teal)' : '#E04A4A', fontWeight: 600 }}>
                    {onTheWayEnabled
                      ? '✓ On The Way step is enabled'
                      : '✕ On The Way step is hidden — nurse goes directly to Mark Work Started'}
                  </span>
                </>
              }
              last
            >
              <Toggle checked={onTheWayEnabled} onChange={setOnTheWayEnabled} />
            </SettingRow>
          </div>

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
              <NumberInput name="work_start_enable_hours_before" defaultValue={settings?.work_start_enable_hours_before ?? 1} unit="hrs before" inputRef={refWorkStartEnableHours} />
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
              <NumberInput name="min_booking_hours" defaultValue={settings?.min_booking_hours ?? 2} unit="hours" inputRef={refMinBookingHours} />
            </SettingRow>

            <SettingRow
              label="Minimum Advance Booking Time"
              description={
                <>
                  How many hours <strong>before</strong> the booking start time a booking must be placed.
                  <br />
                  <span style={{ color: 'var(--teal)' }}>e.g. 2 hrs → booking starting at 10 AM must be created by 8 AM at the latest</span>
                </>
              }
            >
              <NumberInput name="min_advance_hours" defaultValue={settings?.min_advance_hours ?? 2} unit="hours before" inputRef={refMinAdvanceHours} />
            </SettingRow>

            <SettingRow
              label="Maximum Advance Booking Limit"
              description={
                <>
                  How many days <strong>in advance</strong> a booking can be placed.
                  <br />
                  <span style={{ color: 'var(--teal)' }}>e.g. 30 days → patients cannot book more than 30 days into the future</span>
                </>
              }
            >
              <NumberInput name="max_advance_days" defaultValue={settings?.max_advance_days ?? 30} unit="days ahead" inputRef={refMaxAdvanceDays} />
            </SettingRow>

            <SettingRow
              label="Payment Deadline"
              description={
                <>
                  Hours after booking is placed within which the patient must complete payment.
                  If unpaid, the booking is <strong>automatically cancelled</strong> and both patient &amp; nurse are notified.
                  <br />
                  <span style={{ color: '#E04A4A', fontWeight: 600 }}>Set to 0 to disable auto-cancellation.</span>
                  <br />
                  <span style={{ color: 'var(--teal)' }}>e.g. 24 hrs → patient has 24 hours to pay after booking is confirmed</span>
                </>
              }
            >
              <NumberInput name="payment_deadline_hours" defaultValue={settings?.payment_deadline_hours ?? 24} unit="hours (0 = off)" inputRef={refPaymentDeadline} />
            </SettingRow>

            <SettingRow
              label="Allow Emergency Bookings"
              description="Patients can request same-day urgent bookings outside regular scheduling"
            >
              <Toggle checked={emergencyBookings} onChange={setEmergencyBookings} />
            </SettingRow>

            <SettingRow
              label="Share Provider Phone Number"
              description={
                <>
                  When <strong>ON</strong>: patient can see the nurse's phone number on the booking detail page.
                  <br />
                  <span style={{ color: sharePhone ? 'var(--teal)' : '#E04A4A', fontWeight: 600 }}>
                    {sharePhone ? '✓ Nurse phone number is visible to patients' : '✕ Phone number hidden from patients (contact via chat only)'}
                  </span>
                </>
              }
            >
              <Toggle checked={sharePhone} onChange={setSharePhone} />
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
              <NumberInput name="free_cancellation_hours" defaultValue={settings?.free_cancellation_hours ?? 24} unit="hours" inputRef={refFreeCancellation} />
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
              <NumberInput name="auto_complete_hours" defaultValue={settings?.auto_complete_hours ?? 24} unit="hours" inputRef={refAutoComplete} />
            </SettingRow>
          </div>
        </div>
      )}

      {/* ── DISPUTES TAB ── */}
      {activeTab === 'disputes' && (
        <div className="dash-card">
          <SectionHeader icon="⚖️" title="Dispute Settings" sub="Control when patients and nurses can raise booking disputes" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow
              label="Enable Disputes"
              description={
                <>
                  When <strong>ON</strong>: patients and nurses can raise a dispute against a booking (e.g. no-show, quality issue).
                  <br />
                  When <strong>OFF</strong>: the dispute option is hidden for all users. Admin can still review existing disputes.
                  <br />
                  <span style={{ color: disputesEnabled ? 'var(--teal)' : '#E04A4A', fontWeight: 600 }}>
                    {disputesEnabled ? '✓ Disputes are currently ENABLED' : '✕ Disputes are currently DISABLED for all users'}
                  </span>
                </>
              }
            >
              <Toggle checked={disputesEnabled} onChange={setDisputesEnabled} />
            </SettingRow>

            <SettingRow
              label="Dispute Window (hours after completion)"
              description={
                <>
                  How many hours <strong>after</strong> a booking is marked completed can a user raise a dispute.
                  <br />
                  After this window expires, disputes are blocked with the message <em>"Dispute window has expired."</em>
                  <br />
                  <span style={{ color: 'var(--teal)' }}>e.g. 48 hrs → users have 2 days after completion to raise a dispute</span>
                </>
              }
              last
            >
              <NumberInput name="dispute_window_hours" defaultValue={settings?.dispute_window_hours ?? 48} unit="hours" inputRef={refDisputeWindowHours} />
            </SettingRow>
          </div>

          <SectionHeader icon="📣" title="Complaint Settings" sub="Control when users can submit general complaints" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow
              label="Enable Complaints"
              description={
                <>
                  When <strong>ON</strong>: patients, nurses, and hospitals can submit complaints about any issue.
                  <br />
                  When <strong>OFF</strong>: the complaint submission form is hidden for all users. Admin can still resolve existing complaints.
                  <br />
                  <span style={{ color: complaintsEnabled ? 'var(--teal)' : '#E04A4A', fontWeight: 600 }}>
                    {complaintsEnabled ? '✓ Complaints are currently ENABLED' : '✕ Complaints are currently DISABLED for all users'}
                  </span>
                </>
              }
            >
              <Toggle checked={complaintsEnabled} onChange={setComplaintsEnabled} />
            </SettingRow>

            <SettingRow
              label="Complaint Window (hours after booking completion)"
              description={
                <>
                  How many hours <strong>after</strong> a linked booking is completed can a user submit a complaint about it.
                  <br />
                  Complaints not linked to a booking are always allowed when complaints are enabled.
                  <br />
                  After this window, booking-linked complaints are blocked with the message <em>"Complaint submission period has expired."</em>
                  <br />
                  <span style={{ color: 'var(--teal)' }}>e.g. 168 hrs (7 days) → users have 1 week after completion to complain</span>
                </>
              }
              last
            >
              <NumberInput name="complaint_window_hours" defaultValue={settings?.complaint_window_hours ?? 168} unit="hours" inputRef={refComplaintWindowHours} />
            </SettingRow>
          </div>
        </div>
      )}

      {/* ── HOSPITAL TAB ── */}
      {activeTab === 'hospital' && (
        <div className="dash-card">
          <SectionHeader icon="📅" title="Bulk Booking Rules" sub="Control how hospitals can schedule nurse bookings" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow
              label="Minimum Advance Booking Time"
              description={
                <>
                  How many hours <strong>before</strong> the booking start date a hospital booking must be placed.
                  <br />
                  <span style={{ color: 'var(--teal)' }}>e.g. 2 hrs → booking starting today must be created at least 2 hours before start time</span>
                </>
              }
            >
              <NumberInput name="min_advance_hours" defaultValue={settings?.min_advance_hours ?? 2} unit="hours before" />
            </SettingRow>
            <SettingRow
              label="Maximum Advance Booking Limit"
              description={
                <>
                  How many days <strong>in advance</strong> a hospital bulk booking can be placed.
                  <br />
                  <span style={{ color: 'var(--teal)' }}>e.g. 30 days → hospitals cannot schedule more than 30 days into the future</span>
                </>
              }
            >
              <NumberInput name="max_advance_days" defaultValue={settings?.max_advance_days ?? 30} unit="days ahead" />
            </SettingRow>
          </div>

          <SectionHeader icon="📄" title="Privacy & Visibility" sub="Control what hospitals and patients can see" />
          <div style={{ padding: '0 1.2rem' }}>
            <SettingRow
              label="Show Contract Details to Hospital"
              description={
                <>
                  When <strong>ON</strong>: hospitals can view nurse contract documents and agreement details.
                  <br />
                  <span style={{ color: showContracts ? 'var(--teal)' : '#E04A4A', fontWeight: 600 }}>
                    {showContracts ? '✓ Contract details visible to hospitals' : '✕ Contract details hidden from hospitals'}
                  </span>
                </>
              }
            >
              <Toggle checked={showContracts} onChange={setShowContracts} />
            </SettingRow>

            <SettingRow
              label="Show Final Price (with Commission)"
              description={
                <>
                  Controls whether hospitals and patients see the <strong>base nurse rate</strong> or the <strong>total price including platform commission</strong>.
                  <br />
                  <span style={{ color: showCommission ? '#7B2FBE' : 'var(--teal)', fontWeight: 600 }}>
                    {showCommission
                      ? '💰 Showing final price (base rate + commission) — e.g. SAR 550'
                      : '💰 Showing base rate only (commission hidden) — e.g. SAR 500'}
                  </span>
                </>
              }
              last
            >
              <Toggle checked={showCommission} onChange={setShowCommission} />
            </SettingRow>
          </div>
        </div>
      )}

      </form>}
    </div>
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

function NumberInput({ name, defaultValue, unit, inputRef }: { name: string; defaultValue: number; unit: string; inputRef?: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input
        ref={inputRef}
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
