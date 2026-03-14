import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ message?: string }>
}

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
  accepted:  { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Accepted' },
  declined:  { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
  completed: { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
  cancelled: { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Cancelled' },
}

const typeIcon: Record<string, string> = {
  one_time: '📅',
  weekly:   '🔁',
  monthly:  '📆',
}
const typeLabel: Record<string, string> = {
  one_time: 'One-Time',
  weekly:   'Weekly',
  monthly:  'Monthly',
}

export default async function PatientBookingsPage({ searchParams }: Props) {
  const user = await requireRole('patient')
  const supabase = await createSupabaseServerClient()
  const params = await searchParams

  // Fetch parent requests
  const { data: requests } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch all individual bookings for this patient
  const { data: allBookings } = await supabase
    .from('bookings')
    .select('booking_request_id, status')
    .eq('patient_id', user.id)

  // Build a map: request_id → booking statuses
  const requestStats = new Map<string, { total: number; accepted: number; pending: number; declined: number }>()
  for (const b of (allBookings ?? [])) {
    const rid = b.booking_request_id
    if (!rid) continue
    const cur = requestStats.get(rid) ?? { total: 0, accepted: 0, pending: 0, declined: 0 }
    cur.total++
    if (b.status === 'accepted') cur.accepted++
    if (b.status === 'pending')  cur.pending++
    if (b.status === 'declined') cur.declined++
    requestStats.set(rid, cur)
  }

  const totalSessions  = allBookings?.length ?? 0
  const activeSessions = allBookings?.filter(b => b.status === 'accepted').length ?? 0
  const pendingSessions = allBookings?.filter(b => b.status === 'pending').length ?? 0

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">My Bookings</h1>
          <p className="dash-sub">Track all your booking requests and sessions</p>
        </div>
        <Link href="/patient/request" className="btn-primary" style={{
          width: 'auto', padding: '10px 20px', fontSize: '0.88rem', display: 'inline-block',
        }}>
          + New Booking
        </Link>
      </div>

      {params.message && (
        <div className="auth-success" style={{ marginBottom: '1.5rem' }}>
          {decodeURIComponent(params.message)}
        </div>
      )}

      {/* KPIs */}
      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#EBF5FF' }}>📋</div>
          <div className="dash-kpi-num">{requests?.length ?? 0}</div>
          <div className="dash-kpi-label">Booking Requests</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{activeSessions}</div>
          <div className="dash-kpi-label">Accepted Sessions</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>⏳</div>
          <div className="dash-kpi-num">{pendingSessions}</div>
          <div className="dash-kpi-label">Pending Sessions</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#F3E8FF' }}>🗓</div>
          <div className="dash-kpi-num">{totalSessions}</div>
          <div className="dash-kpi-label">Total Sessions</div>
        </div>
      </div>

      {!requests?.length ? (
        <div className="dash-card">
          <div className="dash-card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ color: 'var(--muted)', marginBottom: '1.2rem' }}>No bookings yet</p>
            <Link href="/patient/request" className="btn-primary" style={{ width: 'auto', display: 'inline-block', padding: '10px 24px' }}>
              Book a Nurse →
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map(req => {
            const stats = requestStats.get(req.id)
            const s = statusStyle[req.status] ?? statusStyle.pending
            return (
              <div key={req.id} className="dash-card">
                <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 12,
                      background: 'linear-gradient(135deg,rgba(14,123,140,0.1),rgba(10,191,204,0.1))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                    }}>
                      {typeIcon[req.booking_type] ?? '📅'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{req.service_type}</span>
                        <span style={{ background: 'rgba(14,123,140,0.08)', color: '#0E7B8C', fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 50 }}>
                          {typeLabel[req.booking_type] ?? req.booking_type}
                        </span>
                        <span style={{ background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 50 }}>
                          {s.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 }}>
                        {req.patient_condition} · {req.city}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {new Date(req.created_at).toLocaleDateString('en-SA')}
                  </div>
                </div>

                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
                    <Chip>📅 {req.start_date}{req.booking_type !== 'one_time' && req.end_date ? ` → ${req.end_date}` : ''}</Chip>
                    <Chip>🕐 {req.shift}</Chip>
                    <Chip>⏱ {req.duration_hours}h</Chip>
                    <Chip>🗓 {req.total_sessions} session{req.total_sessions > 1 ? 's' : ''}</Chip>
                  </div>

                  {stats && (
                    <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem' }}>
                      {stats.accepted > 0 && (
                        <span style={{ color: '#27A869', fontWeight: 700 }}>✓ {stats.accepted} accepted</span>
                      )}
                      {stats.pending > 0 && (
                        <span style={{ color: '#F5842A', fontWeight: 700 }}>⏳ {stats.pending} pending</span>
                      )}
                      {stats.declined > 0 && (
                        <span style={{ color: '#E04A4A', fontWeight: 700 }}>✕ {stats.declined} declined</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'var(--cream)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '3px 9px', fontSize: '0.72rem', color: 'var(--ink)', fontWeight: 500,
    }}>
      {children}
    </span>
  )
}
