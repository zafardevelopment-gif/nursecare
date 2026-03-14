import { requireRole } from '@/lib/auth'

export default async function PatientDashboardPage() {
  const user = await requireRole('patient')

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Patient Dashboard</h1>
          <p className="dash-sub">Welcome back, {user.full_name}!</p>
        </div>
      </div>

      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>📋</div>
          <div className="dash-kpi-num">0</div>
          <div className="dash-kpi-label">Active Bookings</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#EBF5FF' }}>📅</div>
          <div className="dash-kpi-num">0</div>
          <div className="dash-kpi-label">Total Bookings</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>💰</div>
          <div className="dash-kpi-num">SAR 0</div>
          <div className="dash-kpi-label">Total Spent</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#F3E8FF' }}>👨‍👩‍👧</div>
          <div className="dash-kpi-num">0</div>
          <div className="dash-kpi-label">Family Profiles</div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Your account is ready</span>
        </div>
        <div className="dash-card-body">
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Full dashboard features coming in the next phase. Your role: <strong>{user.role}</strong> · Email: <strong>{user.email}</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
