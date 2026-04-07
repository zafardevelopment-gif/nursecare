import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HospitalDashboardPage() {
  const user     = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  // Get hospital record for this user
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, hospital_name, status, rejection_reason')
    .eq('user_id', user.id)
    .single()

  // If no hospital record, show onboarding prompt
  if (!hospital) {
    return (
      <div className="dash-shell">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Welcome, {user.full_name || 'Hospital'}</h1>
            <p className="dash-sub">Get started with NurseCare+ Healthcare Solutions</p>
          </div>
        </div>
        <div style={{ background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.2)', borderRadius: 12, padding: '32px', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>🏥</div>
          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--ink)', marginBottom: 8 }}>Register Your Hospital</div>
          <div style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
            Complete your hospital registration to access NurseCare+ services. Once approved by our admin team, you'll be able to hire qualified nurses.
          </div>
          <Link href="/hospital/onboarding" style={{ background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff', padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block' }}>
            Start Registration →
          </Link>
        </div>
      </div>
    )
  }

  // Show status banners based on hospital status
  const isPending  = hospital.status === 'pending'
  const isRejected = hospital.status === 'rejected'
  const isApproved = hospital.status === 'approved' || hospital.status === 'agreement_pending'
  const isActive   = hospital.status === 'active'

  // Fetch agreements
  const { data: agreements } = await supabase
    .from('hospital_agreements')
    .select('id, ref_number, status, payment_type, start_date, end_date, created_at')
    .eq('hospital_id', hospital.id)
    .order('created_at', { ascending: false })

  const allAgreements   = agreements ?? []
  const pendingSentCount = allAgreements.filter(a => a.status === 'sent').length
  const activeCount      = allAgreements.filter(a => a.status === 'active' || a.status === 'hospital_accepted').length
  const totalCount       = allAgreements.length

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    draft:             { bg: '#F1F5F9', color: '#64748B', label: 'Draft' },
    admin_approved:    { bg: '#EFF6FF', color: '#3B82F6', label: 'Pending Send' },
    sent:              { bg: '#FFF8F0', color: '#b85e00', label: 'Awaiting Review' },
    hospital_accepted: { bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A', label: 'Accepted' },
    hospital_rejected: { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: 'Rejected' },
    active:            { bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A', label: 'Active' },
    expired:           { bg: '#F1F5F9', color: '#64748B', label: 'Expired' },
  }

  const deptBreakdown = [
    { dept: 'ICU', nurses: 8, color: '#0E7B8C' },
    { dept: 'General Ward', nurses: 14, color: '#0ABFCC' },
    { dept: 'Pediatrics', nurses: 6, color: '#7B2FBE' },
    { dept: 'Emergency', nurses: 10, color: '#b85e00' },
    { dept: 'Surgery', nurses: 5, color: '#1A7A4A' },
  ]
  const maxNurses = Math.max(...deptBreakdown.map(d => d.nurses))

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Welcome, {hospital.hospital_name}</h1>
          <p className="dash-sub">Manage your nursing staff, agreements, and operations</p>
        </div>
        <Link href="/hospital/agreements" style={{
          background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
          color: '#fff', padding: '10px 20px', borderRadius: 10,
          fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          📄 Agreements
        </Link>
      </div>

      {/* Status banners */}
      {isPending && (
        <div style={{ background: '#FFF8F0', border: '1px solid rgba(245,132,42,0.3)', borderRadius: 10, padding: '16px 20px', marginBottom: '1.5rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.3rem' }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700, color: '#b85e00', marginBottom: 3 }}>Registration Under Review</div>
            <div style={{ fontSize: '0.83rem', color: 'var(--muted)' }}>Your hospital registration is being reviewed by our admin team. You'll be notified once approved.</div>
          </div>
        </div>
      )}
      {isRejected && (
        <div style={{ background: 'rgba(224,74,74,0.05)', border: '1px solid rgba(224,74,74,0.2)', borderRadius: 10, padding: '16px 20px', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, color: '#E04A4A', marginBottom: 3 }}>✕ Registration Rejected</div>
          {hospital.rejection_reason && (
            <div style={{ fontSize: '0.83rem', color: 'var(--muted)', marginBottom: 8 }}>Reason: {hospital.rejection_reason}</div>
          )}
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Please contact NurseCare+ support to resolve this issue.</div>
        </div>
      )}
      {isApproved && (
        <div style={{ background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.2)', borderRadius: 10, padding: '16px 20px', marginBottom: '1.5rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.3rem' }}>📋</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--teal)', marginBottom: 3 }}>Awaiting Service Agreement</div>
            <div style={{ fontSize: '0.83rem', color: 'var(--muted)' }}>Your hospital is approved. NurseCare+ admin will send you a service agreement shortly. Check the Agreements section.</div>
            <Link href="/hospital/agreements" style={{ fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 700, textDecoration: 'none', marginTop: 6, display: 'inline-block' }}>
              View Agreements →
            </Link>
          </div>
        </div>
      )}
      {pendingSentCount > 0 && (
        <div style={{ background: '#FFF8F0', border: '1px solid rgba(245,132,42,0.3)', borderRadius: 10, padding: '14px 20px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>📨</span>
          <span style={{ fontWeight: 700, color: '#b85e00', fontSize: '0.88rem' }}>
            {pendingSentCount} agreement{pendingSentCount > 1 ? 's' : ''} awaiting your review —{' '}
            <Link href="/hospital/agreements" style={{ color: '#b85e00', textDecoration: 'underline' }}>Review now</Link>
          </span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Agreements', value: totalCount,       color: '#0E7B8C', icon: '📄', bg: 'rgba(14,123,140,0.08)',  href: '/hospital/agreements' },
          { label: 'Awaiting Review',  value: pendingSentCount, color: '#b85e00', icon: '⏳', bg: 'rgba(181,94,0,0.08)',    href: '/hospital/agreements' },
          { label: 'Active',           value: activeCount,      color: '#1A7A4A', icon: '✅', bg: 'rgba(26,122,74,0.08)',   href: '/hospital/agreements' },
          { label: 'Active Nurses',    value: 0,                color: '#7B2FBE', icon: '👩‍⚕️', bg: 'rgba(123,47,190,0.08)', href: '/hospital/dashboard' },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href} style={{ textDecoration: 'none' }}>
            <div className="dash-card" style={{ padding: '1.2rem', cursor: 'pointer', borderTop: `3px solid ${kpi.color}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 10 }}>{kpi.icon}</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{kpi.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid-2col" style={{ marginBottom: '1rem' }}>

        {/* Recent Agreements */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Recent Agreements</span>
            <Link href="/hospital/agreements" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {!allAgreements.length ? (
              <p style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center' }}>No agreements yet</p>
            ) : (
              <div>
                {allAgreements.slice(0, 5).map((ag, i) => {
                  const sc = statusColors[ag.status] ?? statusColors.draft
                  return (
                    <Link key={ag.id} href={`/hospital/agreements/${ag.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: i < Math.min(allAgreements.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)' }}>{ag.ref_number}</div>
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
                    <div style={{ height: '100%', borderRadius: 4, width: `${(d.nurses / maxNurses) * 100}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2col">
        {/* Quick Actions */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Quick Actions</span></div>
          <div className="dash-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { href: '/hospital/agreements', icon: '📄', label: 'Agreements', color: '#0E7B8C' },
              { href: '/hospital/profile',    icon: '🏥', label: 'Profile',    color: '#7B2FBE' },
              { href: '/hospital/departments',icon: '🏢', label: 'Departments', color: '#b85e00' },
              { href: '/hospital/schedule',   icon: '🗓️', label: 'Schedule',   color: '#1A7A4A' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '14px 8px', borderRadius: 10, textDecoration: 'none',
                background: a.color + '10', border: `1px solid ${a.color}25`,
              }}>
                <span style={{ fontSize: '1.4rem' }}>{a.icon}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: a.color, textAlign: 'center' }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Billing Summary */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Billing Summary</span></div>
          <div className="dash-card-body">
            {[
              { label: 'Monthly Spend',    value: 'SAR 48,500', color: '#0E7B8C' },
              { label: 'Pending Invoices', value: '3',          color: '#b85e00' },
              { label: 'Paid This Month',  value: 'SAR 31,200', color: '#1A7A4A' },
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
  )
}
