import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const user = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const [
    { count: pendingNurses },
    { count: totalBookings },
    { count: pendingBookings },
  ] = await Promise.all([
    supabase.from('nurses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  const pendingCount = pendingNurses

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Admin Dashboard</h1>
          <p className="dash-sub">Platform overview · Signed in as {user.email}</p>
        </div>
      </div>

      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>📋</div>
          <div className="dash-kpi-num">{totalBookings ?? 0}</div>
          <div className="dash-kpi-label">Total Bookings</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>⏳</div>
          <div className="dash-kpi-num">{pendingBookings ?? 0}</div>
          <div className="dash-kpi-label">Pending Bookings</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>✅</div>
          <div className="dash-kpi-num">{pendingCount ?? 0}</div>
          <div className="dash-kpi-label">Pending Approvals</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FEE8E8' }}>⚖️</div>
          <div className="dash-kpi-num">0</div>
          <div className="dash-kpi-label">Open Disputes</div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Quick Links</span>
        </div>
        <div className="dash-card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/admin/nurses" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: pendingCount ? 'rgba(245,132,42,0.1)' : 'var(--cream)',
            border: `1px solid ${pendingCount ? 'rgba(245,132,42,0.3)' : 'var(--border)'}`,
            color: pendingCount ? '#F5842A' : 'var(--ink)',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.88rem',
            textDecoration: 'none',
          }}>
            👩‍⚕️ Nurse Approvals
            {(pendingCount ?? 0) > 0 && (
              <span style={{ background: '#F5842A', color: '#fff', fontSize: '0.7rem', padding: '2px 7px', borderRadius: '50px' }}>
                {pendingCount} pending
              </span>
            )}
          </Link>
          <Link href="/admin/bookings" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--cream)',
            border: '1px solid var(--border)',
            color: 'var(--ink)',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.88rem',
            textDecoration: 'none',
          }}>
            📋 All Bookings
            {(pendingBookings ?? 0) > 0 && (
              <span style={{ background: '#0E7B8C', color: '#fff', fontSize: '0.7rem', padding: '2px 7px', borderRadius: '50px' }}>
                {pendingBookings} pending
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}
