import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HospitalDashboardPage() {
  const user = await requireRole('hospital')
  const supabase = await createSupabaseServerClient()

  const [
    { count: totalAgreements },
    { count: pendingAgreements },
    { count: fullyApproved },
    { count: activeNurses },
  ] = await Promise.all([
    supabase.from('agreements').select('*', { count: 'exact', head: true }).eq('hospital_id', user.id),
    supabase.from('agreements').select('*', { count: 'exact', head: true }).eq('hospital_id', user.id).is('hospital_approved_at', null),
    supabase.from('agreements').select('*', { count: 'exact', head: true }).eq('hospital_id', user.id).eq('status', 'fully_approved'),
    supabase.from('agreements').select('*', { count: 'exact', head: true }).eq('hospital_id', user.id).eq('status', 'fully_approved'),
  ])

  const { data: recentAgreements } = await supabase
    .from('agreements')
    .select('id, title, status, created_at')
    .eq('hospital_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const kpis = [
    { label: 'Total Agreements', value: totalAgreements ?? 0, color: '#0E7B8C', icon: '📄', bg: 'rgba(14,123,140,0.08)', href: '/hospital/agreements' },
    { label: 'Awaiting Approval', value: pendingAgreements ?? 0, color: '#b85e00', icon: '⏳', bg: 'rgba(181,94,0,0.08)', href: '/hospital/agreements' },
    { label: 'Fully Executed', value: fullyApproved ?? 0, color: '#1A7A4A', icon: '✅', bg: 'rgba(26,122,74,0.08)', href: '/hospital/agreements' },
    { label: 'Active Nurses', value: activeNurses ?? 0, color: '#7B2FBE', icon: '👩‍⚕️', bg: 'rgba(123,47,190,0.08)', href: '/hospital/dashboard' },
  ]

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    draft:          { bg: '#F3F4F6', color: '#6B7280', label: 'Draft' },
    admin_approved: { bg: '#EFF6FF', color: '#3B82F6', label: 'Admin Signed' },
    nurse_approved: { bg: '#FFF7ED', color: '#b85e00', label: 'Nurse Signed' },
    fully_approved: { bg: '#F0FDF4', color: '#1A7A4A', label: 'Executed' },
  }

  const deptBreakdown = [
    { dept: 'ICU', nurses: 8, color: '#0E7B8C' },
    { dept: 'General Ward', nurses: 14, color: '#0ABFCC' },
    { dept: 'Pediatrics', nurses: 6, color: '#7B2FBE' },
    { dept: 'Emergency', nurses: 10, color: '#b85e00' },
    { dept: 'Surgery', nurses: 5, color: '#1A7A4A' },
  ]
  const maxNurses = Math.max(...deptBreakdown.map(d => d.nurses))

  const activityFeed = [
    { icon: '📄', text: 'New agreement request submitted', time: '2h ago', color: '#0E7B8C' },
    { icon: '✅', text: 'Agreement #1023 fully executed', time: '5h ago', color: '#1A7A4A' },
    { icon: '👩‍⚕️', text: 'Nurse assigned to ICU shift', time: 'Yesterday', color: '#7B2FBE' },
    { icon: '⏳', text: 'Pending approval: Agreement #1025', time: 'Yesterday', color: '#b85e00' },
    { icon: '💰', text: 'Invoice #INV-088 processed', time: '2 days ago', color: '#0ABFCC' },
  ]

  return (
    <div className="dash-shell">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Welcome, {user.full_name || 'Hospital'}</h1>
          <p className="dash-sub">Manage your nursing staff, agreements, and operations</p>
        </div>
        <Link href="/hospital/agreements" style={{
          background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: '0.88rem',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}>
          + New Agreement
        </Link>
      </div>

      {/* Alert */}
      {(pendingAgreements ?? 0) > 0 && (
        <div style={{
          background: '#FFF8F0', border: '1px solid #F5842A44', color: '#b85e00',
          padding: '12px 18px', borderRadius: 9, marginBottom: '1.5rem',
          fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '1.1rem' }}>⏳</span>
          <span>You have {pendingAgreements} agreement{(pendingAgreements ?? 0) > 1 ? 's' : ''} awaiting your approval —{' '}
            <Link href="/hospital/agreements" style={{ color: '#b85e00', textDecoration: 'underline' }}>Review now</Link>
          </span>
        </div>
      )}

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map(kpi => (
          <Link key={kpi.label} href={kpi.href} style={{ textDecoration: 'none' }}>
            <div className="dash-card" style={{ padding: '1.2rem', cursor: 'pointer', borderTop: `3px solid ${kpi.color}` }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: kpi.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', marginBottom: 10,
              }}>{kpi.icon}</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{kpi.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid-2col" style={{ marginBottom: '1rem' }}>

        {/* Recent Agreements */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Recent Agreements</span>
            <Link href="/hospital/agreements" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {!recentAgreements?.length ? (
              <p style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center' }}>No agreements yet</p>
            ) : (
              <div>
                {recentAgreements.map((ag, i) => {
                  const sc = statusColors[ag.status] ?? statusColors.draft
                  return (
                    <Link key={ag.id} href={`/hospital/agreements/${ag.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: i < recentAgreements.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background 0.12s',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ag.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                            {new Date(ag.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <span style={{ background: sc.bg, color: sc.color, fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, marginLeft: 10, whiteSpace: 'nowrap' }}>
                          {sc.label}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dept Breakdown */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Dept. Nurse Distribution</span>
          </div>
          <div className="dash-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {deptBreakdown.map(d => (
                <div key={d.dept}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{d.dept}</span>
                    <span style={{ fontWeight: 700, color: d.color }}>{d.nurses} nurses</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--border)' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${(d.nurses / maxNurses) * 100}%`,
                      background: d.color,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2col">

        {/* Activity Feed */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Recent Activity</span>
          </div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {activityFeed.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 16px',
                borderBottom: i < activityFeed.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: item.color + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0,
                }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--ink)', fontWeight: 500 }}>{item.text}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions + Billing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="dash-card">
            <div className="dash-card-header"><span className="dash-card-title">Quick Actions</span></div>
            <div className="dash-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { href: '/hospital/agreements', icon: '📄', label: 'View Agreements', color: '#0E7B8C' },
                { href: '/hospital/departments', icon: '🏢', label: 'Departments', color: '#7B2FBE' },
                { href: '/hospital/schedule', icon: '🗓️', label: 'Shift Schedule', color: '#b85e00' },
                { href: '/hospital/messages', icon: '💬', label: 'Messages', color: '#1A7A4A' },
              ].map(a => (
                <Link key={a.href} href={a.href} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '14px 8px', borderRadius: 10, textDecoration: 'none',
                  background: a.color + '10', border: `1px solid ${a.color}25`,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: '1.4rem' }}>{a.icon}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: a.color, textAlign: 'center' }}>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header"><span className="dash-card-title">Billing Summary</span></div>
            <div className="dash-card-body">
              {[
                { label: 'Monthly Spend', value: 'SAR 48,500', color: '#0E7B8C' },
                { label: 'Pending Invoices', value: '3', color: '#b85e00' },
                { label: 'Paid This Month', value: 'SAR 31,200', color: '#1A7A4A' },
              ].map(b => (
                <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{b.label}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: b.color }}>{b.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
