import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LeaveActionForm from './LeaveActionForm'

export const dynamic = 'force-dynamic'

export default async function AdminLeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { data: leave } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (!leave) notFound()

  // Fetch affected bookings on that date for this nurse
  const { data: bookings } = await supabase
    .from('booking_requests')
    .select('id, patient_name, service_type, shift, status')
    .eq('nurse_id', leave.nurse_user_id)
    .eq('start_date', leave.leave_date)
    .in('status', ['pending', 'accepted', 'confirmed', 'in_progress'])

  const affectedBookings = bookings ?? []
  const isPending = leave.status === 'pending'

  const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: '⏳ Pending',  color: '#b85e00', bg: 'rgba(181,94,0,0.08)'  },
    approved: { label: '✅ Approved', color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
    rejected: { label: '❌ Rejected', color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
  }
  const sm = statusMeta[leave.status] ?? statusMeta.pending

  return (
    <div className="dash-shell">
      {/* Back + Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/leave" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Leave Requests
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 12 }}>
          <h1 className="dash-title" style={{ margin: 0 }}>Leave Request Review</h1>
          <span style={{ background: sm.bg, color: sm.color, padding: '7px 16px', borderRadius: 50, fontWeight: 700, fontSize: '0.82rem', border: `1px solid ${sm.color}25` }}>
            {sm.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Leave details */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">📅 Leave Details</span></div>
          <div className="dash-card-body">
            <Row label="Nurse"       value={leave.nurse_name || '—'} />
            <Row label="Leave Date"  value={new Date(leave.leave_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
            <Row label="Type"        value={leave.leave_type === 'full_day' ? '🌅 Full Day' : '🕐 Half Day'} />
            <Row label="Status"      value={sm.label} />
            <Row label="Submitted"   value={new Date(leave.created_at).toLocaleString('en-GB')} />
            {leave.reviewed_at && <Row label="Reviewed At" value={new Date(leave.reviewed_at).toLocaleString('en-GB')} />}
          </div>
        </div>

        {/* Reason */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">🗒️ Reason</span></div>
          <div className="dash-card-body">
            <div style={{ background: 'var(--shell-bg)', border: '1px solid var(--border)', borderRadius: 9, padding: '14px 16px', lineHeight: 1.6, fontSize: '0.88rem', color: 'var(--ink)' }}>
              "{leave.reason}"
            </div>
            {leave.admin_note && (
              <div style={{ marginTop: 14, background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.2)', borderRadius: 9, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--teal)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Admin Note</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>{leave.admin_note}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Affected bookings warning */}
      {affectedBookings.length > 0 && (
        <div style={{ background: 'rgba(224,74,74,0.05)', border: '1.5px solid rgba(224,74,74,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 800, color: '#E04A4A', fontSize: '0.9rem', marginBottom: 10 }}>
            ⚠️ This nurse has {affectedBookings.length} active booking{affectedBookings.length > 1 ? 's' : ''} on {leave.leave_date}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#b85e00', marginBottom: 12 }}>
            If you approve this leave, you must manually reassign or cancel these bookings.
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(224,74,74,0.15)' }}>
                  {['Patient', 'Service', 'Shift', 'Booking Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, color: '#b85e00', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affectedBookings.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(224,74,74,0.08)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink)' }}>{b.patient_name ?? '—'}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink)' }}>{b.service_type ?? '—'}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink)', textTransform: 'capitalize' }}>{b.shift ?? '—'}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink)', textTransform: 'capitalize' }}>{b.status}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <Link href={`/admin/bookings/${b.id}`} style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>
                        View Booking →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action form */}
      {isPending && (
        <LeaveActionForm leaveId={leave.id} hasBookings={affectedBookings.length > 0} />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', minWidth: 100, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
