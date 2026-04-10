import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { respondToHospitalBooking } from './actions'

export const dynamic = 'force-dynamic'

const SHIFT_META: Record<string, { icon: string; color: string; bg: string; label: string; time: string }> = {
  morning: { icon: '☀️', color: '#b85e00', bg: '#FFF8E8', label: 'Morning', time: '07:00–14:00' },
  evening: { icon: '🌤️', color: '#DD6B20', bg: '#FFF3E0', label: 'Evening', time: '14:00–21:00' },
  night:   { icon: '🌙', color: '#7B2FBE', bg: '#EDE9FE', label: 'Night',   time: '21:00–07:00' },
}

const BOOKING_STATUS: Record<string, { bg: string; color: string; label: string; step: number }> = {
  pending:   { bg: 'rgba(181,94,0,0.08)',   color: '#b85e00', label: 'Pending Review',  step: 1 },
  reviewing: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', label: 'Under Review',    step: 2 },
  matched:   { bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', label: 'Nurses Matched',  step: 3 },
  confirmed: { bg: 'rgba(26,122,74,0.08)',  color: '#1A7A4A', label: 'Confirmed',        step: 4 },
  cancelled: { bg: 'rgba(224,74,74,0.06)',  color: '#E04A4A', label: 'Cancelled',        step: 0 },
}

const TIMELINE_STEPS = [
  { key: 'pending',   icon: '📋', label: 'Submitted' },
  { key: 'reviewing', icon: '🔍', label: 'Reviewing' },
  { key: 'matched',   icon: '✅', label: 'Matched' },
  { key: 'confirmed', icon: '🎉', label: 'Confirmed' },
]

export default async function ProviderHospitalBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireRole('provider')
  const supabase = createSupabaseServiceRoleClient()

  const { data: booking } = await supabase
    .from('hospital_booking_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (!booking) notFound()

  const allSelections: any[] = booking.nurse_selections ?? []
  const mySelections = allSelections.filter((ns: any) => ns.nurseId === user.id)
  if (mySelections.length === 0) notFound()

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, hospital_name, city, address, phone')
    .eq('id', booking.hospital_id)
    .single()

  const deptBreakdown: any[] = booking.dept_breakdown ?? []
  const bStatus = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.pending
  const isCancelled = booking.status === 'cancelled'

  // Determine if nurse can still respond
  const myResponse = mySelections[0]?.nurseResponse as string | undefined
  const adminStatus = mySelections[0]?.status as string | undefined
  // Nurse can respond if: admin has approved them AND they haven't responded yet
  const canRespond  = adminStatus === 'approved' && !myResponse && !isCancelled
  const hasResponded = !!myResponse

  return (
    <div className="dash-shell">

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/provider/bookings?type=hospital" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          ← Back to Hospital Bookings
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Hospital Booking Details</h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '4px 0 0' }}>
              {hospital?.hospital_name ?? '—'} · Submitted {new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span style={{ background: bStatus.bg, color: bStatus.color, padding: '7px 18px', borderRadius: 50, fontWeight: 700, fontSize: '0.82rem', border: `1px solid ${bStatus.color}30` }}>
            {bStatus.label}
          </span>
        </div>
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1.2rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            {TIMELINE_STEPS.map((step, i) => {
              const currentStep = bStatus.step
              const isDone   = currentStep > i + 1
              const isActive = currentStep === i + 1
              const isFuture = currentStep < i + 1
              return (
                <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div style={{ position: 'absolute', top: 18, left: '50%', width: '100%', height: 3, background: isDone ? 'var(--teal)' : 'var(--border)', zIndex: 0 }} />
                  )}
                  <div style={{ width: 36, height: 36, borderRadius: '50%', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', background: isDone || isActive ? 'var(--teal)' : 'var(--border)', boxShadow: isActive ? '0 0 0 4px rgba(14,123,140,0.18)' : 'none' }}>
                    {isDone ? <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>✓</span> : <span style={{ fontSize: '0.95rem', opacity: isFuture ? 0.4 : 1 }}>{step.icon}</span>}
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

      {/* Cancelled banner */}
      {isCancelled && (
        <div style={{ background: 'rgba(224,74,74,0.06)', border: '1.5px solid rgba(224,74,74,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: '1.5rem', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: '1.4rem' }}>❌</span>
          <div>
            <div style={{ fontWeight: 700, color: '#E04A4A', fontSize: '0.9rem' }}>Booking Cancelled</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>This hospital booking has been cancelled.</div>
          </div>
        </div>
      )}

      {/* ── ACTION REQUIRED BANNER (admin approved, awaiting nurse response) ── */}
      {canRespond && (
        <div style={{ background: 'rgba(14,123,140,0.06)', border: '2px solid rgba(14,123,140,0.3)', borderRadius: 14, padding: '20px 24px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: '1.4rem' }}>🔔</span>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '0.95rem' }}>Action Required — Accept or Reject This Assignment</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
                Admin has approved your selection. Please confirm whether you accept this hospital booking assignment.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <form action={respondToHospitalBooking.bind(null, id, 'accepted')}>
              <button type="submit" style={{
                background: '#27A869', color: '#fff', border: 'none',
                padding: '10px 28px', borderRadius: 9, fontSize: '0.88rem',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ✅ Accept Assignment
              </button>
            </form>
            <form action={respondToHospitalBooking.bind(null, id, 'rejected')}>
              <button type="submit" style={{
                background: 'rgba(224,74,74,0.08)', color: '#E04A4A',
                border: '1.5px solid rgba(224,74,74,0.3)',
                padding: '10px 28px', borderRadius: 9, fontSize: '0.88rem',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                ✕ Reject Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Show nurse response if already responded */}
      {hasResponded && !isCancelled && (
        <div style={{
          background: myResponse === 'accepted' ? 'rgba(26,122,74,0.06)' : 'rgba(224,74,74,0.06)',
          border: `1.5px solid ${myResponse === 'accepted' ? 'rgba(26,122,74,0.2)' : 'rgba(224,74,74,0.2)'}`,
          borderRadius: 12, padding: '14px 20px', marginBottom: '1.5rem',
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <span style={{ fontSize: '1.3rem' }}>{myResponse === 'accepted' ? '✅' : '✕'}</span>
          <div>
            <div style={{ fontWeight: 700, color: myResponse === 'accepted' ? '#1A7A4A' : '#E04A4A', fontSize: '0.9rem' }}>
              You {myResponse === 'accepted' ? 'Accepted' : 'Rejected'} this assignment
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
              {myResponse === 'accepted'
                ? 'You have confirmed your availability for this hospital booking.'
                : 'You have declined this assignment. The hospital will be notified.'}
            </div>
          </div>
        </div>
      )}

      {/* Waiting for admin approval notice */}
      {!isCancelled && adminStatus === 'pending' && !hasResponded && (
        <div style={{ background: '#FFF8F0', border: '1px solid rgba(181,94,0,0.25)', borderRadius: 12, padding: '14px 20px', marginBottom: '1.5rem', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: '1.3rem' }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700, color: '#b85e00', fontSize: '0.88rem' }}>Awaiting Admin Approval</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
              Admin is reviewing your selection for this booking. You'll be able to accept or reject once approved.
            </div>
          </div>
        </div>
      )}

      {/* My Assignment(s) */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--teal)' }}>
        <div className="dash-card-header">
          <span className="dash-card-title">👩‍⚕️ My Assignment{mySelections.length > 1 ? 's' : ''}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{mySelections.length} role{mySelections.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)' }}>
                {['Department', 'Shift', 'Specialization', 'Admin Approval', 'My Response', 'Reviewed By', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mySelections.map((ns: any, i: number) => {
                const shiftMeta  = SHIFT_META[ns.shift] ?? { icon: '', color: '#666', bg: '#f9f9f9', label: ns.shift, time: '' }
                const approval   = ns.status ?? 'pending'
                const nurseResp  = ns.nurseResponse as string | undefined

                const adminBadge = approval === 'approved'
                  ? { bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A', label: '✅ Approved' }
                  : approval === 'rejected'
                  ? { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: '✕ Rejected' }
                  : { bg: 'rgba(181,94,0,0.08)', color: '#b85e00', label: '⏳ Pending' }

                const respBadge = !nurseResp
                  ? { bg: 'rgba(181,94,0,0.08)', color: '#b85e00', label: '— Not yet' }
                  : nurseResp === 'accepted'
                  ? { bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A', label: '✅ Accepted' }
                  : { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: '✕ Rejected' }

                return (
                  <tr key={i} style={{ borderBottom: i < mySelections.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: 'var(--ink)' }}>{ns.deptName}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: shiftMeta.bg, color: shiftMeta.color, padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {shiftMeta.icon} {shiftMeta.label}
                        <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>· {shiftMeta.time}</span>
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: 'rgba(14,123,140,0.07)', color: 'var(--teal)', padding: '3px 9px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600 }}>{ns.nurseSpecialization ?? '—'}</span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: adminBadge.bg, color: adminBadge.color, padding: '4px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{adminBadge.label}</span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: respBadge.bg, color: respBadge.color, padding: '4px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{respBadge.label}</span>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '0.78rem', color: ns.approvedBy ? 'var(--ink)' : 'var(--muted)', fontWeight: ns.approvedBy ? 600 : 400 }}>{ns.approvedBy ?? '—'}</td>
                    <td style={{ padding: '13px 16px', fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {ns.approvedAt ? new Date(ns.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-col: Booking Details + Shifts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">📋 Booking Details</span></div>
          <div className="dash-card-body">
            <InfoRow label="Hospital"     value={hospital?.hospital_name ?? '—'} />
            <InfoRow label="City"         value={hospital?.city ?? '—'} />
            {hospital?.address && <InfoRow label="Address" value={hospital.address} />}
            {hospital?.phone  && <InfoRow label="Phone"   value={hospital.phone} />}
            <InfoRow label="Start Date"   value={new Date(booking.start_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} />
            <InfoRow label="End Date"     value={new Date(booking.end_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} />
            <InfoRow label="Duration"     value={`${booking.duration_days} days`} />
            <InfoRow label="Total Nurses" value={booking.total_nurses} />
            {booking.gender_preference && booking.gender_preference !== 'any' && (
              <InfoRow label="Gender Pref." value={booking.gender_preference} />
            )}
            {booking.language_preference?.length > 0 && (
              <InfoRow label="Languages" value={booking.language_preference.join(', ')} />
            )}
            {booking.special_instructions && (
              <InfoRow label="Instructions" value={booking.special_instructions} />
            )}
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">🕐 Shifts & Specializations</span></div>
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
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Specializations</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {booking.specializations.map((s: string) => (
                    <span key={s} style={{ background: 'rgba(14,123,140,0.07)', color: 'var(--teal)', padding: '4px 10px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      {deptBreakdown.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">🏢 Department Breakdown</span></div>
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
                  const isMyDept = mySelections.some((ns: any) => ns.deptId === row.deptId || ns.deptName === row.deptName)
                  return (
                    <tr key={i} style={{ borderBottom: i < deptBreakdown.length - 1 ? '1px solid var(--border)' : 'none', background: isMyDept ? 'rgba(14,123,140,0.04)' : 'transparent' }}>
                      <td style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--ink)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isMyDept && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block', flexShrink: 0 }} />}
                          {row.deptName}
                          {isMyDept && <span style={{ fontSize: '0.65rem', color: 'var(--teal)', fontWeight: 600 }}>(My dept)</span>}
                        </div>
                      </td>
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
            </table>
          </div>
        </div>
      )}

    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', flexShrink: 0, minWidth: 110, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, textAlign: 'right', color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}
