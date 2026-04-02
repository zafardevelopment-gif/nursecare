import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ message?: string }>
}

export default async function ProviderDashboardPage({ searchParams }: Props) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const params = await searchParams

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id, status, city, hourly_rate, daily_rate, full_name')
    .eq('user_id', user.id)
    .single()

  const status = nurse?.status ?? null

  const [
    { count: pendingCount },
    { count: acceptedCount },
    { data: pendingAgreements },
  ] = await Promise.all([
    nurse?.status === 'approved'
      ? supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('city', nurse.city ?? '')
      : Promise.resolve({ count: 0 }),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('nurse_id', user.id).eq('status', 'accepted'),
    // Agreements waiting for nurse approval
    nurse?.id
      ? supabase
          .from('agreements')
          .select('id, title, status, generated_at')
          .eq('nurse_id', nurse.id)
          .in('status', ['admin_approved', 'pending'])
          .is('nurse_approved_at', null)
          .order('generated_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const hasPendingAgreements = (pendingAgreements ?? []).length > 0

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Provider Dashboard</h1>
          <p className="dash-sub">Welcome, {user.full_name}!</p>
        </div>
      </div>

      {params.message && (
        <div className="auth-success" style={{ marginBottom: '1.5rem' }}>
          {decodeURIComponent(params.message)}
        </div>
      )}

      {/* KPI Row */}
      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>📥</div>
          <div className="dash-kpi-num">{pendingCount ?? 0}</div>
          <div className="dash-kpi-label">New Requests</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{acceptedCount ?? 0}</div>
          <div className="dash-kpi-label">Accepted Bookings</div>
        </div>
        <div className="dash-kpi" style={{ position: 'relative' }}>
          <div className="dash-kpi-icon" style={{ background: hasPendingAgreements ? '#FFF3E0' : '#EEF6FD' }}>📄</div>
          <div className="dash-kpi-num" style={{ color: hasPendingAgreements ? '#b85e00' : 'var(--ink)' }}>
            {(pendingAgreements ?? []).length}
          </div>
          <div className="dash-kpi-label">Agreements to Sign</div>
          {hasPendingAgreements && (
            <span style={{
              position: 'absolute', top: 10, right: 10,
              width: 10, height: 10, borderRadius: '50%',
              background: '#E8831A',
            }} />
          )}
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#F3E8FF' }}>⭐</div>
          <div className="dash-kpi-num">—</div>
          <div className="dash-kpi-label">Average Rating</div>
        </div>
      </div>

      {/* Pending Agreements — Action Required */}
      {hasPendingAgreements && (
        <div className="dash-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #E8831A' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">📋 Agreements Awaiting Your Signature</span>
            <span style={{
              background: 'rgba(232,131,26,0.12)', color: '#9A4B00',
              fontSize: '0.75rem', fontWeight: 700,
              padding: '3px 10px', borderRadius: '50px',
            }}>
              {(pendingAgreements ?? []).length} Action Required
            </span>
          </div>
          <div className="dash-card-body" style={{ padding: '0' }}>
            {(pendingAgreements ?? []).map((ag, i) => (
              <div key={ag.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: i < (pendingAgreements ?? []).length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>
                    {ag.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 3 }}>
                    Received: {new Date(ag.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    &nbsp;·&nbsp;
                    <span style={{ color: '#9A4B00', fontWeight: 600 }}>
                      {ag.status === 'admin_approved' ? 'Admin signed — your signature needed' : 'Awaiting your approval'}
                    </span>
                  </div>
                </div>
                <Link href={`/provider/agreements/${ag.id}`} style={{
                  background: '#0E7B8C', color: '#fff',
                  padding: '8px 18px', borderRadius: 8,
                  fontSize: '0.82rem', fontWeight: 700,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  flexShrink: 0, marginLeft: 16,
                }}>
                  Review &amp; Sign →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile status card */}
      <div className="dash-card">
        {status === null && (
          <>
            <div className="dash-card-header">
              <span className="dash-card-title">Complete Your Profile</span>
              <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>
                Action Required
              </span>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                You need to complete your nurse profile to start receiving bookings.
              </p>
              <Link href="/provider/onboarding" style={{
                display: 'inline-block', background: 'var(--teal)', color: '#fff',
                padding: '10px 24px', borderRadius: '9px', fontSize: '0.88rem',
                fontWeight: 700, textDecoration: 'none',
              }}>
                Complete Profile →
              </Link>
            </div>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="dash-card-header">
              <span className="dash-card-title">Profile Under Review</span>
              <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>
                Pending Approval
              </span>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Your profile is under review by our admin team.
              </p>
              <Link href="/provider/onboarding" style={{ fontSize: '0.85rem', color: 'var(--teal)', fontWeight: 600 }}>
                Edit Profile →
              </Link>
            </div>
          </>
        )}

        {status === 'approved' && (
          <>
            <div className="dash-card-header">
              <span className="dash-card-title">Profile Approved</span>
              <span style={{ background: 'rgba(39,168,105,0.1)', color: '#27A869', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>
                ✓ Active
              </span>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                Your profile is approved. You can now receive booking requests from patients.
              </p>
            </div>
          </>
        )}

        {status === 'update_pending' && (
          <>
            <div className="dash-card-header">
              <span className="dash-card-title">Profile Update Pending</span>
              <span style={{ background: 'rgba(184,94,0,0.1)', color: '#b85e00', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>
                ⏳ Awaiting Approval
              </span>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Your profile update is under admin review. Your current approved profile remains active.
              </p>
              <Link href="/provider/profile" style={{ fontSize: '0.85rem', color: 'var(--teal)', fontWeight: 600 }}>
                View Profile →
              </Link>
            </div>
          </>
        )}

        {status === 'rejected' && (
          <>
            <div className="dash-card-header">
              <span className="dash-card-title">Profile Rejected</span>
              <span style={{ background: 'rgba(224,74,74,0.1)', color: '#E04A4A', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>
                Rejected
              </span>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Your application was not approved. Please update your profile and resubmit.
              </p>
              <Link href="/provider/onboarding" style={{
                display: 'inline-block', background: '#E04A4A', color: '#fff',
                padding: '10px 24px', borderRadius: '9px', fontSize: '0.88rem',
                fontWeight: 700, textDecoration: 'none',
              }}>
                Resubmit Profile →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
