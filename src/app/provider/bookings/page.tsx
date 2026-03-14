import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { acceptBooking, declineBooking } from './actions'

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
  accepted:  { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Accepted' },
  declined:  { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
  completed: { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
}

export default async function ProviderBookingsPage() {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  // Check nurse is approved
  const { data: nurse } = await supabase
    .from('nurses')
    .select('status, city')
    .eq('user_id', user.id)
    .single()

  // Fetch pending requests in nurse's city + accepted bookings by this nurse
  const { data: pending } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'pending')
    .eq('city', nurse?.city ?? '')
    .order('created_at', { ascending: false })

  const { data: myBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('nurse_id', user.id)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })

  const isApproved = nurse?.status === 'approved'

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Booking Requests</h1>
          <p className="dash-sub">
            {isApproved
              ? `Showing requests in ${nurse?.city ?? 'your city'}`
              : 'Complete your profile to receive booking requests'}
          </p>
        </div>
      </div>

      {!isApproved && (
        <div className="auth-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span> Your profile must be approved before you can receive bookings.
        </div>
      )}

      {/* KPIs */}
      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>📥</div>
          <div className="dash-kpi-num">{pending?.length ?? 0}</div>
          <div className="dash-kpi-label">New Requests</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{myBookings?.filter(b => b.status === 'accepted').length ?? 0}</div>
          <div className="dash-kpi-label">Accepted</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#EBF5FF' }}>📋</div>
          <div className="dash-kpi-num">{(myBookings?.length ?? 0) + (pending?.length ?? 0)}</div>
          <div className="dash-kpi-label">Total</div>
        </div>
      </div>

      {/* Incoming Requests */}
      {isApproved && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="dash-card-title">Incoming Requests</span>
            {(pending?.length ?? 0) > 0 && (
              <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>
                {pending!.length} New
              </span>
            )}
          </div>
          {!pending?.length ? (
            <div className="dash-card-body" style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
              No pending requests in {nurse?.city ?? 'your city'} right now
            </div>
          ) : (
            <div style={{ padding: 0 }}>
              {pending!.map(booking => (
                <div key={booking.id} style={{
                  padding: '1.2rem 1.5rem',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg,rgba(14,123,140,0.15),rgba(10,191,204,0.15))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      flexShrink: 0,
                    }}>🏥</div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                        {booking.patient_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                        {booking.service_type} · {booking.patient_condition}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                        <Chip>📅 {booking.date}</Chip>
                        <Chip>🕐 {booking.shift}</Chip>
                        <Chip>⏱ {booking.duration_hours}h</Chip>
                        <Chip>📍 {booking.city}</Chip>
                      </div>
                      {booking.notes && (
                        <div style={{
                          background: 'rgba(14,123,140,0.05)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '8px 10px',
                          fontSize: '0.75rem',
                          color: 'var(--muted)',
                        }}>
                          📝 {booking.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <form action={acceptBooking.bind(null, booking.id)}>
                        <button type="submit" style={{
                          background: '#27A869',
                          color: '#fff',
                          border: 'none',
                          padding: '9px 16px',
                          borderRadius: 9,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}>
                          ✓ Accept
                        </button>
                      </form>
                      <form action={declineBooking.bind(null, booking.id)}>
                        <button type="submit" style={{
                          background: 'rgba(224,74,74,0.1)',
                          color: '#E04A4A',
                          border: '1px solid rgba(224,74,74,0.25)',
                          padding: '9px 16px',
                          borderRadius: 9,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}>
                          ✕ Decline
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Accepted/History */}
      {(myBookings?.length ?? 0) > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">My Bookings History</span>
          </div>
          <div style={{ padding: 0 }}>
            {myBookings!.map(booking => {
              const s = statusStyle[booking.status] ?? statusStyle.pending
              return (
                <div key={booking.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid var(--border)',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>
                      {booking.patient_name} · {booking.service_type}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {booking.date} · {booking.shift} · {booking.city}
                    </div>
                  </div>
                  <span style={{
                    background: s.bg,
                    color: s.color,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 50,
                  }}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'var(--cream)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '3px 9px',
      fontSize: '0.72rem',
      color: 'var(--ink)',
      fontWeight: 500,
    }}>
      {children}
    </span>
  )
}
