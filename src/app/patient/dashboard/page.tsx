import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PatientDashboardPage() {
  const user = await requireRole('patient')
  const supabase = await createSupabaseServerClient()
  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: requests }, { data: platformSettings }] = await Promise.all([
    supabase.from('booking_requests').select('*').eq('patient_id', user.id).order('created_at', { ascending: false }),
    serviceSupabase.from('platform_settings').select('require_nurse_approval').limit(1).single(),
  ])

  const requireNurseApproval = (platformSettings as any)?.require_nurse_approval ?? true

  const allItems = requests ?? []
  // When nurse approval is off, pending counts as confirmed
  const active  = allItems.filter((b: any) => b.status === 'accepted' || b.status === 'confirmed' || (!requireNurseApproval && b.status === 'pending')).length
  const pending = requireNurseApproval ? allItems.filter((b: any) => b.status === 'pending').length : 0
  const total   = allItems.length
  const unpaid  = allItems.filter((b: any) =>
    ['accepted','confirmed','in_progress','work_done','completed'].includes(b.status) && b.payment_status !== 'paid'
  ).length
  const recentBookings = allItems.slice(0, 5)

  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Awaiting Nurse' },
    accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
    confirmed:   { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
    declined:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
    in_progress: { bg: 'rgba(14,123,140,0.12)', color: '#0E7B8C', label: '🔄 In Progress' },
    work_done:   { bg: 'rgba(107,63,160,0.1)',  color: '#6B3FA0', label: '✅ Work Done' },
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
          <div className="dash-kpi-icon" style={{ background: unpaid > 0 ? 'rgba(245,132,42,0.1)' : '#F3E8FF' }}>💳</div>
          <div className="dash-kpi-num" style={{ color: unpaid > 0 ? '#F5842A' : 'var(--ink)' }}>{unpaid}</div>
          <div className="dash-kpi-label">Payment Pending</div>
        </div>
      </div>

      {recentBookings.length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>My Recent Bookings</span>
            <Link href="/patient/bookings" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  <DTh>#</DTh>
                  <DTh>Service</DTh>
                  <DTh>Nurse</DTh>
                  <DTh>Date / Shift</DTh>
                  <DTh>City</DTh>
                  <DTh>Status</DTh>
                  <DTh>Payment</DTh>
                  <DTh>Action</DTh>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b: any, i: number) => {
                  const effectiveStatus = (!requireNurseApproval && b.status === 'pending') ? 'accepted' : b.status
                  const s = statusStyle[effectiveStatus] ?? statusStyle.pending
                  const showPayment = ['accepted','confirmed','in_progress','work_done','completed'].includes(effectiveStatus)
                  const isPaid = b.payment_status === 'paid'
                  return (
                    <tr key={b.id} style={{ borderBottom: i < recentBookings.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)' }}>
                      <DTd>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)' }}>{i + 1}</span>
                      </DTd>
                      <DTd><div style={{ fontWeight: 700 }}>{b.service_type ?? 'Booking'}</div></DTd>
                      <DTd>{b.nurse_name ? <span style={{ color: '#0E7B8C', fontWeight: 600 }}>👩‍⚕️ {b.nurse_name}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</DTd>
                      <DTd>
                        {b.start_date && <div>{b.start_date}</div>}
                        <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{[b.shift, shiftTimeRange(b.shift, b.duration_hours)].filter(Boolean).join(' · ')}</div>
                      </DTd>
                      <DTd>{b.city ?? '—'}</DTd>
                      <DTd>
                        <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{s.label}</span>
                      </DTd>
                      <DTd>
                        {showPayment
                          ? isPaid
                            ? <span style={{ background: 'rgba(39,168,105,0.1)', color: '#27A869', fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50 }}>✅ Paid</span>
                            : <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50 }}>⚠️ Unpaid</span>
                          : <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>—</span>
                        }
                      </DTd>
                      <DTd>
                        <Link href={`/patient/bookings/${b.id}`} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
                          View →
                        </Link>
                      </DTd>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="dash-card">
        <div className="dash-card-header" style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)' }}>
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

function shiftTimeRange(shift?: string | null, durationHours?: number | null): string | null {
  if (!shift || !durationHours) return null
  const START: Record<string, number> = { morning: 8, evening: 16, night: 0 }
  const startH = START[shift.toLowerCase()] ?? null
  if (startH === null) return null
  const endH = (startH + durationHours) % 24
  const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`
  return `${fmt(startH)}–${fmt(endH)}`
}

function DTh({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, fontSize: '0.67rem', color: 'var(--muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </th>
  )
}

function DTd({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: '9px 12px', verticalAlign: 'middle', color: 'var(--ink)' }}>
      {children}
    </td>
  )
}
