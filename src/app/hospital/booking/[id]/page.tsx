import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NurseAvatarBtn } from '@/app/components/NurseCardModal'

export const dynamic = 'force-dynamic'

type NurseSelection = {
  deptId: string; deptName: string; shift: string
  nurseId: string; nurseName: string; nurseSpecialization: string
  approvedBy?: string; approvedAt?: string
  status?: 'pending' | 'approved' | 'rejected'
}

const SHIFT_META: Record<string, { icon: string; color: string; bg: string; label: string; time: string }> = {
  morning: { icon: '☀️', color: '#b85e00', bg: '#FFF8E8', label: 'Morning',  time: '07:00–14:00' },
  evening: { icon: '🌤️', color: '#DD6B20', bg: '#FFF3E0', label: 'Evening',  time: '14:00–21:00' },
  night:   { icon: '🌙', color: '#7B2FBE', bg: '#EDE9FE', label: 'Night',    time: '21:00–07:00' },
}

const BOOKING_STATUS: Record<string, { bg: string; color: string; label: string; step: number }> = {
  pending:   { bg: 'rgba(181,94,0,0.08)',    color: '#b85e00', label: 'Pending Review',  step: 1 },
  reviewing: { bg: 'rgba(59,130,246,0.08)',  color: '#3B82F6', label: 'Under Review',    step: 2 },
  matched:   { bg: 'rgba(14,123,140,0.08)',  color: '#0E7B8C', label: 'Nurses Matched',  step: 3 },
  confirmed: { bg: 'rgba(26,122,74,0.08)',   color: '#1A7A4A', label: 'Confirmed',        step: 4 },
  cancelled: { bg: 'rgba(224,74,74,0.06)',   color: '#E04A4A', label: 'Cancelled',        step: 0 },
}

const NURSE_STATUS: Record<string, { bg: string; color: string; label: string; dot: string }> = {
  pending:  { bg: 'rgba(181,94,0,0.08)',   color: '#b85e00', label: 'Awaiting Approval', dot: '#f5a623' },
  approved: { bg: 'rgba(26,122,74,0.08)',  color: '#1A7A4A', label: 'Approved',           dot: '#27A869' },
  rejected: { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: 'Rejected',            dot: '#E04A4A' },
}

const TIMELINE_STEPS = [
  { key: 'pending',   icon: '📋', label: 'Submitted' },
  { key: 'reviewing', icon: '🔍', label: 'Reviewing' },
  { key: 'matched',   icon: '✅', label: 'Matched' },
  { key: 'confirmed', icon: '🎉', label: 'Confirmed' },
]

