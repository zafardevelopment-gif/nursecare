import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { ConfirmCompletionBtn } from './ConfirmBtn'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ message?: string }>
}

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Awaiting Nurse' },
  accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Nurse Confirmed' },
  confirmed:   { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
  declined:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
  in_progress: { bg: 'rgba(14,123,140,0.12)', color: '#0E7B8C', label: '🔄 In Progress' },
  work_done:   { bg: 'rgba(107,63,160,0.1)',  color: '#6B3FA0', label: '✅ Work Done — Confirm?' },
  completed:   { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
  cancelled:   { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Cancelled' },
}

export default async function PatientBookingsPage({ searchParams }: Props) {
  const user = await requireRole('patient')
  const supabase = await createSupabaseServerClient()
  const serviceSupabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const { data: settings } = await serviceSupabase
    .from('platform_settings')
    .select('require_work_start_confirmation, require_work_completion_confirmation')
    .limit(1)
    .single()

  const requireWorkStart = settings?.require_work_start_confirmation ?? true
  const requireWorkDone  = settings?.require_work_completion_confirmation ?? true

  // Query booking_requests (parent records) — always has patient_id, patient_name, etc.
  const { data: requests } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  const allItems = requests ?? []
  const total   = allItems.length
  const active  = allItems.filter(b => b.status === 'accepted' || b.status === 'confirmed').length
  const pending = allItems.filter(b => b.status === 'pending').length

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">My Bookings</h1>
          <p className="dash-sub">Track all your booking requests and sessions</p>
        </div>
        <Link href="/patient/booking" className="btn-primary" style={{
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

      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#EBF5FF' }}>📋</div>
          <div className="dash-kpi-num">{total}</div>
          <div className="dash-kpi-label">Total Bookings</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{active}</div>
          <div className="dash-kpi-label">Confirmed</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>⏳</div>
          <div className="dash-kpi-num">{pending}</div>
          <div className="dash-kpi-label">Awaiting Nurse</div>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="dash-card">
          <div className="dash-card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ color: 'var(--muted)', marginBottom: '1.2rem' }}>No bookings yet</p>
            <Link href="/patient/booking" className="btn-primary" style={{ width: 'auto', display: 'inline-block', padding: '10px 24px' }}>
              Book a Nurse →
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {allItems.map((b: any) => {
            const s = statusStyle[b.status] ?? statusStyle.pending
            const typeLabel = b.booking_type === 'weekly' ? '🔁 Weekly' : b.booking_type === 'monthly' ? '📆 Monthly' : '📅 One-Time'
            return (
              <div key={b.id} className="dash-card">
                <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,rgba(14,123,140,0.1),rgba(10,191,204,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                      🏥
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.service_type ?? 'Booking'}</span>
                        <span style={{ background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 50 }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                        {typeLabel} · {b.total_sessions ? `${b.total_sessions} session${b.total_sessions > 1 ? 's' : ''}` : '1 session'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {b.created_at && new Date(b.created_at).toLocaleDateString('en-SA')}
                  </div>
                </div>
                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {b.nurse_name && <Chip>👩‍⚕️ {b.nurse_name}</Chip>}
                  {b.start_date && <Chip>📅 {b.start_date}{b.end_date && b.end_date !== b.start_date ? ` → ${b.end_date}` : ''}</Chip>}
                  {b.shift && <Chip>🕐 {b.shift}</Chip>}
                  {b.duration_hours && <Chip>⏱ {b.duration_hours}h</Chip>}
                  {b.city && <Chip>📍 {b.city}</Chip>}
                </div>

                {/* Work progress timeline — visible when work confirmation flow is active */}
                {(requireWorkStart || requireWorkDone) && (b.status === 'accepted' || b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'work_done') && (
                  <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--cream)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      {/* Step 1: Accepted */}
                      <WorkStep done icon="✓" label="Booked" />
                      <WorkLine done />
                      {/* Step 2: In Progress */}
                      <WorkStep done={b.status === 'in_progress' || b.status === 'work_done' || b.status === 'completed'} active={b.status === 'accepted' || b.status === 'confirmed'} icon="🏃" label="Started" />
                      {requireWorkDone && <>
                        <WorkLine done={b.status === 'work_done' || b.status === 'completed'} />
                        {/* Step 3: Work Done by nurse */}
                        <WorkStep done={b.status === 'work_done' || b.status === 'completed'} active={b.status === 'in_progress'} icon="✅" label="Nurse Done" />
                        <WorkLine done={b.status === 'completed'} />
                        {/* Step 4: Patient Confirmed */}
                        <WorkStep done={b.status === 'completed'} active={b.status === 'work_done'} icon="🎉" label="You Confirmed" />
                      </>}
                    </div>

                    {/* Confirm completion button — shows when nurse has marked done */}
                    {b.status === 'work_done' && requireWorkDone && (
                      <div style={{ marginTop: '0.85rem' }}>
                        <div style={{ fontSize: '0.78rem', color: '#6B3FA0', marginBottom: '0.5rem', fontWeight: 600 }}>
                          🎉 Your nurse has marked the work as done. Please confirm to release payment.
                        </div>
                        <ConfirmCompletionBtn requestId={b.id} />
                      </div>
                    )}
                  </div>
                )}
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

function WorkStep({ done, active, icon, label }: { done?: boolean; active?: boolean; icon: string; label: string }) {
  const color = done ? '#27A869' : active ? '#0E7B8C' : 'var(--muted)'
  const bg    = done ? 'rgba(39,168,105,0.12)' : active ? 'rgba(14,123,140,0.1)' : 'var(--border)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 52 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
        {icon}
      </div>
      <span style={{ fontSize: '0.58rem', color, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </div>
  )
}

function WorkLine({ done }: { done?: boolean }) {
  return (
    <div style={{ flex: 1, height: 2, background: done ? '#27A869' : 'var(--border)', marginBottom: 18, minWidth: 10 }} />
  )
}
