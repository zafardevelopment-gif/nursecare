import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { updateDisputeStatus } from '@/app/actions/disputeActions'

export const dynamic = 'force-dynamic'

const DISPUTE_TYPE_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  provider_no_show: { icon: '🚨', label: 'Provider No-Show',  color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
  patient_absent:   { icon: '🚪', label: 'Patient Absent',    color: '#b85e00', bg: 'rgba(181,94,0,0.08)'  },
  access_denied:    { icon: '🔒', label: 'Access Denied',     color: '#7B2FBE', bg: 'rgba(123,47,190,0.08)' },
  quality_issue:    { icon: '⚠️', label: 'Quality Issue',     color: '#b85e00', bg: 'rgba(181,94,0,0.08)'  },
  other:            { icon: '📝', label: 'Other',             color: '#8A9BAA', bg: 'rgba(138,155,170,0.08)' },
}

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { data: b } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('id', id)
    .not('dispute_type', 'is', null)
    .single()

  if (!b) notFound()

  const dtm = DISPUTE_TYPE_META[b.dispute_type ?? 'other'] ?? DISPUTE_TYPE_META.other
  const isResolved = b.dispute_status === 'resolved'

  // Resolve-action outcomes by dispute type
  const OUTCOMES: Record<string, { value: string; label: string; newStatus: string }[]> = {
    provider_no_show: [
      { value: 'full_refund_cancel',    label: '💸 Issue full refund + cancel booking',        newStatus: 'cancelled' },
      { value: 'reschedule',            label: '🔄 Reschedule — revert to accepted',           newStatus: 'accepted'  },
      { value: 'warn_provider',         label: '⚠️ Warn provider, keep booking active',       newStatus: 'accepted'  },
      { value: 'no_action',             label: '📝 No action required (false report)',          newStatus: b.status    },
    ],
    patient_absent: [
      { value: 'charge_patient',        label: '💸 Charge patient (no refund), mark completed', newStatus: 'completed' },
      { value: 'reschedule',            label: '🔄 Reschedule — revert to accepted',            newStatus: 'accepted'  },
      { value: 'no_action',             label: '📝 No action required (false report)',           newStatus: b.status   },
    ],
    access_denied: [
      { value: 'charge_patient',        label: '💸 Charge patient (access issue), mark complete', newStatus: 'completed' },
      { value: 'reschedule',            label: '🔄 Reschedule — revert to accepted',               newStatus: 'accepted'  },
      { value: 'no_action',             label: '📝 No action required',                             newStatus: b.status   },
    ],
  }
  const outcomes = OUTCOMES[b.dispute_type ?? 'other'] ?? OUTCOMES.patient_absent

  return (
    <div className="dash-shell">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/disputes" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Disputes
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="dash-title" style={{ margin: 0 }}>Dispute Review</h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'var(--shell-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking ID</span>
              <code style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)' }}>{id.slice(0, 8).toUpperCase()}</code>
            </div>
          </div>
          <span style={{ background: dtm.bg, color: dtm.color, padding: '8px 18px', borderRadius: 50, fontWeight: 700, fontSize: '0.85rem', border: `1px solid ${dtm.color}25` }}>
            {dtm.icon} {dtm.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Dispute details */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">📋 Dispute Details</span></div>
          <div className="dash-card-body">
            <Row label="Issue Type"      value={`${dtm.icon} ${dtm.label}`} />
            <Row label="Dispute Status"  value={b.dispute_status ?? 'open'} />
            <Row label="Booking Status"  value={b.status} />
            <Row label="Reported At"     value={b.dispute_raised_at ? new Date(b.dispute_raised_at).toLocaleString('en-GB') : '—'} />
            <Row label="Patient"         value={b.patient_name ?? '—'} />
            <Row label="Provider"        value={b.nurse_name ?? '—'} />
            <Row label="Service"         value={b.service_type ?? '—'} />
            <Row label="Scheduled Date"  value={b.start_date ?? '—'} />
            {b.city && <Row label="Location" value={b.city} />}
          </div>
        </div>

        {/* Report reason */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">🗒️ Report Reason</span></div>
          <div className="dash-card-body">
            {b.dispute_reason ? (
              <div style={{ background: 'var(--shell-bg)', border: '1px solid var(--border)', borderRadius: 9, padding: '14px 16px', lineHeight: 1.6, fontSize: '0.88rem', color: 'var(--ink)' }}>
                "{b.dispute_reason}"
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No description provided.</p>
            )}

            {isResolved && b.dispute_resolution && (
              <div style={{ marginTop: 16, background: 'rgba(26,122,74,0.06)', border: '1px solid rgba(26,122,74,0.2)', borderRadius: 9, padding: '14px 16px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1A7A4A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>✅ Admin Resolution</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink)', lineHeight: 1.5 }}>{b.dispute_resolution}</div>
                {b.dispute_resolved_at && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 6 }}>
                    Resolved {new Date(b.dispute_resolved_at).toLocaleString('en-GB')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolution form */}
      {!isResolved && (
        <div className="dash-card" style={{ borderLeft: '4px solid var(--teal)' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">⚖️ Resolve Dispute</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Choose an outcome and add notes</span>
          </div>
          <div className="dash-card-body">

            {/* Mark under review */}
            {b.dispute_status === 'open' && (
              <form action={updateDisputeStatus} style={{ marginBottom: 20 }}>
                <input type="hidden" name="booking_id"     value={b.id} />
                <input type="hidden" name="dispute_status" value="under_review" />
                <input type="hidden" name="booking_status" value={b.status} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 9, marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#3B82F6', fontWeight: 600, flex: 1 }}>🔵 Mark as Under Review to begin investigation</span>
                  <button type="submit" style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#3B82F6', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    Start Review
                  </button>
                </div>
              </form>
            )}

            {/* Resolve with outcome */}
            <form action={updateDisputeStatus}>
              <input type="hidden" name="booking_id"     value={b.id} />
              <input type="hidden" name="dispute_status" value="resolved" />

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Resolution Outcome
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {outcomes.map((o, i) => (
                    <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--shell-bg)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
                      <input
                        type="radio"
                        name="booking_status"
                        value={o.newStatus}
                        defaultChecked={i === 0}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--teal)' }}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Resolution Notes <span style={{ color: 'var(--teal)' }}>(required)</span>
                </label>
                <textarea
                  name="resolution"
                  required
                  rows={4}
                  placeholder="Describe the investigation findings and decision taken…"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 9,
                    border: '1.5px solid var(--border)', background: 'var(--shell-bg)',
                    color: 'var(--ink)', fontSize: '0.85rem', resize: 'vertical',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>

              <button type="submit" style={{
                background: 'linear-gradient(135deg,#1A7A4A,#27A869)',
                color: '#fff', padding: '10px 28px', borderRadius: 9,
                fontWeight: 700, fontSize: '0.9rem', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ✅ Resolve Dispute
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View full booking link */}
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: 10 }}>
        <Link href={`/admin/bookings/${b.id}`} style={{
          padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border)',
          background: 'var(--card)', color: 'var(--teal)', fontSize: '0.85rem',
          fontWeight: 700, textDecoration: 'none',
        }}>
          View Full Booking →
        </Link>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', textAlign: 'right', textTransform: 'capitalize' }}>{value}</span>
    </div>
  )
}