export default async function HospitalBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, hospital_name, city')
    .eq('user_id', user.id)
    .single()

  if (!hospital) notFound()

  const [{ data: booking }, { data: platformSettings }] = await Promise.all([
    supabase.from('hospital_booking_requests').select('*').eq('id', id).eq('hospital_id', hospital.id).single(),
    supabase.from('platform_settings').select('show_price_with_commission, show_hospital_contracts, share_provider_phone_with_patient').limit(1).single(),
  ])

  if (!booking) notFound()
  const showWithCommission = platformSettings?.show_price_with_commission ?? true
  const showContracts      = platformSettings?.show_hospital_contracts ?? true
  const sharePhone         = platformSettings?.share_provider_phone_with_patient ?? false
  // Hospital sees nurse phone when "Show Contract Details to Hospital" is ON
  const hospitalSeePhone   = showContracts

  const nurseSelections: NurseSelection[] = booking.nurse_selections ?? []
  const deptBreakdown: any[]              = booking.dept_breakdown ?? []

  // Only non-rejected nurses count toward cost
  const activeSelections = nurseSelections.filter(ns => ns.status !== 'rejected')

  // Fetch extended nurse profiles for modal + pricing
  const nurseIds = [...new Set(nurseSelections.map(ns => ns.nurseId).filter(Boolean))]
  const { data: nurseRates } = nurseIds.length > 0
    ? await supabase.from('nurses').select('user_id, full_name, daily_rate, final_daily_price, commission_percent, bio, city, nationality, gender, experience_years, phone, license_no').in('user_id', nurseIds)
    : { data: [] }

  // Fetch nurse photos
  const { data: nursePhotos } = nurseIds.length > 0
    ? await supabase.from('nurse_documents').select('nurse_id, file_url').eq('doc_type', 'photo').in('nurse_id', (nurseRates ?? []).map((n: any) => n.user_id))
    : { data: [] }
  const photoByUserId: Record<string, string> = {}
  // need to map nurse.id -> user_id; nurseRates already has user_id
  // nurse_documents.nurse_id = nurses.id (uuid), not user_id — need to join via nurses.id
  // For simplicity fetch nurses.id too
  const nurseProfileMap: Record<string, {
    daily_rate: number; final_daily_price: number; commission_percent: number
    bio: string | null; city: string | null; nationality: string | null
    gender: string | null; experience_years: number | null
    phone: string | null; license_no: string | null; photo_url: string | null
    nurse_table_id?: string
  }> = {}

  // Fetch nurse table IDs for photo lookup
  const { data: nurseTableRows } = nurseIds.length > 0
    ? await supabase.from('nurses').select('id, user_id').in('user_id', nurseIds)
    : { data: [] }
  const nurseTableIdMap: Record<string, string> = {}
  for (const r of (nurseTableRows ?? [])) nurseTableIdMap[r.user_id] = r.id

  // Fetch photos by nurse table id
  const nurseTableIds = Object.values(nurseTableIdMap)
  const { data: photoRows } = nurseTableIds.length > 0
    ? await supabase.from('nurse_documents').select('nurse_id, file_url').eq('doc_type', 'photo').in('nurse_id', nurseTableIds)
    : { data: [] }
  const photoByNurseId: Record<string, string> = {}
  for (const p of (photoRows ?? [])) photoByNurseId[p.nurse_id] = p.file_url

  for (const n of (nurseRates ?? [])) {
    const tableId = nurseTableIdMap[n.user_id]
    nurseProfileMap[n.user_id] = {
      daily_rate: Number(n.daily_rate ?? 0),
      final_daily_price: Number(n.final_daily_price ?? n.daily_rate ?? 0),
      commission_percent: Number(n.commission_percent ?? 0),
      bio: n.bio ?? null,
      city: n.city ?? null,
      nationality: n.nationality ?? null,
      gender: n.gender ?? null,
      experience_years: n.experience_years ?? null,
      phone: n.phone ?? null,
      license_no: n.license_no ?? null,
      photo_url: tableId ? (photoByNurseId[tableId] ?? null) : null,
    }
  }

  const durationDays = booking.duration_days ?? 1
  // Cost only counts non-rejected nurses
  const totalNurseCost = activeSelections.reduce((sum, ns) => {
    const rate = nurseProfileMap[ns.nurseId]
    return sum + (rate ? rate.final_daily_price * durationDays : 0)
  }, 0)
  const totalNurseEarnings = activeSelections.reduce((sum, ns) => {
    const rate = nurseProfileMap[ns.nurseId]
    return sum + (rate ? rate.daily_rate * durationDays : 0)
  }, 0)
  const totalCommission = totalNurseCost - totalNurseEarnings
  const hasPricing = activeSelections.some(ns => nurseProfileMap[ns.nurseId]?.daily_rate > 0)
  const bStatus = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.pending
  const isCancelled = booking.status === 'cancelled'
  const canEdit = booking.status === 'pending' || booking.status === 'reviewing'

  // Fetch ledger items (Service Master path)
  const { data: ledgerItems } = await supabase
    .from('booking_service_items')
    .select('id, service_name, unit_price, quantity')
    .eq('booking_id', id)
    .eq('booking_type', 'hospital')
    .order('created_at')

  // Stats
  const approvedCount = nurseSelections.filter(n => n.status === 'approved').length
  const rejectedCount = nurseSelections.filter(n => n.status === 'rejected').length
  const pendingCount  = nurseSelections.filter(n => !n.status || n.status === 'pending').length

  // Group by dept for the nurse table
  const byDept: Record<string, { deptName: string; nurses: (NurseSelection & { idx: number })[] }> = {}
  nurseSelections.forEach((ns, idx) => {
    if (!byDept[ns.deptId]) byDept[ns.deptId] = { deptName: ns.deptName, nurses: [] }
    byDept[ns.deptId].nurses.push({ ...ns, idx })
  })

  // Approval rate %
  const total = nurseSelections.length
  const approvalPct = total > 0 ? Math.round((approvedCount / total) * 100) : 0

  return (
    <div className="dash-shell">

      {/* ── Page header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/hospital/booking" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          ← Back to Bookings
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
              Booking Request
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '4px 0 0' }}>
              {hospital.hospital_name} · Submitted {new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, background: 'var(--shell-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking ID</span>
              <code style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.02em' }}>{id.slice(0, 8).toUpperCase()}</code>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              background: bStatus.bg, color: bStatus.color,
              padding: '7px 18px', borderRadius: 50, fontWeight: 700, fontSize: '0.82rem',
              border: `1px solid ${bStatus.color}30`,
            }}>
              {bStatus.label}
            </span>
            {booking.priority && booking.priority !== 'normal' && (
              <span style={{
                background: booking.priority === 'critical' ? 'rgba(224,74,74,0.09)' : 'rgba(245,132,42,0.1)',
                color: booking.priority === 'critical' ? '#E04A4A' : '#b85e00',
                padding: '5px 14px', borderRadius: 50, fontWeight: 700, fontSize: '0.78rem',
                border: `1px solid ${booking.priority === 'critical' ? 'rgba(224,74,74,0.3)' : 'rgba(245,132,42,0.35)'}`,
              }}>
                {booking.priority === 'critical' ? '🚨 Critical' : '⚡ Urgent'}
              </span>
            )}
            {booking.is_recurring && (
              <span style={{ background: 'rgba(107,63,160,0.1)', color: '#6B3FA0', padding: '5px 12px', borderRadius: 50, fontWeight: 700, fontSize: '0.78rem', border: '1px solid rgba(107,63,160,0.25)' }}>
                🔁 Recurring
              </span>
            )}
            {canEdit && (
              <Link href={`/hospital/booking/${id}/edit`} style={{
                background: 'var(--card)', color: 'var(--ink)',
                padding: '7px 16px', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem',
                textDecoration: 'none', border: '1px solid var(--border)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                ✏️ Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Timeline ── */}
      {!isCancelled && (
        <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.2rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            {TIMELINE_STEPS.map((step, i) => {
              const currentStep = bStatus.step
              const isDone      = currentStep > i + 1
              const isActive    = currentStep === i + 1
              const isFuture    = currentStep < i + 1
              return (
                <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {/* connector line */}
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute', top: 18, left: '50%', width: '100%', height: 3,
                      background: isDone ? 'var(--teal)' : 'var(--border)',
                      transition: 'background 0.3s',
                      zIndex: 0,
                    }} />
                  )}
                  {/* circle */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', zIndex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                    background: isDone ? 'var(--teal)' : isActive ? 'var(--teal)' : 'var(--border)',
                    boxShadow: isActive ? '0 0 0 4px rgba(14,123,140,0.18)' : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {isDone ? (
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>✓</span>
                    ) : (
                      <span style={{ fontSize: '0.95rem', opacity: isFuture ? 0.4 : 1 }}>{step.icon}</span>
                    )}
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.7rem', fontWeight: isActive ? 800 : 600, color: isActive ? 'var(--teal)' : isFuture ? 'var(--muted)' : 'var(--ink)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {step.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Cancelled banner ── */}
      {isCancelled && (
        <div style={{ background: 'rgba(224,74,74,0.06)', border: '1.5px solid rgba(224,74,74,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: '1.5rem', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: '1.4rem' }}>❌</span>
          <div>
            <div style={{ fontWeight: 700, color: '#E04A4A', fontSize: '0.9rem' }}>Booking Cancelled</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>This booking request has been cancelled. Please create a new request if needed.</div>
          </div>
        </div>
      )}

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          {
            icon: '📅', label: 'Service Period',
            value: `${new Date(booking.start_date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })} – ${new Date(booking.end_date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}`,
            color: '#0E7B8C', bg: 'rgba(14,123,140,0.07)', small: true,
          },
          { icon: '⏱️', label: 'Duration',       value: `${booking.duration_days} days`,  color: '#7B2FBE', bg: 'rgba(123,47,190,0.07)' },
          { icon: '👩‍⚕️', label: 'Nurses Required', value: booking.total_nurses,              color: '#0E7B8C', bg: 'rgba(14,123,140,0.07)' },
          { icon: '✅', label: 'Approved',        value: approvedCount,                      color: '#1A7A4A', bg: 'rgba(26,122,74,0.07)'  },
          { icon: '⏳', label: 'Pending',         value: pendingCount,                       color: '#b85e00', bg: 'rgba(181,94,0,0.07)'   },
          { icon: '✕',  label: 'Rejected',        value: rejectedCount,                      color: '#E04A4A', bg: 'rgba(224,74,74,0.07)'  },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ padding: '1rem', borderTop: `3px solid ${k.color}` }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontWeight: 800, fontSize: (k as any).small ? '0.82rem' : '1.5rem', color: k.color, lineHeight: 1.2 }}>{k.value}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main 2-col grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Booking Details */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">📋 Booking Details</span>
          </div>
          <div className="dash-card-body">
            <InfoRow label="Hospital"           value={hospital.hospital_name} />
            <InfoRow label="City"               value={hospital.city ?? '—'} />
            <InfoRow label="Start Date"         value={new Date(booking.start_date).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'long', year:'numeric' })} />
            <InfoRow label="End Date"           value={new Date(booking.end_date).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'long', year:'numeric' })} />
            <InfoRow label="Duration"           value={`${booking.duration_days} days`} />
            <InfoRow label="Total Nurses"       value={booking.total_nurses} />
            {booking.priority && booking.priority !== 'normal' && (
              <InfoRow label="Priority" value={booking.priority === 'critical' ? '🚨 Critical' : '⚡ Urgent'} highlight />
            )}
            {booking.is_recurring && (
              <InfoRow label="Recurring" value={`🔁 ${booking.recurrence_type ?? 'weekly'}${booking.recurrence_end_date ? ` until ${new Date(booking.recurrence_end_date).toLocaleDateString('en-GB')}` : ''}`} />
            )}
            {booking.gender_preference && booking.gender_preference !== 'any' && (
              <InfoRow label="Gender Preference" value={booking.gender_preference} />
            )}
            {booking.language_preference?.length > 0 && (
              <InfoRow label="Language" value={booking.language_preference.join(', ')} />
            )}
            {booking.special_instructions && (
              <InfoRow label="Instructions" value={booking.special_instructions} />
            )}
            {booking.internal_notes && (
              <InfoRow label="Internal Notes" value={booking.internal_notes} />
            )}
            {booking.admin_notes && (
              <InfoRow label="Admin Notes" value={booking.admin_notes} highlight />
            )}
          </div>
        </div>

        {/* Shifts & Specializations */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">🕐 Shifts & Requirements</span>
          </div>
          <div className="dash-card-body">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Shifts Required</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(booking.shifts ?? []).map((s: string) => {
                  const sm = SHIFT_META[s]
                  if (!sm) return null
                  return (
                    <div key={s} style={{ background: sm.bg, border: `1px solid ${sm.color}25`, borderRadius: 9, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1rem' }}>{sm.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: sm.color }}>{sm.label}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{sm.time}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {booking.specializations?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Specializations</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {booking.specializations.map((s: string) => (
                    <span key={s} style={{ background: 'rgba(14,123,140,0.07)', color: 'var(--teal)', padding: '4px 10px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Approval progress bar */}
            {total > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem' }}>Approval Progress</span>
                  <span style={{ fontWeight: 700, color: approvalPct === 100 ? '#1A7A4A' : 'var(--teal)' }}>{approvedCount}/{total} approved</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, width: `${approvalPct}%`, background: approvalPct === 100 ? '#1A7A4A' : 'var(--teal)', transition: 'width 0.4s' }} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <span style={{ fontSize: '0.7rem', color: '#1A7A4A', fontWeight: 700 }}>✅ {approvedCount} approved</span>
                  <span style={{ fontSize: '0.7rem', color: '#b85e00', fontWeight: 700 }}>⏳ {pendingCount} pending</span>
                  {rejectedCount > 0 && <span style={{ fontSize: '0.7rem', color: '#E04A4A', fontWeight: 700 }}>✕ {rejectedCount} rejected</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Department Breakdown ── */}
      {deptBreakdown.length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">🏢 Department Breakdown</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)' }}>
                  {['Department', '☀️ Morning', '🌤️ Evening', '🌙 Night', 'Total'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptBreakdown.map((row: any, i: number) => {
                  const rowTotal = (row.morning || 0) + (row.evening || 0) + (row.night || 0)
                  return (
                    <tr key={i} style={{ borderBottom: i < deptBreakdown.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--ink)' }}>{row.deptName}</td>
                      <td style={{ padding: '11px 16px' }}>
                        {row.morning > 0 ? <span style={{ background: '#FFF8E8', color: '#b85e00', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem' }}>{row.morning}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        {row.evening > 0 ? <span style={{ background: '#FFF3E0', color: '#DD6B20', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem' }}>{row.evening}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        {row.night > 0 ? <span style={{ background: '#EDE9FE', color: '#7B2FBE', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem' }}>{row.night}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 16px', fontWeight: 800, color: 'var(--teal)' }}>{rowTotal}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--shell-bg)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 800, color: 'var(--ink)', fontSize: '0.8rem' }}>TOTAL</td>
                  {(['morning', 'evening', 'night'] as const).map(shift => {
                    const sum = deptBreakdown.reduce((acc: number, r: any) => acc + (r[shift] || 0), 0)
                    return <td key={shift} style={{ padding: '10px 16px', fontWeight: 800, color: 'var(--muted)' }}>{sum > 0 ? sum : '—'}</td>
                  })}
                  <td style={{ padding: '10px 16px', fontWeight: 800, color: 'var(--teal)' }}>
                    {deptBreakdown.reduce((acc: number, r: any) => acc + (r.morning || 0) + (r.evening || 0) + (r.night || 0), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Pricing Breakdown ── */}
      {hasPricing && (
        <div className="dash-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #1A7A4A' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">💰 Cost Breakdown</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Estimated total for {durationDays} day{durationDays !== 1 ? 's' : ''}</span>
          </div>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '1rem', padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)' }}>
            <HPriceCard label="Active Nurses" value={String(activeSelections.length)} sub={rejectedCount > 0 ? `${rejectedCount} rejected excluded` : 'selected nurses'} color="#0E7B8C" />
            <HPriceCard label="Duration" value={`${durationDays} days`} sub="service period" color="#7B2FBE" />
            {showWithCommission && (
              <HPriceCard label="Nurses Earnings" value={`SAR ${totalNurseEarnings.toFixed(2)}`} sub="base total" color="#b85e00" />
            )}
            {showWithCommission && (
              <HPriceCard label="Platform Fee" value={`SAR ${totalCommission.toFixed(2)}`} sub="admin commission" color="#E04A4A" />
            )}
            <HPriceCard
              label="Total Cost"
              value={`SAR ${showWithCommission ? totalNurseCost.toFixed(2) : totalNurseEarnings.toFixed(2)}`}
              sub="you pay"
              color="#1A7A4A"
              highlight
            />
          </div>
          {/* Per-nurse breakdown — active (non-rejected) only */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)' }}>
                  {['Nurse', 'Department', 'Shift', 'Daily Rate', ...(showWithCommission ? ['Commission', 'Days', 'Total'] : ['Days', 'Total'])].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeSelections.map((ns, i) => {
                  const rate = nurseProfileMap[ns.nurseId]
                  const colSpanNo = showWithCommission ? 6 : 4
                  if (!rate) return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <NurseAvatarBtn nurse={{ nurseId: ns.nurseId, nurseName: ns.nurseName, nurseSpecialization: ns.nurseSpecialization, shift: ns.shift, deptName: ns.deptName }} showPrice={showWithCommission} />
                          <span style={{ fontWeight: 700 }}>{ns.nurseName}</span>
                        </div>
                      </td>
                      <td colSpan={colSpanNo} style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: '0.75rem' }}>Rate not set</td>
                    </tr>
                  )
                  const displayTotal = showWithCommission ? rate.final_daily_price * durationDays : rate.daily_rate * durationDays
                  const commission = (rate.final_daily_price - rate.daily_rate) * durationDays
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(14,123,140,0.01)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <NurseAvatarBtn nurse={{ nurseId: ns.nurseId, nurseName: ns.nurseName, nurseSpecialization: ns.nurseSpecialization, shift: ns.shift, deptName: ns.deptName, bio: rate.bio, city: rate.city, nationality: rate.nationality, gender: rate.gender, experienceYears: rate.experience_years, phone: hospitalSeePhone ? rate.phone : null, licenseNo: rate.license_no, dailyRate: rate.daily_rate, finalDailyPrice: rate.final_daily_price, commissionPercent: rate.commission_percent, photoUrl: rate.photo_url }} showPrice showCommission={showWithCommission} />
                          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{ns.nurseName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{ns.deptName}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: ns.shift === 'morning' ? '#FFF8E8' : ns.shift === 'evening' ? '#FFF3E0' : '#EDE9FE', color: ns.shift === 'morning' ? '#b85e00' : ns.shift === 'evening' ? '#DD6B20' : '#7B2FBE', padding: '2px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>
                          {ns.shift}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0E7B8C' }}>SAR {rate.daily_rate.toFixed(2)}</td>
                      {showWithCommission && (
                        <td style={{ padding: '10px 14px', color: '#E04A4A', fontWeight: 600 }}>
                          {rate.commission_percent > 0 ? `${rate.commission_percent}% (SAR ${commission.toFixed(2)})` : '—'}
                        </td>
                      )}
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{durationDays}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#1A7A4A' }}>SAR {displayTotal.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--shell-bg)' }}>
                  <td colSpan={showWithCommission ? 6 : 4} style={{ padding: '10px 14px', fontWeight: 800, fontSize: '0.82rem', color: 'var(--ink)' }}>TOTAL</td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, fontSize: '0.9rem', color: '#1A7A4A' }}>
                    SAR {showWithCommission ? totalNurseCost.toFixed(2) : totalNurseEarnings.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Service Ledger (Service Master path) ── */}
      {ledgerItems && ledgerItems.length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #0E7B8C' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">🩺 Service Ledger</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Pricing snapshot at booking time</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)' }}>
                  {['Service', 'Unit Price', 'Qty', 'Line Total'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledgerItems.map((item: any) => {
                  const lineTotal = Number(item.unit_price) * (item.quantity ?? 1)
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--ink)' }}>{item.service_name}</td>
                      <td style={{ padding: '11px 16px', color: '#0E7B8C', fontWeight: 600 }}>SAR {Number(item.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '11px 16px', color: 'var(--muted)' }}>{item.quantity ?? 1}</td>
                      <td style={{ padding: '11px 16px', fontWeight: 800, color: '#1A7A4A' }}>SAR {lineTotal.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--shell-bg)' }}>
                  <td colSpan={3} style={{ padding: '10px 16px', fontWeight: 800, fontSize: '0.82rem', color: 'var(--ink)' }}>TOTAL (informational)</td>
                  <td style={{ padding: '10px 16px', fontWeight: 800, fontSize: '0.9rem', color: '#1A7A4A' }}>
                    SAR {ledgerItems.reduce((s: number, i: any) => s + Number(i.unit_price) * (i.quantity ?? 1), 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Nurse Roster ── */}
      <div className="dash-card">
        <div className="dash-card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className="dash-card-title">👩‍⚕️ Nurse Roster ({nurseSelections.length})</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: `${approvedCount} Approved`, color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
              { label: `${pendingCount} Pending`,   color: '#b85e00', bg: 'rgba(181,94,0,0.08)'  },
              ...(rejectedCount > 0 ? [{ label: `${rejectedCount} Rejected`, color: '#E04A4A', bg: 'rgba(224,74,74,0.06)' }] : []),
            ].map(t => (
              <span key={t.label} style={{ background: t.bg, color: t.color, fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>{t.label}</span>
            ))}
          </div>
        </div>

        {nurseSelections.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>👩‍⚕️</div>
            <div style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '0.88rem' }}>No nurses selected yet</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>Nurses will appear here once selected during booking</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Nurse', 'Specialization', 'Department', 'Shift', 'Approval Status', 'Reviewed By', 'Review Date'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nurseSelections.map((ns, i) => {
                  const shiftMeta  = SHIFT_META[ns.shift] ?? { icon: '', color: '#666', bg: '#f9f9f9', label: ns.shift, time: '' }
                  const nsMeta     = NURSE_STATUS[ns.status ?? 'pending']
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(14,123,140,0.01)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--shell-bg)', border: '1px solid var(--border)', fontSize: '0.7rem', fontWeight: 800, color: 'var(--muted)' }}>{i + 1}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {(() => {
                            const rate = nurseProfileMap[ns.nurseId]
                            return (
                              <NurseAvatarBtn nurse={{
                                nurseId: ns.nurseId, nurseName: ns.nurseName,
                                nurseSpecialization: ns.nurseSpecialization,
                                shift: ns.shift, deptName: ns.deptName,
                                ...(rate ? {
                                  bio: rate.bio, city: rate.city, nationality: rate.nationality,
                                  gender: rate.gender, experienceYears: rate.experience_years,
                                  phone: hospitalSeePhone ? rate.phone : null, licenseNo: rate.license_no,
                                  dailyRate: rate.daily_rate, finalDailyPrice: rate.final_daily_price,
                                  commissionPercent: rate.commission_percent, photoUrl: rate.photo_url,
                                } : {}),
                                selectionStatus: ns.status,
                              }} showPrice={!!nurseProfileMap[ns.nurseId]} showCommission={showWithCommission} />
                            )
                          })()}
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.85rem' }}>{ns.nurseName}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 1 }}>ID: {ns.nurseId.slice(0, 8).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: 'rgba(14,123,140,0.07)', color: 'var(--teal)', padding: '3px 9px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600 }}>
                          {ns.nurseSpecialization}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)', fontSize: '0.82rem' }}>{ns.deptName}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: shiftMeta.bg, color: shiftMeta.color, padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {shiftMeta.icon} {shiftMeta.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: nsMeta.dot, flexShrink: 0 }} />
                          <span style={{ background: nsMeta.bg, color: nsMeta.color, padding: '4px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {nsMeta.label}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: ns.approvedBy ? 'var(--ink)' : 'var(--muted)', fontWeight: ns.approvedBy ? 600 : 400 }}>
                        {ns.approvedBy ?? '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {ns.approvedAt ? new Date(ns.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

/* ── Helper components ── */
function HPriceCard({ label, value, sub, color, highlight }: { label: string; value: string; sub?: string; color: string; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? `${color}08` : 'var(--shell-bg)', border: `1px solid ${color}20`, borderRadius: 10, padding: '14px 16px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', flexShrink: 0, minWidth: 120, paddingTop: 1 }}>{label}</span>
      <span style={{
        fontSize: '0.82rem', fontWeight: 600, textAlign: 'right',
        color: highlight ? 'var(--teal)' : 'var(--ink)',
        background: highlight ? 'rgba(14,123,140,0.06)' : 'transparent',
        padding: highlight ? '2px 8px' : '0',
        borderRadius: highlight ? 6 : 0,
      }}>
        {value}
      </span>
    </div>
  )
}
