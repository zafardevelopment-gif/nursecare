import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

const ACTION_ICON: Record<string, string> = {
  booking_created:              '📋',
  booking_accepted:             '✅',
  booking_declined:             '✕',
  booking_cancelled:            '❌',
  booking_cancel_requested:     '⚠️',
  booking_reschedule_requested: '📅',
  booking_on_the_way:           '🚗',
  booking_in_progress:          '🔄',
  booking_work_done:            '🎉',
  booking_completed:            '🏁',
  booking_payment_done:         '💳',
  nurse_approved:               '👩‍⚕️',
  nurse_rejected:               '❌',
  nurse_registered:             '👤',
  leave_requested:              '🌴',
  leave_approved:               '✅',
  leave_rejected:               '✕',
  complaint_raised:             '⚖️',
  complaint_resolved:           '✅',
  admin_settings_changed:       '⚙️',
  homepage_settings_changed:    '🌐',
}

const ROLE_COLOR: Record<string, string> = {
  admin:    'rgba(201,168,76,0.15)',
  patient:  'rgba(39,168,105,0.12)',
  provider: 'rgba(10,191,204,0.12)',
  hospital: 'rgba(155,89,182,0.12)',
}

export default async function AdminDashboardPage() {
  const user = await requireRole('admin')
  const supabase = await createSupabaseServerClient()
  const serviceSupabase = createSupabaseServiceRoleClient()

  // Fetch all booking statuses in one query, then count in JS — 1 round-trip instead of 6
  const [
    { data: nurseStatuses },
    { data: bookingStatuses },
    { count: totalUsers },
    { count: pendingUpdateRequests },
    { count: rejectedAgreements },
    { count: openDisputes },
    { data: recentActivity },
    { data: recentLogs },
    { data: leaveStats },
  ] = await Promise.all([
    supabase.from('nurses').select('status'),
    serviceSupabase.from('booking_requests').select('status'),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('nurse_update_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('agreements').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    serviceSupabase.from('booking_requests')
      .select('id, patient_name, nurse_name, service_type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    serviceSupabase.from('activity_logs')
      .select('id, actor_name, actor_role, action, description, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    serviceSupabase.from('leave_requests')
      .select('status, is_blocked, auto_approved'),
  ])

  // Leave counts
  const allLeaves        = leaveStats ?? []
  const pendingLeaves    = allLeaves.filter((l: any) => l.status === 'pending').length
  const blockedLeaves    = allLeaves.filter((l: any) => l.is_blocked && l.status === 'pending').length
  const autoApprovedLeaves = allLeaves.filter((l: any) => l.auto_approved).length

  // Count nurse statuses in JS — zero extra DB round-trips
  const nurses = nurseStatuses ?? []
  const pendingNurses      = nurses.filter(n => n.status === 'pending').length
  const updatePendingNurses = nurses.filter(n => n.status === 'update_pending').length
  const totalNurses        = nurses.length
  const approvedNurses     = nurses.filter(n => n.status === 'approved').length

  // Count booking statuses in JS
  const bookings = bookingStatuses ?? []
  const totalBookings      = bookings.length
  const pendingBookings    = bookings.filter(b => b.status === 'pending').length
  const activeBookings     = bookings.filter(b => b.status === 'accepted' || b.status === 'confirmed').length
  const inProgressBookings = bookings.filter(b => b.status === 'in_progress').length
  const workDoneBookings   = bookings.filter(b => b.status === 'work_done').length
  const completedBookings  = bookings.filter(b => b.status === 'completed').length

  const totalPendingActions = (pendingNurses ?? 0) + (updatePendingNurses ?? 0) + (pendingUpdateRequests ?? 0) + (rejectedAgreements ?? 0)

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Admin Dashboard</h1>
          <p className="dash-sub">Platform overview · Signed in as {user.email}</p>
        </div>
        {totalPendingActions > 0 && (
          <Link href="/admin/nurse-updates" style={{
            background: 'rgba(245,132,42,0.1)', border: '1px solid rgba(245,132,42,0.3)',
            color: '#b85e00', padding: '8px 16px', borderRadius: 10,
            fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
          }}>
            ⚠️ {totalPendingActions} action{totalPendingActions !== 1 ? 's' : ''} required
          </Link>
        )}
      </div>

      {/* KPI Row 1 — Bookings */}
      <div className="dash-kpi-row" style={{ marginBottom: '1rem' }}>
        <Link href="/admin/bookings" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>📋</div>
            <div className="dash-kpi-num">{totalBookings ?? 0}</div>
            <div className="dash-kpi-label">Total Bookings</div>
          </div>
        </Link>
        <Link href="/admin/bookings?status=pending" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ cursor: 'pointer', border: (pendingBookings ?? 0) > 0 ? '1px solid rgba(245,132,42,0.3)' : '1px solid var(--border)' }}>
            <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>⏳</div>
            <div className="dash-kpi-num" style={{ color: (pendingBookings ?? 0) > 0 ? '#F5842A' : 'var(--ink)' }}>{pendingBookings ?? 0}</div>
            <div className="dash-kpi-label">Awaiting Nurse</div>
          </div>
        </Link>
        <Link href="/admin/bookings?status=accepted" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: 'rgba(39,168,105,0.1)' }}>✅</div>
            <div className="dash-kpi-num">{activeBookings ?? 0}</div>
            <div className="dash-kpi-label">Active / Accepted</div>
          </div>
        </Link>
        <Link href="/admin/bookings?status=in_progress" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ cursor: 'pointer', border: (inProgressBookings ?? 0) > 0 ? '1px solid rgba(14,123,140,0.3)' : '1px solid var(--border)' }}>
            <div className="dash-kpi-icon" style={{ background: 'rgba(14,123,140,0.1)' }}>🔄</div>
            <div className="dash-kpi-num" style={{ color: (inProgressBookings ?? 0) > 0 ? '#0E7B8C' : 'var(--ink)' }}>{inProgressBookings ?? 0}</div>
            <div className="dash-kpi-label">In Progress</div>
          </div>
        </Link>
        <Link href="/admin/bookings?status=work_done" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ cursor: 'pointer', border: (workDoneBookings ?? 0) > 0 ? '1px solid rgba(107,63,160,0.3)' : '1px solid var(--border)' }}>
            <div className="dash-kpi-icon" style={{ background: 'rgba(107,63,160,0.1)' }}>🎉</div>
            <div className="dash-kpi-num" style={{ color: (workDoneBookings ?? 0) > 0 ? '#6B3FA0' : 'var(--ink)' }}>{workDoneBookings ?? 0}</div>
            <div className="dash-kpi-label">Awaiting Confirmation</div>
          </div>
        </Link>
        <Link href="/admin/bookings?status=completed" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: '#F0FFF4' }}>🏁</div>
            <div className="dash-kpi-num">{completedBookings ?? 0}</div>
            <div className="dash-kpi-label">Completed</div>
          </div>
        </Link>
      </div>

      {/* KPI Row 1b — Users & Nurses */}
      <div className="dash-kpi-row" style={{ marginBottom: '1rem' }}>
        <Link href="/admin/users" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: '#EEF2FF' }}>👥</div>
            <div className="dash-kpi-num">{totalUsers ?? 0}</div>
            <div className="dash-kpi-label">Total Users</div>
          </div>
        </Link>
        <Link href="/admin/nurses?status=approved" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: '#E8F4FD' }}>👩‍⚕️</div>
            <div className="dash-kpi-num">{approvedNurses ?? 0}<span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'inherit' }}> / {totalNurses ?? 0}</span></div>
            <div className="dash-kpi-label">Approved Nurses</div>
          </div>
        </Link>
      </div>

      {/* KPI Row 2 — Pending Actions */}
      <div className="dash-kpi-row" style={{ marginBottom: '2rem' }}>
        <Link href="/admin/nurses?status=pending" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ border: (pendingNurses ?? 0) > 0 ? '1px solid rgba(245,132,42,0.3)' : '1px solid var(--border)', cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: 'rgba(245,132,42,0.1)' }}>🆕</div>
            <div className="dash-kpi-num" style={{ color: (pendingNurses ?? 0) > 0 ? '#F5842A' : 'var(--ink)' }}>{pendingNurses ?? 0}</div>
            <div className="dash-kpi-label">New Nurse Approvals</div>
          </div>
        </Link>
        <Link href="/admin/nurses?status=update_pending" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ border: (updatePendingNurses ?? 0) > 0 ? '1px solid rgba(184,94,0,0.3)' : '1px solid var(--border)', cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: 'rgba(184,94,0,0.1)' }}>🔄</div>
            <div className="dash-kpi-num" style={{ color: (updatePendingNurses ?? 0) > 0 ? '#b85e00' : 'var(--ink)' }}>{updatePendingNurses ?? 0}</div>
            <div className="dash-kpi-label">Profile Update Requests</div>
          </div>
        </Link>
        <Link href="/admin/nurse-updates" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ border: (pendingUpdateRequests ?? 0) > 0 ? '1px solid rgba(14,123,140,0.3)' : '1px solid var(--border)', cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: 'rgba(14,123,140,0.08)' }}>📝</div>
            <div className="dash-kpi-num" style={{ color: (pendingUpdateRequests ?? 0) > 0 ? 'var(--teal)' : 'var(--ink)' }}>{pendingUpdateRequests ?? 0}</div>
            <div className="dash-kpi-label">Update Reviews</div>
          </div>
        </Link>
        <Link href="/admin/agreements?status=rejected" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ border: (rejectedAgreements ?? 0) > 0 ? '1px solid rgba(192,57,43,0.3)' : '1px solid var(--border)', cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: 'rgba(192,57,43,0.08)' }}>✕</div>
            <div className="dash-kpi-num" style={{ color: (rejectedAgreements ?? 0) > 0 ? '#C0392B' : 'var(--ink)' }}>{rejectedAgreements ?? 0}</div>
            <div className="dash-kpi-label">Rejected Agreements</div>
          </div>
        </Link>
        <Link href="/admin/complaints?status=open" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ border: (openDisputes ?? 0) > 0 ? '1px solid rgba(192,57,43,0.3)' : '1px solid var(--border)', cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: (openDisputes ?? 0) > 0 ? 'rgba(192,57,43,0.08)' : '#FEE8E8' }}>⚖️</div>
            <div className="dash-kpi-num" style={{ color: (openDisputes ?? 0) > 0 ? '#C0392B' : 'var(--ink)' }}>{openDisputes ?? 0}</div>
            <div className="dash-kpi-label">Open Disputes</div>
          </div>
        </Link>
        <Link href="/admin/leave?status=pending" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ border: pendingLeaves > 0 ? '1px solid rgba(107,63,160,0.3)' : '1px solid var(--border)', cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: pendingLeaves > 0 ? 'rgba(107,63,160,0.1)' : 'rgba(107,63,160,0.05)' }}>🌴</div>
            <div className="dash-kpi-num" style={{ color: pendingLeaves > 0 ? '#6B3FA0' : 'var(--ink)' }}>{pendingLeaves}</div>
            <div className="dash-kpi-label">Pending Leaves</div>
          </div>
        </Link>
        <Link href="/admin/leave?blocked=1" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ border: blockedLeaves > 0 ? '1px solid rgba(224,74,74,0.3)' : '1px solid var(--border)', cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: blockedLeaves > 0 ? 'rgba(224,74,74,0.1)' : 'rgba(224,74,74,0.05)' }}>🚫</div>
            <div className="dash-kpi-num" style={{ color: blockedLeaves > 0 ? '#E04A4A' : 'var(--ink)' }}>{blockedLeaves}</div>
            <div className="dash-kpi-label">Blocked Leaves</div>
          </div>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Quick Links</span>
        </div>
        <div className="dash-card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <QuickLink href="/admin/nurses?status=pending" color={pendingNurses ? '#F5842A' : undefined} badge={pendingNurses ?? 0} badgeColor="#F5842A">
            👩‍⚕️ Nurse Approvals
          </QuickLink>
          <QuickLink href="/admin/nurse-updates" color={(updatePendingNurses ?? 0) + (pendingUpdateRequests ?? 0) > 0 ? '#b85e00' : undefined} badge={(updatePendingNurses ?? 0) + (pendingUpdateRequests ?? 0)} badgeColor="#b85e00">
            🔄 Profile Updates
          </QuickLink>
          <QuickLink href="/admin/bookings?type=patient" color={pendingBookings ? '#0E7B8C' : undefined} badge={pendingBookings ?? 0} badgeColor="#0E7B8C">
            📋 All Bookings
          </QuickLink>
          <QuickLink href="/admin/agreements?status=rejected" color={(rejectedAgreements ?? 0) > 0 ? '#C0392B' : undefined} badge={rejectedAgreements ?? 0} badgeColor="#C0392B">
            📄 Agreements
          </QuickLink>
          <QuickLink href="/admin/users">
            👥 Users
          </QuickLink>
          <QuickLink href="/admin/complaints?status=open" color={(openDisputes ?? 0) > 0 ? '#C0392B' : undefined} badge={openDisputes ?? 0} badgeColor="#C0392B">
            ⚖️ Disputes
          </QuickLink>
          <QuickLink href="/admin/settings">
            ⚙️ Settings
          </QuickLink>
        </div>
      </div>

      {/* Recent Booking Activity */}
      {(recentActivity ?? []).length > 0 && (
        <div className="dash-card" style={{ marginTop: '1.5rem' }}>
          <div className="dash-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="dash-card-title">Recent Booking Activity</span>
            <Link href="/admin/bookings" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ padding: 0 }}>
            {(recentActivity ?? []).map((b: any, i: number) => {
              const statusColors: Record<string, { bg: string; color: string; label: string }> = {
                pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
                accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Accepted' },
                confirmed:   { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
                declined:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
                in_progress: { bg: 'rgba(14,123,140,0.12)', color: '#0E7B8C', label: '🔄 In Progress' },
                work_done:   { bg: 'rgba(107,63,160,0.1)',  color: '#6B3FA0', label: '✅ Work Done' },
                completed:   { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
                cancelled:   { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Cancelled' },
              }
              const s = statusColors[b.status] ?? statusColors.pending
              return (
                <Link key={b.id} href={`/admin/bookings/${b.id}`} className="activity-row-link" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '11px 20px',
                  borderBottom: i < (recentActivity ?? []).length - 1 ? '1px solid var(--border)' : 'none',
                  textDecoration: 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>📋</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.patient_name ?? 'Patient'} → {b.nurse_name ?? 'Unassigned'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1 }}>{b.service_type ?? 'Booking'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{s.label}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{new Date(b.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short' })}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--teal)', fontWeight: 700 }}>→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Latest Activity Log */}
      {(recentLogs ?? []).length > 0 && (
        <div className="dash-card" style={{ marginTop: '1.5rem' }}>
          <div className="dash-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="dash-card-title">Latest Platform Activity</span>
            <Link href="/admin/activity" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Full log →</Link>
          </div>
          <div style={{ padding: 0 }}>
            {(recentLogs ?? []).map((log: any, i: number) => {
              const icon = ACTION_ICON[log.action] ?? '📌'
              const roleBg = ROLE_COLOR[log.actor_role] ?? 'rgba(14,123,140,0.08)'
              const timeAgoStr = (() => {
                const diff = Date.now() - new Date(log.created_at).getTime()
                const m = Math.floor(diff / 60000)
                if (m < 1) return 'just now'
                if (m < 60) return `${m}m ago`
                const h = Math.floor(m / 60)
                if (h < 24) return `${h}h ago`
                return `${Math.floor(h / 24)}d ago`
              })()
              return (
                <div key={log.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 20px',
                  borderBottom: i < (recentLogs ?? []).length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: roleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.actor_name ?? 'System'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.description}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600 }}>{timeAgoStr}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: 1, textTransform: 'capitalize' }}>{log.actor_role}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function QuickLink({ href, children, color, badge, badgeColor }: {
  href: string
  children: React.ReactNode
  color?: string
  badge?: number
  badgeColor?: string
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      background: color ? `${color}18` : 'var(--cream)',
      border: `1px solid ${color ? `${color}44` : 'var(--border)'}`,
      color: color ?? 'var(--ink)',
      padding: '11px 18px', borderRadius: '10px',
      fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none',
    }}>
      {children}
      {(badge ?? 0) > 0 && (
        <span style={{ background: badgeColor, color: '#fff', fontSize: '0.7rem', padding: '2px 7px', borderRadius: '50px' }}>
          {badge}
        </span>
      )}
    </Link>
  )
}
