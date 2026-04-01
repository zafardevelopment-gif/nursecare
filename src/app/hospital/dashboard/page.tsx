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
  ] = await Promise.all([
    supabase.from('agreements').select('*', { count: 'exact', head: true }).eq('hospital_id', user.id),
    supabase.from('agreements').select('*', { count: 'exact', head: true }).eq('hospital_id', user.id).is('hospital_approved_at', null),
    supabase.from('agreements').select('*', { count: 'exact', head: true }).eq('hospital_id', user.id).eq('status', 'fully_approved'),
  ])

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Welcome, {user.full_name || 'Hospital'}</h1>
          <p className="dash-sub">Manage your service agreements with healthcare providers</p>
        </div>
      </div>

      {pendingAgreements ? (
        <div style={{ background: '#FFF8F0', border: '1px solid #F5842A44', color: '#b85e00', padding: '12px 18px', borderRadius: 9, marginBottom: '1.5rem', fontSize: '0.88rem', fontWeight: 700 }}>
          ⏳ You have {pendingAgreements} agreement{pendingAgreements > 1 ? 's' : ''} awaiting your approval —{' '}
          <Link href="/hospital/agreements" style={{ color: '#b85e00', textDecoration: 'underline' }}>Review now</Link>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Agreements', value: totalAgreements ?? 0, color: '#0E7B8C', href: '/hospital/agreements' },
          { label: 'Awaiting Approval', value: pendingAgreements ?? 0, color: '#b85e00', href: '/hospital/agreements' },
          { label: 'Fully Executed', value: fullyApproved ?? 0, color: '#1A7A4A', href: '/hospital/agreements' },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href} style={{ textDecoration: 'none' }}>
            <div className="dash-card" style={{ textAlign: 'center', padding: '1.2rem', cursor: 'pointer' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{kpi.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="dash-card">
        <div className="dash-card-header"><span className="dash-card-title">Quick Actions</span></div>
        <div className="dash-card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/hospital/agreements" style={{ background: '#0E7B8C', color: '#fff', padding: '10px 20px', borderRadius: 9, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>
            📄 View Agreements
          </Link>
        </div>
      </div>
    </div>
  )
}
