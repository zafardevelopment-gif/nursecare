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
  searchParams: Promise<{ status?: string; blocked?: string }>
}

export default async function AdminLeavePage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams
  const filter   = params.status ?? ''
  const onlyBlocked = params.blocked === '1'

  let query = supabase
    .from('leave_requests')
    .select('id, nurse_name, leave_date, leave_start_date, leave_end_date, leave_type, reason, status, has_bookings, auto_approved, conflict_count, is_blocked, created_at')
    .order('created_at', { ascending: false })

  if (filter) query = query.eq('status', filter)
  if (onlyBlocked) query = query.eq('is_blocked', true)

  const { data: leaves } = await query
  const all = leaves ?? []

  // Unfiltered counts for KPIs — fetch separately
  const { data: allForCount } = await supabase
    .from('leave_requests')
    .select('status, is_blocked, auto_approved, has_bookings')

  const counts = allForCount ?? []
  const totalCount       = counts.length
  const pendingCount     = counts.filter(l => l.status === 'pending').length
  const blockedCount     = counts.filter(l => l.is_blocked && l.status === 'pending').length
  const autoApprovedCount = counts.filter(l => l.auto_approved).length
  const approvedCount    = counts.filter(l => l.status === 'approved').length

  function filterUrl(s: string, b = false) {
    const q = new URLSearchParams()
    if (s) q.set('status', s)
    if (b) q.set('blocked', '1')
    return `/admin/leave${q.toString() ? '?' + q.toString() : ''}`
  }

  function fmtDate(d: string | null | undefined) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function fmtRange(row: any) {
    const start = row.leave_start_date ?? row.leave_date
    const end   = row.leave_end_date   ?? row.leave_date
    if (start === end) return fmtDate(start)
    return `${fmtDate(start)} – ${fmtDate(end)}`
  }

  const activeFilter = onlyBlocked ? 'blocked' : filter

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
          { icon: '📋', label: 'Total',          value: totalCount,        color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)' },
          { icon: '⏳', label: 'Pending',         value: pendingCount,      color: '#b85e00', bg: 'rgba(181,94,0,0.08)'  },
          { icon: '🚫', label: 'Blocked',         value: blockedCount,      color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
          { icon: '⚡', label: 'Auto-Approved',   value: autoApprovedCount, color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
          { icon: '✅', label: 'Total Approved',  value: approvedCount,     color: '#27A869', bg: 'rgba(39,168,105,0.08)' },
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
          { key: '',         label: 'All',           blocked: false },
          { key: 'pending',  label: '⏳ Pending',     blocked: false },
          { key: '',         label: '🚫 Blocked',     blocked: true  },
          { key: 'approved', label: '✅ Approved',    blocked: false },
          { key: 'rejected', label: '❌ Rejected',    blocked: false },
        ].map(tab => {
          const isActive = tab.blocked ? activeFilter === 'blocked' : activeFilter === tab.key
          return (
            <Link key={tab.label} href={filterUrl(tab.key, tab.blocked)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
              textDecoration: 'none',
              background: isActive ? 'var(--teal)' : 'var(--card)',
              color:      isActive ? '#fff'        : 'var(--muted)',
              border:     isActive ? 'none'        : '1px solid var(--border)',
            }}>{tab.label}</Link>
          )
        })}
      </div>

      {/* Blocked info banner */}
      {blockedCount > 0 && !onlyBlocked && (
        <div style={{ background: 'rgba(224,74,74,0.05)', border: '1.5px solid rgba(224,74,74,0.25)', borderRadius: 10, padding: '12px 18px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.85rem', color: '#E04A4A', fontWeight: 700 }}>
            🚫 {blockedCount} leave request{blockedCount !== 1 ? 's are' : ' is'} blocked due to booking conflicts — admin approval required after resolving bookings
          </div>
          <Link href={filterUrl('', true)} style={{ fontSize: '0.78rem', color: '#E04A4A', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            View blocked →
          </Link>
        </div>
      )}

      {/* Table */}
      <div className="dash-card">
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>📅 Leave Requests</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{all.length} {onlyBlocked ? 'blocked' : filter ? filter : 'total'}</span>
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
                  {['Nurse', 'Leave Dates', 'Type', 'Reason', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {all.map((leave: any, i: number) => {
                  const sm = STATUS_META[leave.status] ?? STATUS_META.pending
                  const isPending = leave.status === 'pending'
                  return (
                    <tr key={leave.id} style={{ borderBottom: '1px solid var(--border)', background: leave.is_blocked && isPending ? 'rgba(224,74,74,0.025)' : i % 2 === 0 ? 'transparent' : 'rgba(14,123,140,0.01)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{leave.nurse_name || '—'}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 2 }}>
                          {new Date(leave.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                        {fmtRange(leave)}
                        {leave.is_blocked && isPending && (
                          <div style={{ fontSize: '0.65rem', color: '#E04A4A', fontWeight: 700, marginTop: 2 }}>🚫 {leave.conflict_count} conflict{leave.conflict_count !== 1 ? 's' : ''}</div>
                        )}
                        {leave.auto_approved && (
                          <div style={{ fontSize: '0.65rem', color: '#1A7A4A', fontWeight: 700, marginTop: 2 }}>⚡ Auto-approved</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
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
                          background: isPending && leave.is_blocked ? '#E04A4A' : isPending ? 'var(--teal)' : 'var(--shell-bg)',
                          color: isPending ? '#fff' : 'var(--teal)',
                          fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>
                          {isPending && leave.is_blocked ? '🚫 Resolve →' : isPending ? 'Review →' : 'View →'}
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
