import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type NurseSelection = {
  deptId: string; deptName: string; shift: string
  nurseId: string; nurseName: string; nurseSpecialization: string
  approvedBy?: string; approvedAt?: string; status?: 'pending' | 'approved' | 'rejected'
}

const SHIFT_META: Record<string, { icon: string; color: string; label: string }> = {
  morning: { icon: '☀️', color: '#b85e00', label: 'Morning' },
  evening: { icon: '🌤️', color: '#DD6B20', label: 'Evening' },
  night:   { icon: '🌙', color: '#7B2FBE', label: 'Night' },
}

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: '#FFF8F0', color: '#b85e00', label: '⏳ Pending' },
  reviewing:  { bg: '#EFF6FF', color: '#3B82F6', label: '🔍 Reviewing' },
  matched:    { bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', label: '✅ Matched' },
  confirmed:  { bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A', label: '✅ Confirmed' },
  cancelled:  { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: '✕ Cancelled' },
}

export default async function HospitalBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  // Get hospital
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, hospital_name')
    .eq('user_id', user.id)
    .single()

  if (!hospital) notFound()

  // Get booking
  const { data: booking } = await supabase
    .from('hospital_booking_requests')
    .select('*')
    .eq('id', id)
    .eq('hospital_id', hospital.id)
    .single()

  if (!booking) notFound()

  const nurseSelections: NurseSelection[] = booking.nurse_selections ?? []
  const deptBreakdown = booking.dept_breakdown ?? []
  const statusMeta = STATUS_META[booking.status] ?? STATUS_META.pending

  // Group nurse selections by dept
  const byDept: Record<string, { deptName: string; nurses: NurseSelection[] }> = {}
  for (const ns of nurseSelections) {
    if (!byDept[ns.deptId]) byDept[ns.deptId] = { deptName: ns.deptName, nurses: [] }
    byDept[ns.deptId].nurses.push(ns)
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <Link href="/hospital/booking" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Bookings
          </Link>
          <h1 className="dash-title" style={{ marginTop: 6 }}>Booking Request</h1>
          <p className="dash-sub">Submitted {new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <span style={{
          background: statusMeta.bg, color: statusMeta.color,
          padding: '8px 18px', borderRadius: 50, fontWeight: 700, fontSize: '0.85rem',
        }}>
          {statusMeta.label}
        </span>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: '📅', label: 'Period', value: `${new Date(booking.start_date).toLocaleDateString('en-GB')} – ${new Date(booking.end_date).toLocaleDateString('en-GB')}` },
          { icon: '⏱️', label: 'Duration', value: `${booking.duration_days} days` },
          { icon: '👩‍⚕️', label: 'Total Nurses', value: booking.total_nurses },
          { icon: '✅', label: 'Selected', value: nurseSelections.length },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--ink)' }}>{k.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Booking Details */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Booking Details</span></div>
          <div className="dash-card-body">
            <Row label="Booking Mode" value={booking.booking_mode === 'smart' ? '🤖 Smart Match' : '🔍 Browse'} />
            <Row label="Shifts" value={(booking.shifts ?? []).map((s: string) => `${SHIFT_META[s]?.icon ?? ''} ${SHIFT_META[s]?.label ?? s}`).join(', ')} />
            {booking.specializations?.length > 0 && <Row label="Specializations" value={booking.specializations.join(', ')} />}
            {booking.language_preference?.length > 0 && <Row label="Language Pref." value={booking.language_preference.join(', ')} />}
            {booking.gender_preference && booking.gender_preference !== 'any' && <Row label="Gender Pref." value={booking.gender_preference} />}
            {booking.special_instructions && <Row label="Instructions" value={booking.special_instructions} />}
            {booking.admin_notes && <Row label="Admin Notes" value={booking.admin_notes} />}
          </div>
        </div>

        {/* Dept Breakdown */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Department Breakdown</span></div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {deptBreakdown.length === 0 ? (
              <p style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>No department breakdown</p>
            ) : deptBreakdown.map((row: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: i < deptBreakdown.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--ink)' }}>{row.deptName}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {row.morning > 0 && <Tag label={`☀️ ${row.morning}`} color="#b85e00" />}
                  {row.evening > 0 && <Tag label={`🌤️ ${row.evening}`} color="#DD6B20" />}
                  {row.night   > 0 && <Tag label={`🌙 ${row.night}`}   color="#7B2FBE" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Nurses */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Selected Nurses ({nurseSelections.length})</span>
        </div>
        <div className="dash-card-body" style={{ padding: 0 }}>
          {nurseSelections.length === 0 ? (
            <p style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center' }}>No nurses selected yet</p>
          ) : (
            Object.entries(byDept).map(([deptId, { deptName, nurses }]) => (
              <div key={deptId}>
                <div style={{ padding: '10px 16px', background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {deptName}
                </div>
                {nurses.map((ns, i) => {
                  const shiftMeta = SHIFT_META[ns.shift] ?? { icon: '', color: '#666', label: ns.shift }
                  const nStatus = ns.status ?? 'pending'
                  const nsMeta = STATUS_META[nStatus] ?? STATUS_META.pending
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < nurses.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(14,123,140,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>👩‍⚕️</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{ns.nurseName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{ns.nurseSpecialization} · {shiftMeta.icon} {shiftMeta.label}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {ns.approvedAt && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                            {ns.approvedBy ? `by ${ns.approvedBy}` : ''} {new Date(ns.approvedAt).toLocaleDateString('en-GB')}
                          </span>
                        )}
                        <span style={{ background: nsMeta.bg, color: nsMeta.color, fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50, whiteSpace: 'nowrap' }}>
                          {nsMeta.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--muted)', minWidth: 110 }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: color + '15', color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
      {label}
    </span>
  )
}
