import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

const ACTION_ICON: Record<string, string> = {
  booking_created:        '📋',
  booking_accepted:       '✅',
  booking_declined:       '✕',
  booking_cancelled:      '❌',
  booking_in_progress:    '🔄',
  booking_work_done:      '🎉',
  booking_completed:      '🏁',
  nurse_approved:         '👩‍⚕️',
  nurse_rejected:         '❌',
  nurse_profile_updated:  '📝',
  complaint_raised:       '⚖️',
  complaint_resolved:     '✅',
  complaint_rejected:     '✕',
  leave_requested:        '🌴',
  leave_approved:         '✅',
  leave_rejected:         '✕',
  agreement_created:      '📄',
  agreement_signed:       '✍️',
  agreement_rejected:     '❌',
  hospital_approved:      '🏥',
  hospital_rejected:      '❌',
  payment_received:       '💳',
  payment_reminder_sent:  '⚠️',
  admin_settings_changed: '⚙️',
  user_created:           '👤',
  user_updated:           '👤',
  notification_sent:      '🔔',
}

const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  admin:    { bg: 'rgba(201,168,76,0.12)',  color: '#C9A84C' },
  patient:  { bg: 'rgba(39,168,105,0.1)',   color: '#27A869' },
  provider: { bg: 'rgba(10,191,204,0.1)',   color: '#0ABFCC' },
  hospital: { bg: 'rgba(155,89,182,0.1)',   color: '#9B59B6' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  searchParams: Promise<{
    page?: string
    q?: string
    role?: string
    action?: string
    date?: string
  }>
}

