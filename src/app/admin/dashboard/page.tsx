import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const user = await requireRole('admin')
  const supabase = await createSupabaseServerClient()
  const serviceSupabase = createSupabaseServiceRoleClient()

  const [
    { count: pendingNurses },
    { count: updatePendingNurses },
    { count: totalNurses },
    { count: approvedNurses },
    { count: totalBookings },
    { count: pendingBookings },
    { count: activeBookings },
    { count: inProgressBookings },
    { count: workDoneBookings },
    { count: completedBookings },
    { count: totalUsers },
    { count: pendingUpdateRequests },
  ] = await Promise.all([
    supabase.from('nurses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('nurses').select('*', { count: 'exact', head: true }).eq('status', 'update_pending'),
    supabase.from('nurses').select('*', { count: 'exact', head: true }),
    supabase.from('nurses').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    serviceSupabase.from('booking_requests').select('*', { count: 'exact', head: true }),
    serviceSupabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    serviceSupabase.from('booking_requests').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'confirmed']),
    serviceSupabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    serviceSupabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'work_done'),
    serviceSupabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('nurse_update_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const totalPendingActions = (pendingNurses ?? 0) + (updatePendingNurses ?? 0) + (pendingUpdateRequests ?? 0)

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
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>📋</div>
          <div className="dash-kpi-num">{totalBookings ?? 0}</div>
          <div className="dash-kpi-label">Total Bookings</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>⏳</div>
          <div className="dash-kpi-num" style={{ color: (pendingBookings ?? 0) > 0 ? '#F5842A' : 'var(--ink)' }}>{pendingBookings ?? 0}</div>
          <div className="dash-kpi-label">Awaiting Nurse</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(39,168,105,0.1)' }}>✅</div>
          <div className="dash-kpi-num">{activeBookings ?? 0}</div>
          <div className="dash-kpi-label">Active / Accepted</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(14,123,140,0.1)' }}>🔄</div>
          <div className="dash-kpi-num" style={{ color: (inProgressBookings ?? 0) > 0 ? '#0E7B8C' : 'var(--ink)' }}>{inProgressBookings ?? 0}</div>
          <div className="dash-kpi-label">In Progress</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(107,63,160,0.1)' }}>🎉</div>
          <div className="dash-kpi-num" style={{ color: (workDoneBookings ?? 0) > 0 ? '#6B3FA0' : 'var(--ink)' }}>{workDoneBookings ?? 0}</div>
          <div className="dash-kpi-label">Awaiting Confirmation</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#F0FFF4' }}>🏁</div>
          <div className="dash-kpi-num">{completedBookings ?? 0}</div>
          <div className="dash-kpi-label">Completed</div>
        </div>
      </div>

      {/* KPI Row 1b — Users & Nurses */}
      <div className="dash-kpi-row" style={{ marginBottom: '1rem' }}>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#EEF2FF' }}>👥</div>
          <div className="dash-kpi-num">{totalUsers ?? 0}</div>
          <div className="dash-kpi-label">Total Users</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F4FD' }}>👩‍⚕️</div>
          <div className="dash-kpi-num">{approvedNurses ?? 0}<span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'inherit' }}> / {totalNurses ?? 0}</span></div>
          <div className="dash-kpi-label">Approved Nurses</div>
        </div>
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
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FEE8E8' }}>⚖️</div>
          <div className="dash-kpi-num">0</div>
          <div className="dash-kpi-label">Open Disputes</div>
        </div>
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
          <QuickLink href="/admin/users">
            👥 Users
          </QuickLink>
          <QuickLink href="/admin/settings">
            ⚙️ Settings
          </QuickLink>
        </div>
      </div>
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
