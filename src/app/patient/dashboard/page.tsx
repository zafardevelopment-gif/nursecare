import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PatientDashboardPage() {
  const user = await requireRole('patient')
  const supabase = await createSupabaseServerClient()

  // Query booking_requests (parent records)
  const { data: requests } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  const allItems = requests ?? []
  const active  = allItems.filter(b => b.status === 'accepted' || b.status === 'confirmed').length
  const pending = allItems.filter(b => b.status === 'pending').length
  const total   = allItems.length
  const recentBookings = allItems.slice(0, 5)

  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Awaiting Nurse' },
    accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
    confirmed:   { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
    declined:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
    completed:   { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
    cancelled:   { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Cancelled' },
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Patient Dashboard</h1>
          <p className="dash-sub">Welcome back, {user.full_name}!</p>
        </div>
        <Link href="/patient/booking" className="btn-primary" style={{
          width: 'auto', display: 'inline-block', padding: '10px 20px', fontSize: '0.88rem',
        }}>
          + Book a Nurse
        </Link>
      </div>

      {active > 0 && (
        <div style={{
          background: '#F0FDF4', border: '1px solid rgba(39,168,105,0.35)', color: '#1A7A4A',
          padding: '12px 18px', borderRadius: 9, marginBottom: '1.5rem',
          fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '1.1rem' }}>✅</span>
          <span>{active} booking{active > 1 ? 's' : ''} confirmed by nurse —{' '}
            <Link href="/patient/bookings" style={{ color: '#1A7A4A', textDecoration: 'underline' }}>View details</Link>
          </span>
        </div>
      )}

      {pending > 0 && (
        <div style={{
          background: '#FFF8F0', border: '1px solid rgba(245,132,42,0.35)', color: '#b85e00',
          padding: '12px 18px', borderRadius: 9, marginBottom: '1.5rem',
          fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '1.1rem' }}>⏳</span>
          <span>{pending} booking{pending > 1 ? 's' : ''} awaiting nurse acceptance —{' '}
            <Link href="/patient/bookings" style={{ color: '#b85e00', textDecoration: 'underline' }}>Track status</Link>
          </span>
        </div>
      )}

      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{active}</div>
          <div className="dash-kpi-label">Confirmed</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>⏳</div>
          <div className="dash-kpi-num">{pending}</div>
          <div className="dash-kpi-label">Pending</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#EBF5FF' }}>📅</div>
          <div className="dash-kpi-num">{total}</div>
          <div className="dash-kpi-label">Total Bookings</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#F3E8FF' }}>💰</div>
          <div className="dash-kpi-num">SAR 0</div>
          <div className="dash-kpi-label">Total Spent</div>
        </div>
      </div>

      {recentBookings.length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">My Recent Bookings</span>
            <Link href="/patient/bookings" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {recentBookings.map((b: any, i: number) => {
              const s = statusStyle[b.status] ?? statusStyle.pending
              const typeLabel = b.booking_type === 'weekly' ? '🔁' : b.booking_type === 'monthly' ? '📆' : '📅'
              return (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderBottom: i < recentBookings.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)' }}>
                      {b.service_type ?? 'Booking'}{b.nurse_name ? ` · ${b.nurse_name}` : ''}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                      {typeLabel} {b.start_date} · {b.shift} · {b.city ?? ''}
                      {b.total_sessions > 1 && ` · ${b.total_sessions} sessions`}
                    </div>
                  </div>
                  <span style={{
                    background: s.bg, color: s.color,
                    fontSize: '0.68rem', fontWeight: 700,
                    padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap', marginLeft: 12,
                  }}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Quick Actions</span>
        </div>
        <div className="dash-card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/patient/booking" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'linear-gradient(135deg,rgba(14,123,140,0.08),rgba(10,191,204,0.08))',
            border: '1px solid rgba(14,123,140,0.2)', color: '#0E7B8C',
            padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none',
          }}>
            🏥 Book a Nurse
          </Link>
          <Link href="/patient/bookings" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--ink)',
            padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none',
          }}>
            📋 View My Bookings
            {pending > 0 && (
              <span style={{ background: '#F5842A', color: '#fff', fontSize: '0.68rem', padding: '1px 6px', borderRadius: 50 }}>
                {pending}
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}