export default async function AdminActivityPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const page   = Math.max(1, parseInt(params.page ?? '1'))
  const offset = (page - 1) * PAGE_SIZE
  const q      = params.q?.trim() ?? ''
  const roleF  = params.role ?? ''
  const actionF = params.action ?? ''
  const dateF  = params.date ?? ''

  // Build query with filters
  let query = supabase
    .from('activity_logs')
    .select('id, actor_name, actor_role, action, entity_type, description, created_at, meta', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (q)       query = query.ilike('description', `%${q}%`)
  if (roleF)   query = query.eq('actor_role', roleF)
  if (actionF) query = query.eq('action', actionF)
  if (dateF) {
    const start = new Date(dateF)
    const end   = new Date(dateF)
    end.setDate(end.getDate() + 1)
    query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
  }

  const { data: rows, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const logs = rows ?? []
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Stats (unfiltered) for KPIs — quick counts
  const [
    { count: totalLogs },
    { count: todayLogs },
    { count: bookingLogs },
    { count: adminLogs },
  ] = await Promise.all([
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }),
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).ilike('action', 'booking%'),
    supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('actor_role', 'admin'),
  ])

  function buildUrl(overrides: Record<string, string>) {
    const sp = new URLSearchParams()
    const base = { page: '1', q, role: roleF, action: actionF, date: dateF, ...overrides }
    Object.entries(base).forEach(([k, v]) => { if (v) sp.set(k, v) })
    return `/admin/activity${sp.toString() ? '?' + sp.toString() : ''}`
  }

  const isFiltered = q || roleF || actionF || dateF

  return (
    <div className="dash-shell">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Activity Log</h1>
          <p className="dash-sub">Full audit trail of all platform actions</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(14,123,140,0.1)' }}>📊</div>
          <div className="dash-kpi-num">{totalLogs ?? 0}</div>
          <div className="dash-kpi-label">Total Events</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(39,168,105,0.1)' }}>📅</div>
          <div className="dash-kpi-num">{todayLogs ?? 0}</div>
          <div className="dash-kpi-label">Last 24h</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(245,132,42,0.1)' }}>📋</div>
          <div className="dash-kpi-num">{bookingLogs ?? 0}</div>
          <div className="dash-kpi-label">Booking Events</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(201,168,76,0.12)' }}>⚙️</div>
          <div className="dash-kpi-num">{adminLogs ?? 0}</div>
          <div className="dash-kpi-label">Admin Actions</div>
        </div>
      </div>

      {/* Filters */}
      <div className="dash-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ padding: '1rem 1.2rem' }}>
          <form method="GET" action="/admin/activity">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
              {/* Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Search
                </label>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search description…"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 9,
                    border: '1px solid var(--border)', background: 'var(--card)',
                    color: 'var(--ink)', fontSize: '0.83rem', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Role filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  User Role
                </label>
                <select
                  name="role"
                  defaultValue={roleF}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 9,
                    border: '1px solid var(--border)', background: 'var(--card)',
                    color: 'var(--ink)', fontSize: '0.83rem', boxSizing: 'border-box',
                  }}
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="patient">Patient</option>
                  <option value="provider">Provider / Nurse</option>
                  <option value="hospital">Hospital</option>
                </select>
              </div>

              {/* Action type filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Activity Type
                </label>
                <select
                  name="action"
                  defaultValue={actionF}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 9,
                    border: '1px solid var(--border)', background: 'var(--card)',
                    color: 'var(--ink)', fontSize: '0.83rem', boxSizing: 'border-box',
                  }}
                >
                  <option value="">All Types</option>
                  <optgroup label="Bookings">
                    <option value="booking_created">Booking Created</option>
                    <option value="booking_accepted">Booking Accepted</option>
                    <option value="booking_declined">Booking Declined</option>
                    <option value="booking_cancelled">Booking Cancelled</option>
                    <option value="booking_completed">Booking Completed</option>
                  </optgroup>
                  <optgroup label="Nurse">
                    <option value="nurse_approved">Nurse Approved</option>
                    <option value="nurse_rejected">Nurse Rejected</option>
                    <option value="nurse_profile_updated">Profile Updated</option>
                  </optgroup>
                  <optgroup label="Complaints & Leave">
                    <option value="complaint_raised">Complaint Raised</option>
                    <option value="complaint_resolved">Complaint Resolved</option>
                    <option value="leave_requested">Leave Requested</option>
                    <option value="leave_approved">Leave Approved</option>
                  </optgroup>
                  <optgroup label="Payments">
                    <option value="payment_received">Payment Received</option>
                    <option value="payment_reminder_sent">Payment Reminder</option>
                  </optgroup>
                  <optgroup label="Admin">
                    <option value="admin_settings_changed">Settings Changed</option>
                    <option value="hospital_approved">Hospital Approved</option>
                    <option value="agreement_signed">Agreement Signed</option>
                  </optgroup>
                </select>
              </div>

              {/* Date filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  defaultValue={dateF}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 9,
                    border: '1px solid var(--border)', background: 'var(--card)',
                    color: 'var(--ink)', fontSize: '0.83rem', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Submit / Clear */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" style={{
                  flex: 1, padding: '8px 14px', borderRadius: 9, border: 'none',
                  background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff',
                  fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer',
                }}>
                  Filter
                </button>
                {isFiltered && (
                  <Link href="/admin/activity" style={{
                    padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)',
                    background: 'var(--card)', color: 'var(--muted)',
                    fontSize: '0.83rem', fontWeight: 600, textDecoration: 'none',
                    display: 'flex', alignItems: 'center',
                  }}>
                    Clear
                  </Link>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Results info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          {count ?? 0} event{(count ?? 0) !== 1 ? 's' : ''}
          {isFiltered ? ' (filtered)' : ''}
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
        </span>
      </div>

      {/* Activity table / cards */}
      <div className="dash-card">
        {logs.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No activity found</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              {isFiltered ? 'Try adjusting your filters.' : 'Activity will appear here once users start taking actions.'}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div style={{ overflowX: 'auto' }} className="activity-desktop">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Actor', 'Role', 'Action', 'Description', 'Time'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.67rem', color: 'var(--muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any, i: number) => {
                    const icon = ACTION_ICON[log.action] ?? '📌'
                    const rc = ROLE_COLOR[log.actor_role] ?? ROLE_COLOR.admin
                    return (
                      <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--card)' : 'rgba(14,123,140,0.012)' }}>
                        <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 600 }}>{offset + i + 1}</span>
                        </td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink)' }}>{log.actor_name ?? 'System'}</span>
                        </td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                          <span style={{ background: rc.bg, color: rc.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 50, textTransform: 'capitalize' }}>
                            {log.actor_role}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '1rem' }}>{icon}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)' }}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'middle', maxWidth: 320 }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                            {log.description}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--ink)', fontWeight: 600 }}>
                            {timeAgo(log.created_at)}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 1 }}>
                            {new Date(log.created_at).toLocaleString('en-SA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="activity-mobile">
              {logs.map((log: any) => {
                const icon = ACTION_ICON[log.action] ?? '📌'
                const rc = ROLE_COLOR[log.actor_role] ?? ROLE_COLOR.admin
                return (
                  <div key={log.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: rc.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', flexShrink: 0,
                    }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink)' }}>
                          {log.actor_name ?? 'System'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {timeAgo(log.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5, lineHeight: 1.4 }}>
                        {log.description}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ background: rc.bg, color: rc.color, fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 50, textTransform: 'capitalize' }}>
                          {log.actor_role}
                        </span>
                        <span style={{ background: 'var(--cream)', color: 'var(--muted)', fontSize: '0.6rem', fontWeight: 600, padding: '2px 7px', borderRadius: 50 }}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Page {page} of {totalPages} · {count} total
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })} style={pBtn(false)}>← Prev</Link>
              )}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return <Link key={p} href={buildUrl({ page: String(p) })} style={pBtn(p === page)}>{p}</Link>
              })}
              {page < totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })} style={pBtn(false)}>Next →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function pBtn(active: boolean): React.CSSProperties {
  return {
    padding: '5px 11px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600,
    textDecoration: 'none', border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--teal)' : 'var(--card)',
    color: active ? '#fff' : 'var(--muted)',
  }
}
