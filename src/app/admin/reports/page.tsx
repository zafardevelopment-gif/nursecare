import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminReportsHubPage() {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  // Quick snapshot numbers
  const [
    { count: totalBookings },
    { count: completedBookings },
    { count: pendingBookings },
    { count: openComplaints },
    { count: totalNurses },
    { count: totalHospBookings },
  ] = await Promise.all([
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('nurses').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('hospital_booking_requests').select('*', { count: 'exact', head: true }),
  ])

  const REPORT_GROUPS = [
    {
      group: 'Booking Reports',
      color: '#0E7B8C',
      reports: [
        { href: '/admin/reports/bookings', icon: '📋', label: 'All Bookings', desc: 'Full booking list with filters', badge: totalBookings ?? 0 },
        { href: '/admin/reports/bookings?status=completed', icon: '🏁', label: 'Completed Bookings', desc: 'Successfully completed services', badge: completedBookings ?? 0 },
        { href: '/admin/reports/bookings?status=pending', icon: '⏳', label: 'Pending Bookings', desc: 'Awaiting nurse acceptance', badge: pendingBookings ?? 0 },
        { href: '/admin/reports/bookings?status=cancelled', icon: '❌', label: 'Cancelled Bookings', desc: 'Cancelled or declined bookings' },
        { href: '/admin/reports/hospital-bookings', icon: '🏥', label: 'Hospital Bookings', desc: 'Staffing requests from hospitals', badge: totalHospBookings ?? 0 },
      ],
    },
    {
      group: 'Financial Reports',
      color: '#27A869',
      reports: [
        { href: '/admin/reports/revenue', icon: '💰', label: 'Revenue Report', desc: 'Total revenue, paid vs unpaid' },
        { href: '/admin/reports/revenue?filter=commission', icon: '📊', label: 'Commission Report', desc: 'Platform commission breakdown' },
        { href: '/admin/reports/revenue?filter=payouts', icon: '💸', label: 'Nurse Payout Report', desc: 'Nurse earnings after commission' },
        { href: '/admin/reports/revenue?filter=refunds', icon: '↩', label: 'Refund Report', desc: 'Refunded bookings and amounts' },
        { href: '/admin/reports/revenue?filter=service', icon: '🩺', label: 'Service-wise Earnings', desc: 'Revenue broken down by service' },
      ],
    },
    {
      group: 'User Reports',
      color: '#7B2FBE',
      reports: [
        { href: '/admin/reports/users', icon: '👥', label: 'All Users', desc: 'Patients, nurses, hospitals' },
        { href: '/admin/reports/users?role=patient', icon: '🤒', label: 'Patient Report', desc: 'Patient activity and bookings' },
        { href: '/admin/reports/users?role=provider', icon: '👩‍⚕️', label: 'Nurse Performance', desc: 'Jobs, ratings, completion rate', badge: totalNurses ?? 0 },
        { href: '/admin/reports/users?active=true', icon: '✅', label: 'Active Users', desc: 'Users active in last 30 days' },
        { href: '/admin/reports/users?active=false', icon: '💤', label: 'Inactive Users', desc: 'Users with no activity recently' },
      ],
    },
    {
      group: 'Operations Reports',
      color: '#b85e00',
      reports: [
        { href: '/admin/reports/leave', icon: '🌴', label: 'Leave Requests', desc: 'Nurse leave history and status' },
        { href: '/admin/reports/complaints', icon: '⚖️', label: 'Complaints & Disputes', desc: 'All complaints by type and status', badge: openComplaints ?? 0 },
        { href: '/admin/reports/growth', icon: '📈', label: 'Growth Report', desc: 'Daily/weekly/monthly trends' },
        { href: '/admin/reports/city', icon: '🗺️', label: 'City-wise Demand', desc: 'Bookings by city and area' },
        { href: '/admin/activity', icon: '📊', label: 'Full Audit Log', desc: 'Complete platform activity trail' },
      ],
    },
  ]

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Reports & Analytics</h1>
          <p className="dash-sub">Business intelligence and data exports for NurseCare+</p>
        </div>
      </div>

      {/* Quick KPIs */}
      <div className="dash-kpi-row" style={{ marginBottom: '2rem' }}>
        {[
          { label: 'Total Bookings', value: totalBookings ?? 0, icon: '📋', bg: 'rgba(14,123,140,0.1)', color: '#0E7B8C' },
          { label: 'Completed', value: completedBookings ?? 0, icon: '🏁', bg: 'rgba(39,168,105,0.1)', color: '#27A869' },
          { label: 'Pending', value: pendingBookings ?? 0, icon: '⏳', bg: 'rgba(245,132,42,0.1)', color: '#F5842A' },
          { label: 'Active Nurses', value: totalNurses ?? 0, icon: '👩‍⚕️', bg: 'rgba(10,191,204,0.1)', color: '#0ABFCC' },
          { label: 'Open Disputes', value: openComplaints ?? 0, icon: '⚖️', bg: 'rgba(192,57,43,0.08)', color: '#C0392B' },
          { label: 'Hospital Bookings', value: totalHospBookings ?? 0, icon: '🏥', bg: 'rgba(123,47,190,0.08)', color: '#7B2FBE' },
        ].map(k => (
          <div key={k.label} className="dash-kpi">
            <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
            <div className="dash-kpi-num" style={{ color: k.color }}>{k.value}</div>
            <div className="dash-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Report groups */}
      {REPORT_GROUPS.map(g => (
        <div key={g.group} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.8rem' }}>
            <div style={{ width: 4, height: 18, borderRadius: 2, background: g.color }} />
            <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{g.group}</h2>
          </div>
          <div className="reports-hub-grid">
            {g.reports.map(r => (
              <Link key={r.href} href={r.href} className="report-hub-card" style={{ borderTop: `3px solid ${g.color}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="report-hub-icon" style={{ background: g.color + '15' }}>{r.icon}</div>
                  {r.badge !== undefined && r.badge > 0 && (
                    <span style={{ background: g.color + '20', color: g.color, fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 50 }}>
                      {r.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{r.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{r.desc}</div>
                <div style={{ fontSize: '0.7rem', color: g.color, fontWeight: 700, marginTop: 2 }}>View Report →</div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
