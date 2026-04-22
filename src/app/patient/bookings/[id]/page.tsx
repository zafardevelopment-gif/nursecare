import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PatientReportNoShowBtn, DisputeBanner } from '@/app/components/ReportIssueModal'
import { CancelBookingBtn } from '../CancelBookingBtn'
import { RescheduleBtn } from '../RescheduleBtn'
import { CancelRequestBtn } from '../CancelRequestBtn'

export const dynamic = 'force-dynamic'

/* ── Status config ─────────────────────────────────────────── */

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Awaiting Nurse' },
  accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Nurse Confirmed' },
  confirmed:   { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
  declined:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
  in_progress: { bg: 'rgba(14,123,140,0.12)', color: '#0E7B8C', label: '🔄 In Progress' },
  work_done:   { bg: 'rgba(107,63,160,0.1)',  color: '#6B3FA0', label: '✅ Work Done — Confirm?' },
  completed:   { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
  cancelled:   { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Cancelled' },
  no_show:     { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '🚨 No-Show Reported' },
  disputed:    { bg: 'rgba(224,74,74,0.08)',  color: '#E04A4A', label: '⚠️ Disputed' },
}

/* ── Status tracker steps ──────────────────────────────────── */

type StepId = 'submitted' | 'nurse_confirmed' | 'paid' | 'in_progress' | 'completed'

const STEPS: { id: StepId; label: string; icon: string }[] = [
  { id: 'submitted',      label: 'Submitted',      icon: '📋' },
  { id: 'nurse_confirmed', label: 'Nurse OK',       icon: '👩‍⚕️' },
  { id: 'paid',            label: 'Paid',           icon: '💳' },
  { id: 'in_progress',     label: 'In Progress',    icon: '🔄' },
  { id: 'completed',       label: 'Completed',      icon: '✅' },
]

function getActiveStep(status: string, paymentStatus: string): number {
  if (status === 'completed' || status === 'work_done') return 4
  if (status === 'in_progress') return 3
  if (paymentStatus === 'paid') return 2
  if (status === 'accepted' || status === 'confirmed') return 1
  return 0
}

/* ── Types ─────────────────────────────────────────────────── */

interface Props {
  params: Promise<{ id: string }>
}

/* ── Page ──────────────────────────────────────────────────── */

export default async function BookingDetailPage({ params }: Props) {
  const user = await requireRole('patient')
  const supabase = await createSupabaseServerClient()
  const { id } = await params

  const serviceSupabase = createSupabaseServiceRoleClient()

  const [
    { data: b },
    { data: platformSettings },
    { data: ledgerItems },
    { data: changeRequests },
  ] = await Promise.all([
    supabase.from('booking_requests').select('*').eq('id', id).eq('patient_id', user.id).single(),
    serviceSupabase.from('platform_settings').select('share_provider_phone_with_patient, require_nurse_approval, free_cancellation_hours').limit(1).single(),
    serviceSupabase.from('booking_service_items').select('id, service_name, unit_price, quantity').eq('booking_id', id).order('created_at'),
    serviceSupabase.from('booking_change_requests').select('id, request_type, status, new_date, new_shift, reason, admin_note, created_at').eq('booking_id', id).order('created_at', { ascending: false }),
  ])

  if (!b) notFound()

  const sharePhone           = platformSettings?.share_provider_phone_with_patient ?? false
  const requireNurseApproval = (platformSettings as any)?.require_nurse_approval ?? true
  const freeCancelHours: number = (platformSettings as any)?.free_cancellation_hours ?? 24

  let nursePhone: string | null = null
  if (sharePhone && b.nurse_id) {
    const { data: nurseRow } = await supabase.from('nurses').select('phone').eq('user_id', b.nurse_id).single()
    nursePhone = nurseRow?.phone ?? null
  }

  const effectiveStatus = (!requireNurseApproval && b.status === 'pending') ? 'accepted' : b.status
  const s = statusStyle[effectiveStatus] ?? statusStyle.pending
  const typeLabel = b.booking_type === 'weekly' ? '🔁 Weekly' : b.booking_type === 'monthly' ? '📆 Monthly' : '📅 One-Time'

  // Button logic
  const terminal = ['cancelled', 'declined', 'completed', 'no_show', 'disputed']
  const isTerminal = terminal.includes(b.status)

  const cancellable = ['pending', 'accepted', 'confirmed'].includes(b.status)
  let cancelAllowed = cancellable
  if (cancellable && freeCancelHours > 0 && b.start_date) {
    const SHIFT_H: Record<string, number> = { morning: 8, evening: 16, night: 0 }
    const sh = SHIFT_H[(b.shift ?? '').toLowerCase()] ?? 0
    const shiftStart = new Date(`${b.start_date}T${String(sh).padStart(2,'0')}:00:00`)
    const deadline = new Date(shiftStart.getTime() - freeCancelHours * 60 * 60 * 1000)
    cancelAllowed = new Date() <= deadline
  }

  // Late-cancel request: past the free window but booking not terminal yet
  const lateCancel = !isTerminal && cancellable && !cancelAllowed
  // In-progress cancel request
  const inProgressCancel = b.status === 'in_progress'

  // Reschedule: allowed for pending/accepted/confirmed
  const reschedulable = ['pending', 'accepted', 'confirmed'].includes(b.status)
  const hasPendingReschedule = (changeRequests ?? []).some(r => r.request_type === 'reschedule' && r.status === 'pending')
  const hasPendingCancel     = (changeRequests ?? []).some(r => r.request_type === 'cancel'     && r.status === 'pending')

  const activeStep = getActiveStep(b.status, b.payment_status ?? 'unpaid')

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/patient/bookings" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            ← My Bookings
          </Link>
        </div>
      </div>

      <div className="dash-card">
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,rgba(14,123,140,0.1),rgba(10,191,204,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem', flexShrink: 0 }}>
              🏥
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{b.service_type ?? 'Booking'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>{s.label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{typeLabel}</span>
                {b.payment_status === 'paid'
                  ? <span style={{ background:'rgba(39,168,105,0.1)', color:'#27A869', fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:50 }}>💳 Paid</span>
                  : (effectiveStatus !== 'declined' && effectiveStatus !== 'cancelled')
                    ? <span style={{ background:'rgba(245,132,42,0.1)', color:'#F5842A', fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:50 }}>💳 Payment Pending</span>
                    : null
                }
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'right' }}>
            <div>Booking ID</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', marginTop: 2 }}>{b.id}</div>
            <div style={{ marginTop: 4 }}>{b.created_at && new Date(b.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        {/* ── Status Tracker ─────────────────────────────────── */}
        {!isTerminal && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(14,123,140,0.02)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Booking Progress
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {STEPS.map((step, i) => {
                const done    = i < activeStep
                const current = i === activeStep
                const future  = i > activeStep
                const isLast  = i === STEPS.length - 1

                const circleColor = done ? '#27A869' : current ? '#0E7B8C' : 'var(--border)'
                const textColor   = done ? '#27A869' : current ? '#0E7B8C' : 'var(--muted)'
                const lineColor   = done ? '#27A869' : 'var(--border)'

                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 'none' : 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: done ? '#27A869' : current ? 'rgba(14,123,140,0.12)' : 'var(--cream)',
                        border: `2px solid ${circleColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: done ? '0.9rem' : '1rem',
                        fontWeight: 700,
                        color: done ? '#fff' : textColor,
                        transition: 'all 0.2s',
                      }}>
                        {done ? '✓' : step.icon}
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: current ? 700 : 600, color: textColor, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {step.label}
                      </div>
                    </div>
                    {!isLast && (
                      <div style={{ flex: 1, height: 2, background: lineColor, margin: '0 4px', marginBottom: 18, transition: 'background 0.2s' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Dispute banner ──────────────────────────────────── */}
        {b.dispute_status && b.dispute_status !== 'none' && (
          <div style={{ padding: '1rem 1.5rem 0' }}>
            <DisputeBanner
              disputeType={b.dispute_type ?? null}
              disputeReason={b.dispute_reason ?? null}
              disputeStatus={b.dispute_status}
              disputeRaisedAt={b.dispute_raised_at ?? null}
              disputeResolution={b.dispute_resolution ?? null}
              role="patient"
            />
          </div>
        )}

        {/* ── Report no-show ──────────────────────────────────── */}
        {['accepted', 'confirmed', 'in_progress'].includes(b.status) && (!b.dispute_status || b.dispute_status === 'none') && (
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(245,132,42,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>Did the nurse arrive as scheduled?</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>If the provider did not show up, you can report a no-show for admin review.</div>
            </div>
            <PatientReportNoShowBtn bookingId={b.id} />
          </div>
        )}

        {/* ── Details grid ────────────────────────────────────── */}
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <DetailRow icon="👩‍⚕️" label="Assigned Nurse" value={b.nurse_name ?? '—'} />
          {sharePhone && nursePhone && (
            <DetailRow icon="📞" label="Nurse Phone" value={nursePhone} />
          )}
          <DetailRow icon="📅" label="Start Date" value={b.start_date ?? '—'} />
          {b.end_date && b.end_date !== b.start_date && (
            <DetailRow icon="📅" label="End Date" value={b.end_date} />
          )}
          <DetailRow icon="🕐" label="Shift" value={b.shift ?? '—'} />
          <DetailRow icon="⏱" label="Duration" value={b.duration_hours ? `${b.duration_hours} hours` : '—'} />
          {b.shift && b.duration_hours && (
            <DetailRow icon="🕰" label="Work Hours" value={shiftTimeRange(b.shift, b.duration_hours)} />
          )}
          <DetailRow icon="📆" label="Booking Type" value={typeLabel} />
          {b.total_sessions && (
            <DetailRow icon="🔢" label="Sessions" value={String(b.total_sessions)} />
          )}
          <DetailRow icon="📍" label="City" value={b.city ?? '—'} />
          {b.address && <DetailRow icon="📌" label="Address" value={b.address} />}
          {b.hourly_rate && (
            <DetailRow icon="💰" label="Hourly Rate" value={`SAR ${b.hourly_rate}`} />
          )}
          {b.total_amount && (
            <DetailRow icon="💳" label="Total Amount" value={`SAR ${b.total_amount}`} />
          )}
        </div>

        {/* ── Notes ───────────────────────────────────────────── */}
        {b.notes && (
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>📝 Notes</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink)', lineHeight: 1.6 }}>{b.notes}</div>
            </div>
          </div>
        )}

        {/* ── Pricing Ledger ──────────────────────────────────── */}
        {ledgerItems && ledgerItems.length > 0 && (
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '0.8rem 1rem', background: 'var(--cream)', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                💰 Service Pricing
              </div>
              {ledgerItems.map((item) => {
                const lineTotal = Number(item.unit_price) * (item.quantity ?? 1)
                return (
                  <div key={item.id} style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)' }}>{item.service_name}</div>
                      {(item.quantity ?? 1) > 1 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>SAR {Number(item.unit_price).toFixed(2)} × {item.quantity}</div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0E7B8C', whiteSpace: 'nowrap' }}>
                      SAR {lineTotal.toFixed(2)}
                    </div>
                  </div>
                )
              })}
              <div style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', background: 'rgba(14,123,140,0.04)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)' }}>Ledger Total</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0E7B8C' }}>
                  SAR {ledgerItems.reduce((sum, i) => sum + Number(i.unit_price) * (i.quantity ?? 1), 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Change Requests ─────────────────────────────────── */}
        {changeRequests && changeRequests.length > 0 && (
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '0.8rem 1rem', background: 'var(--cream)', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📋 Change Requests
              </div>
              {changeRequests.map((cr, i) => {
                const crStyle = cr.status === 'approved'
                  ? { bg: 'rgba(39,168,105,0.07)', color: '#27A869', dot: '#27A869' }
                  : cr.status === 'rejected'
                  ? { bg: 'rgba(224,74,74,0.07)', color: '#E04A4A', dot: '#E04A4A' }
                  : { bg: 'rgba(245,132,42,0.07)', color: '#b36b00', dot: '#F5842A' }
                const label = cr.request_type === 'reschedule' ? '📅 Reschedule Request' : '✕ Cancellation Request'
                return (
                  <div key={cr.id} style={{ padding: '1rem', background: crStyle.bg, borderBottom: i < changeRequests.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>{label}</div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: crStyle.color, background: 'white', padding: '2px 8px', borderRadius: 50, border: `1px solid ${crStyle.color}`, whiteSpace: 'nowrap' }}>
                        {cr.status.charAt(0).toUpperCase() + cr.status.slice(1)}
                      </span>
                    </div>
                    {cr.new_date && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>Requested date: <strong>{cr.new_date}</strong>{cr.new_shift ? ` (${cr.new_shift})` : ''}</div>
                    )}
                    {cr.reason && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>Reason: {cr.reason}</div>
                    )}
                    {cr.admin_note && (
                      <div style={{ fontSize: '0.78rem', marginTop: 6, padding: '6px 10px', background: 'white', borderRadius: 6, border: `1px solid ${crStyle.color}`, color: 'var(--ink)' }}>
                        <span style={{ fontWeight: 700, color: crStyle.color }}>Admin note: </span>{cr.admin_note}
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4 }}>
                      {new Date(cr.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Footer actions ──────────────────────────────────── */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* Free-window cancel */}
            {cancelAllowed && !hasPendingCancel && (
              <CancelBookingBtn requestId={b.id} />
            )}
            {/* Late cancel (past window) or in-progress cancel → soft request */}
            {(lateCancel || inProgressCancel) && !hasPendingCancel && (
              <CancelRequestBtn bookingId={b.id} />
            )}
            {/* Reschedule */}
            {reschedulable && !hasPendingReschedule && (
              <RescheduleBtn bookingId={b.id} currentDate={b.start_date ?? ''} />
            )}
            {/* Pending-request badges */}
            {hasPendingReschedule && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b36b00', background: 'rgba(245,132,42,0.1)', padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(245,132,42,0.25)' }}>
                ⏳ Reschedule Pending
              </span>
            )}
            {hasPendingCancel && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b36b00', background: 'rgba(245,132,42,0.1)', padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(245,132,42,0.25)' }}>
                ⏳ Cancellation Pending
              </span>
            )}
          </div>
          <Link href="/patient/bookings" style={{
            padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--cream)', color: 'var(--muted)', fontSize: '0.85rem',
            fontWeight: 600, textDecoration: 'none',
          }}>
            ← Back to Bookings
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────────── */

function shiftTimeRange(shift: string, durationHours: number): string {
  const START: Record<string, number> = { morning: 8, evening: 16, night: 0 }
  const startH = START[shift.toLowerCase()] ?? null
  if (startH === null) return `${durationHours}h`
  const endH = (startH + durationHours) % 24
  const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`
  return `${fmt(startH)} – ${fmt(endH)}`
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '0.88rem', color: 'var(--ink)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}
