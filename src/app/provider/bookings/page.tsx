import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { acceptBooking, declineBooking } from './actions'

export const dynamic = 'force-dynamic'

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
  accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Accepted' },
  confirmed:   { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
  declined:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
  completed:   { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
  cancelled:   { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Cancelled' },
}

export default async function ProviderBookingsPage() {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const serviceSupabase = createSupabaseServiceRoleClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('status, city, user_id')
    .eq('user_id', user.id)
    .single()

  const isApproved = nurse?.status === 'approved'

  // All pending booking_requests — use service role to bypass RLS (nurses read all pending)
  const { data: pendingRequests } = isApproved ? await serviceSupabase
    .from('booking_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    : { data: [] }

  // Requests this nurse has accepted/declined
  const { data: myRequests } = await serviceSupabase
    .from('booking_requests')
    .select('*')
    .eq('nurse_id', user.id)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Booking Requests</h1>
          <p className="dash-sub">
            {isApproved
              ? 'Pending requests from patients'
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
          <div className="dash-kpi-num">{(pendingRequests ?? []).length}</div>
          <div className="dash-kpi-label">Pending Requests</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{(myRequests ?? []).filter((b: any) => b.status === 'accepted' || b.status === 'confirmed').length}</div>
          <div className="dash-kpi-label">Accepted</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#EBF5FF' }}>📋</div>
          <div className="dash-kpi-num">{(myRequests?.length ?? 0) + (pendingRequests?.length ?? 0)}</div>
          <div className="dash-kpi-label">Total</div>
        </div>
      </div>

      {/* Incoming Requests */}
      {isApproved && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">Incoming Requests</span>
            {(pendingRequests ?? []).length > 0 && (
              <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>
                {(pendingRequests ?? []).length} Pending
              </span>
            )}
          </div>
          {(pendingRequests ?? []).length === 0 ? (
            <div className="dash-card-body" style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
              No pending requests right now
            </div>
          ) : (
            <div style={{ padding: 0 }}>
              {(pendingRequests ?? []).map((req: any, i: number) => (
                <div key={req.id} style={{
                  padding: '1.2rem 1.5rem',
                  borderBottom: i < (pendingRequests ?? []).length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 12,
                      background: 'linear-gradient(135deg,rgba(14,123,140,0.15),rgba(10,191,204,0.15))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', flexShrink: 0,
                    }}>🏥</div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                        {req.patient_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                        {req.service_type} {req.patient_condition ? `· ${req.patient_condition}` : ''}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                        {req.start_date && <Chip>📅 {req.start_date}{req.end_date && req.end_date !== req.start_date ? ` → ${req.end_date}` : ''}</Chip>}
                        {req.shift && <Chip>🕐 {req.shift}</Chip>}
                        {req.duration_hours && <Chip>⏱ {req.duration_hours}h</Chip>}
                        {req.city && <Chip>📍 {req.city}</Chip>}
                      </div>
                      {req.address && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                          📌 {req.address}
                        </div>
                      )}
                      {req.notes && (
                        <div style={{
                          background: 'rgba(14,123,140,0.05)', border: '1px solid var(--border)',
                          borderRadius: 8, padding: '8px 10px', fontSize: '0.75rem', color: 'var(--muted)',
                        }}>
                          📝 {req.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <form action={acceptBooking.bind(null, req.id)}>
                        <button type="submit" style={{
                          background: '#27A869', color: '#fff', border: 'none',
                          padding: '9px 16px', borderRadius: 9, fontSize: '0.82rem',
                          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}>✓ Accept</button>
                      </form>
                      <form action={declineBooking.bind(null, req.id)}>
                        <button type="submit" style={{
                          background: 'rgba(224,74,74,0.1)', color: '#E04A4A',
                          border: '1px solid rgba(224,74,74,0.25)',
                          padding: '9px 16px', borderRadius: 9, fontSize: '0.82rem',
                          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}>✕ Decline</button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My History */}
      {(myRequests?.length ?? 0) > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">My Bookings History</span>
          </div>
          <div style={{ padding: 0 }}>
            {(myRequests ?? []).map((req: any) => {
              const s = statusStyle[req.status] ?? statusStyle.pending
              return (
                <div key={req.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>
                      {req.patient_name} · {req.service_type}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {req.start_date} · {req.shift} · {req.city}
                    </div>
                  </div>
                  <span style={{ background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50 }}>
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
      background: 'var(--cream)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '3px 9px', fontSize: '0.72rem', color: 'var(--ink)', fontWeight: 500,
    }}>
      {children}
    </span>
  )
}
