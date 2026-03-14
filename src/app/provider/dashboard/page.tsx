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
    .select('status, city, hourly_rate, daily_rate, final_hourly_price')
    .eq('user_id', user.id)
    .single()

  const status = nurse?.status ?? null

  // Pending bookings in nurse's city
  const { count: pendingCount } = nurse?.status === 'approved'
    ? await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('city', nurse.city ?? '')
    : { count: 0 }

  const { count: acceptedCount } = await supabase
    .from('bookings').select('*', { count: 'exact', head: true })
    .eq('nurse_id', user.id).eq('status', 'accepted')

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
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>⭐</div>
          <div className="dash-kpi-num">—</div>
          <div className="dash-kpi-label">Average Rating</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#F3E8FF' }}>📊</div>
          <div className="dash-kpi-num">—</div>
          <div className="dash-kpi-label">Response Rate</div>
        </div>
      </div>

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
                You need to complete your nurse profile to start receiving bookings. It takes only 2 minutes.
              </p>
              <Link href="/provider/onboarding" style={{
                display: 'inline-block',
                background: 'var(--teal)',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: '9px',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none',
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
                Your profile has been submitted and is currently under review by our admin team. You will be able to receive bookings once approved.
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
                Your profile update request has been submitted and is under admin review. Your current approved profile remains active.
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
                Your application was not approved. Please update your profile with correct information and resubmit.
              </p>
              <Link href="/provider/onboarding" style={{
                display: 'inline-block',
                background: '#E04A4A',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: '9px',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none',
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
