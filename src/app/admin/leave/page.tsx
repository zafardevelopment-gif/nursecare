import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: '⏳ Pending',  color: '#b85e00', bg: 'rgba(181,94,0,0.08)'  },
  approved: { label: '✅ Approved', color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
  rejected: { label: '❌ Rejected', color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
}

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminLeavePage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams
  const filter   = params.status ?? ''

  let query = supabase
    .from('leave_requests')
    .select('id, nurse_name, leave_date, leave_type, reason, status, has_bookings, created_at')
    .order('created_at', { ascending: false })

  if (filter) query = query.eq('status', filter)

  const { data: leaves } = await query
  const all = leaves ?? []

  const pendingCount  = all.filter(l => l.status === 'pending').length
  const approvedCount = all.filter(l => l.status === 'approved').length
  const rejectedCount = all.filter(l => l.status === 'rejected').length
  const bookingCount  = all.filter(l => l.has_bookings).length

  function filterUrl(s: string) {
    return s ? `/admin/leave?status=${s}` : '/admin/leave'
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Leave Requests</h1>
          <p className="dash-sub">Review and approve nurse leave requests</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: '📋', label: 'Total',          value: all.length,     color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)' },
          { icon: '⏳', label: 'Pending',         value: pendingCount,   color: '#b85e00', bg: 'rgba(181,94,0,0.08)'  },
          { icon: '✅', label: 'Approved',        value: approvedCount,  color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
          { icon: '⚠️', label: 'With Bookings',   value: bookingCount,   color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ padding: '1rem', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: '',         label: 'All' },
          { key: 'pending',  label: '⏳ Pending' },
          { key: 'approved', label: '✅ Approved' },
          { key: 'rejected', label: '❌ Rejected' },
        ].map(tab => (
          <Link key={tab.key} href={filterUrl(tab.key)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
            textDecoration: 'none',
            background: filter === tab.key ? 'var(--teal)' : 'var(--card)',
            color:      filter === tab.key ? '#fff'        : 'var(--muted)',
            border:     filter === tab.key ? 'none'        : '1px solid var(--border)',
          }}>{tab.label}</Link>
        ))}
      </div>

      {/* Table */}
      <div className="dash-card">
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>📅 Leave Requests</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{all.length} {filter ? filter : 'total'}</span>
        </div>

        {all.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📅</div>
            <div style={{ fontWeight: 700 }}>No leave requests found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)' }}>
                  {['Nurse', 'Leave Date', 'Type', 'Reason', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {all.map((leave, i) => {
                  const sm = STATUS_META[leave.status] ?? STATUS_META.pending
                  const isPending = leave.status === 'pending'
                  return (
                    <tr key={leave.id} style={{ borderBottom: '1px solid var(--border)', background: leave.has_bookings && isPending ? 'rgba(224,74,74,0.02)' : i % 2 === 0 ? 'transparent' : 'rgba(14,123,140,0.01)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{leave.nurse_name || '—'}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 2 }}>
                          {new Date(leave.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                        {new Date(leave.leave_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {leave.has_bookings && (
                          <div style={{ fontSize: '0.65rem', color: '#E04A4A', fontWeight: 700, marginTop: 2 }}>⚠️ Has bookings</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink)' }}>
                        {leave.leave_type === 'full_day' ? '🌅 Full Day' : '🕐 Half Day'}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink)', maxWidth: 200 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>{leave.reason}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: sm.bg, color: sm.color, padding: '4px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{sm.label}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link href={`/admin/leave/${leave.id}`} style={{
                          padding: '5px 12px', borderRadius: 7,
                          border: isPending ? 'none' : '1px solid var(--border)',
                          background: isPending ? 'var(--teal)' : 'var(--shell-bg)',
                          color: isPending ? '#fff' : 'var(--teal)',
                          fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>
                          {isPending ? 'Review →' : 'View →'}
                        </Link>
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
