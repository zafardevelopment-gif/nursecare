import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { updateBookingStatusAction, updateNurseApprovalAction } from './actions'

export const dynamic = 'force-dynamic'

type NurseSelection = {
  deptId: string; deptName: string; shift: string
  nurseId: string; nurseName: string; nurseSpecialization: string
  status?: 'pending' | 'approved' | 'rejected'
  approvedBy?: string; approvedAt?: string
}

const SHIFT_META: Record<string, { icon: string; color: string; label: string }> = {
  morning: { icon: '☀️', color: '#b85e00', label: 'Morning' },
  evening: { icon: '🌤️', color: '#DD6B20', label: 'Evening' },
  night:   { icon: '🌙', color: '#7B2FBE', label: 'Night' },
}

const NURSE_STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#FFF8F0', color: '#b85e00', label: '⏳ Pending' },
  approved: { bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A', label: '✅ Approved' },
  rejected: { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: '✕ Rejected' },
}

const BOOKING_STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: '#FFF8F0', color: '#b85e00', label: '⏳ Pending' },
  reviewing: { bg: '#EFF6FF', color: '#3B82F6', label: '🔍 Reviewing' },
  matched:   { bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', label: '✅ Matched' },
  confirmed: { bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A', label: '✅ Confirmed' },
  cancelled: { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: '✕ Cancelled' },
}

export default async function AdminHospitalBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { data: booking } = await supabase
    .from('hospital_booking_requests')
    .select(`
      *, hospitals ( hospital_name, city, contact_person, phone )
    `)
    .eq('id', id)
    .single()

  if (!booking) notFound()

  const hospital = (booking.hospitals as any)
  const nurseSelections: NurseSelection[] = booking.nurse_selections ?? []
  const deptBreakdown = booking.dept_breakdown ?? []
  const bsm = BOOKING_STATUS_META[booking.status] ?? BOOKING_STATUS_META.pending

  // Group nurses by dept
  const byDept: Record<string, { deptName: string; nurses: { ns: NurseSelection; index: number }[] }> = {}
  nurseSelections.forEach((ns, index) => {
    if (!byDept[ns.deptId]) byDept[ns.deptId] = { deptName: ns.deptName, nurses: [] }
    byDept[ns.deptId].nurses.push({ ns, index })
  })

  const approvedCount = nurseSelections.filter(n => n.status === 'approved').length
  const rejectedCount = nurseSelections.filter(n => n.status === 'rejected').length
  const pendingCount  = nurseSelections.filter(n => !n.status || n.status === 'pending').length

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <Link href="/admin/hospital-bookings" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Hospital Bookings
          </Link>
          <h1 className="dash-title" style={{ marginTop: 6 }}>Booking Request</h1>
          <p className="dash-sub">{hospital?.hospital_name} · Submitted {new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <span style={{ background: bsm.bg, color: bsm.color, padding: '8px 18px', borderRadius: 50, fontWeight: 700, fontSize: '0.85rem' }}>
          {bsm.label}
        </span>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: '🏥', label: 'Hospital',  value: hospital?.hospital_name ?? '—' },
          { icon: '📅', label: 'Period',    value: `${new Date(booking.start_date).toLocaleDateString('en-GB')} – ${new Date(booking.end_date).toLocaleDateString('en-GB')}` },
          { icon: '⏱️', label: 'Duration',  value: `${booking.duration_days} days` },
          { icon: '👩‍⚕️', label: 'Requested', value: booking.total_nurses },
          { icon: '✅', label: 'Approved',  value: approvedCount },
          { icon: '⏳', label: 'Pending',   value: pendingCount },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: 5 }}>{k.icon}</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)', wordBreak: 'break-word' }}>{k.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Booking Details */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Booking Details</span></div>
          <div className="dash-card-body">
            <Row label="Hospital"        value={hospital?.hospital_name ?? '—'} />
            <Row label="City"            value={hospital?.city ?? '—'} />
            <Row label="Contact"         value={hospital?.contact_person ?? '—'} />
            <Row label="Phone"           value={hospital?.phone ?? '—'} />
            <Row label="Booking Mode"    value={booking.booking_mode === 'smart' ? '🤖 Smart Match' : '🔍 Browse'} />
            <Row label="Shifts"          value={(booking.shifts ?? []).map((s: string) => `${SHIFT_META[s]?.icon ?? ''} ${SHIFT_META[s]?.label ?? s}`).join(', ')} />
            {booking.specializations?.length > 0 && <Row label="Specializations"   value={booking.specializations.join(', ')} />}
            {booking.language_preference?.length > 0 && <Row label="Language Pref."    value={booking.language_preference.join(', ')} />}
            {booking.gender_preference && booking.gender_preference !== 'any' && <Row label="Gender Pref."      value={booking.gender_preference} />}
            {booking.special_instructions && <Row label="Instructions"    value={booking.special_instructions} />}
          </div>
        </div>

        {/* Update Status + Admin Notes */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Update Booking Status</span></div>
          <div className="dash-card-body">
            <form action={updateBookingStatusAction}>
              <input type="hidden" name="booking_id" value={booking.id} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Status</label>
                <select name="status" defaultValue={booking.status} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: '0.85rem' }}>
                  <option value="pending">⏳ Pending</option>
                  <option value="reviewing">🔍 Reviewing</option>
                  <option value="matched">✅ Matched</option>
                  <option value="confirmed">✅ Confirmed</option>
                  <option value="cancelled">✕ Cancelled</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Admin Notes</label>
                <textarea name="admin_notes" defaultValue={booking.admin_notes ?? ''} rows={4} placeholder="Internal notes for this booking request…" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" style={{ background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff', padding: '9px 22px', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer', width: '100%' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Dept Breakdown */}
      {deptBreakdown.length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1rem' }}>
          <div className="dash-card-header"><span className="dash-card-title">Department Breakdown</span></div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {deptBreakdown.map((row: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: i < deptBreakdown.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)' }}>{row.deptName}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {row.morning > 0 && <Tag label={`☀️ ${row.morning}`} color="#b85e00" />}
                  {row.evening > 0 && <Tag label={`🌤️ ${row.evening}`} color="#DD6B20" />}
                  {row.night   > 0 && <Tag label={`🌙 ${row.night}`}   color="#7B2FBE" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Nurses — per-nurse approve/reject */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Selected Nurses ({nurseSelections.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ ...NURSE_STATUS_META.approved, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>{approvedCount} approved</span>
            <span style={{ ...NURSE_STATUS_META.rejected, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>{rejectedCount} rejected</span>
            <span style={{ ...NURSE_STATUS_META.pending,  fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>{pendingCount} pending</span>
          </div>
        </div>
        <div className="dash-card-body" style={{ padding: 0 }}>
          {nurseSelections.length === 0 ? (
            <p style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center' }}>No nurses selected by hospital</p>
          ) : (
            Object.entries(byDept).map(([deptId, { deptName, nurses }]) => (
              <div key={deptId}>
                <div style={{ padding: '10px 16px', background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {deptName}
                </div>
                {nurses.map(({ ns, index }) => {
                  const shiftMeta = SHIFT_META[ns.shift] ?? { icon: '', color: '#666', label: ns.shift }
                  const nsMeta = NURSE_STATUS_META[ns.status ?? 'pending']
                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(14,123,140,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>👩‍⚕️</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{ns.nurseName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                            {ns.nurseSpecialization} · <span style={{ color: shiftMeta.color }}>{shiftMeta.icon} {shiftMeta.label}</span>
                          </div>
                          {ns.approvedBy && ns.approvedAt && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>
                              {ns.status === 'approved' ? 'Approved' : 'Reviewed'} by {ns.approvedBy} · {new Date(ns.approvedAt).toLocaleDateString('en-GB')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: nsMeta.bg, color: nsMeta.color, fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>
                          {nsMeta.label}
                        </span>
                        {/* Approve button */}
                        {ns.status !== 'approved' && (
                          <form action={updateNurseApprovalAction} style={{ display: 'inline' }}>
                            <input type="hidden" name="booking_id"   value={booking.id} />
                            <input type="hidden" name="nurse_index"  value={index} />
                            <input type="hidden" name="nurse_status" value="approved" />
                            <button type="submit" style={{ background: 'rgba(26,122,74,0.1)', color: '#1A7A4A', border: '1px solid rgba(26,122,74,0.25)', padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              ✅ Approve
                            </button>
                          </form>
                        )}
                        {/* Reject button */}
                        {ns.status !== 'rejected' && (
                          <form action={updateNurseApprovalAction} style={{ display: 'inline' }}>
                            <input type="hidden" name="booking_id"   value={booking.id} />
                            <input type="hidden" name="nurse_index"  value={index} />
                            <input type="hidden" name="nurse_status" value="rejected" />
                            <button type="submit" style={{ background: 'rgba(224,74,74,0.06)', color: '#E04A4A', border: '1px solid rgba(224,74,74,0.2)', padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              ✕ Reject
                            </button>
                          </form>
                        )}
                        {/* Reset to pending */}
                        {(ns.status === 'approved' || ns.status === 'rejected') && (
                          <form action={updateNurseApprovalAction} style={{ display: 'inline' }}>
                            <input type="hidden" name="booking_id"   value={booking.id} />
                            <input type="hidden" name="nurse_index"  value={index} />
                            <input type="hidden" name="nurse_status" value="pending" />
                            <button type="submit" style={{ background: 'var(--shell-bg)', color: 'var(--muted)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 7, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                              ↺ Reset
                            </button>
                          </form>
                        )}
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
      <span style={{ fontSize: '0.82rem', color: 'var(--muted)', minWidth: 110, flexShrink: 0 }}>{label}</span>
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
