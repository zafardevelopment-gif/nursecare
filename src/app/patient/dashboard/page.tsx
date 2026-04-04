import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function PatientDashboardPage() {
  const user = await requireRole('patient')
  const supabase = await createSupabaseServerClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('status')
    .eq('patient_id', user.id)

  const active  = bookings?.filter(b => b.status === 'accepted').length  ?? 0
  const pending = bookings?.filter(b => b.status === 'pending').length   ?? 0
  const total   = bookings?.length ?? 0

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Patient Dashboard</h1>
          <p className="dash-sub">Welcome back, {user.full_name}!</p>
        </div>
        <Link href="/patient/booking" className="btn-primary" style={{
          width: 'auto',
          display: 'inline-block',
          padding: '10px 20px',
          fontSize: '0.88rem',
        }}>
          + Book a Nurse
        </Link>
      </div>

      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{active}</div>
          <div className="dash-kpi-label">Active Bookings</div>
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

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Quick Actions</span>
        </div>
        <div className="dash-card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/patient/booking" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg,rgba(14,123,140,0.08),rgba(10,191,204,0.08))',
            border: '1px solid rgba(14,123,140,0.2)',
            color: '#0E7B8C',
            padding: '12px 20px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.88rem',
            textDecoration: 'none',
          }}>
            🏥 Book a Nurse
          </Link>
          <Link href="/patient/bookings" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--cream)',
            border: '1px solid var(--border)',
            color: 'var(--ink)',
            padding: '12px 20px',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: '0.88rem',
            textDecoration: 'none',
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
