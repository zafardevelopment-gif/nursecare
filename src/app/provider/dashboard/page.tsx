import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { WorkStartedBtn, WorkDoneBtn } from '@/app/provider/bookings/WorkActions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
  accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Accepted' },
  confirmed:   { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
  declined:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
  in_progress: { bg: 'rgba(14,123,140,0.12)', color: '#0E7B8C', label: '🔄 In Progress' },
  work_done:   { bg: 'rgba(107,63,160,0.1)',  color: '#6B3FA0', label: '✅ Work Done' },
  completed:   { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
  cancelled:   { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Cancelled' },
}

const FILTER_TABS = [
  { key: '',            label: 'All' },
  { key: 'accepted',    label: '✓ Active' },
  { key: 'in_progress', label: '🔄 In Progress' },
  { key: 'work_done',   label: '✅ Work Done' },
  { key: 'completed',   label: '🏁 Completed' },
  { key: 'declined',    label: '✕ Declined' },
]

interface Props {
  searchParams: Promise<{ message?: string; tab?: string; page?: string }>
}

export default async function ProviderDashboardPage({ searchParams }: Props) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const serviceSupabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const filterTab = params.tab ?? ''
  const page      = Math.max(1, parseInt(params.page ?? '1'))
  const offset    = (page - 1) * PAGE_SIZE

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id, status, city, hourly_rate, daily_rate, full_name')
    .eq('user_id', user.id)
    .single()

  const nurseStatus = nurse?.status ?? null

  // Build my bookings query
  let myBookingsQuery = serviceSupabase
    .from('booking_requests')
    .select('*', { count: 'exact' })
    .eq('nurse_id', user.id)

  if (filterTab) {
    if (filterTab === 'accepted') {
      myBookingsQuery = myBookingsQuery.in('status', ['accepted', 'confirmed'])
    } else {
      myBookingsQuery = myBookingsQuery.eq('status', filterTab)
    }
  } else {
    myBookingsQuery = myBookingsQuery.neq('status', 'pending')
  }

  const [
    { count: acceptedCount },
    { count: inProgressCount },
    { count: workDoneCount },
    { count: completedCount },
    { data: pendingAgreements },
    { data: pendingRequests },
    { data: myBookings, count: myBookingsTotal },
  ] = await Promise.all([
    serviceSupabase.from('booking_requests').select('*', { count: 'exact', head: true })
      .eq('nurse_id', user.id).in('status', ['accepted', 'confirmed']),
    serviceSupabase.from('booking_requests').select('*', { count: 'exact', head: true })
      .eq('nurse_id', user.id).eq('status', 'in_progress'),
    serviceSupabase.from('booking_requests').select('*', { count: 'exact', head: true })
      .eq('nurse_id', user.id).eq('status', 'work_done'),
    serviceSupabase.from('booking_requests').select('*', { count: 'exact', head: true })
      .eq('nurse_id', user.id).eq('status', 'completed'),
    nurse?.id
      ? supabase.from('agreements').select('id, title, status, generated_at')
          .eq('nurse_id', nurse.id).in('status', ['admin_approved', 'pending'])
          .is('nurse_approved_at', null).order('generated_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    nurseStatus === 'approved'
      ? serviceSupabase.from('booking_requests')
          .select('id, patient_name, service_type, start_date, shift, city, status, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    myBookingsQuery.order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
  ])

  const pendingCount        = (pendingRequests ?? []).length
  const hasPendingAgreements = (pendingAgreements ?? []).length > 0
  const totalPages           = Math.ceil((myBookingsTotal ?? 0) / PAGE_SIZE)

  function tabUrl(t: string) {
    const sp = new URLSearchParams()
    if (t) sp.set('tab', t)
    return `/provider/dashboard${sp.toString() ? '?' + sp.toString() : ''}`
  }

  function pageUrl(p: number) {
    const sp = new URLSearchParams()
    if (filterTab) sp.set('tab', filterTab)
    sp.set('page', String(p))
    return `/provider/dashboard?${sp.toString()}`
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Provider Dashboard</h1>
          <p className="dash-sub">Welcome, {user.full_name}!</p>
        </div>
        <Link href="/provider/bookings" style={{
          padding: '8px 16px', borderRadius: 9, border: '1px solid var(--border)',
          background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.85rem',
          fontWeight: 700, textDecoration: 'none',
        }}>
          📥 Incoming Requests
        </Link>
      </div>

      {params.message && (
        <div className="auth-success" style={{ marginBottom: '1.5rem' }}>
          {decodeURIComponent(params.message)}
        </div>
      )}

      {/* Alerts */}
      {pendingCount > 0 && (
        <div style={{
          background: '#FFF8F0', border: '1px solid rgba(245,132,42,0.35)', color: '#b85e00',
          padding: '12px 18px', borderRadius: 9, marginBottom: '1.5rem',
          fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>📥</span>
          <span>{pendingCount} pending booking request{pendingCount > 1 ? 's' : ''} —{' '}
            <Link href="/provider/bookings" style={{ color: '#b85e00', textDecoration: 'underline' }}>Review now</Link>
          </span>
        </div>
      )}

      {/* KPI Row */}
      <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>📥</div>
          <div className="dash-kpi-num" style={{ color: pendingCount > 0 ? '#F5842A' : 'var(--ink)' }}>{pendingCount}</div>
          <div className="dash-kpi-label">New Requests</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{acceptedCount ?? 0}</div>
          <div className="dash-kpi-label">Active Bookings</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(14,123,140,0.08)' }}>🔄</div>
          <div className="dash-kpi-num" style={{ color: (inProgressCount ?? 0) > 0 ? '#0E7B8C' : 'var(--ink)' }}>{inProgressCount ?? 0}</div>
          <div className="dash-kpi-label">In Progress</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(107,63,160,0.08)' }}>🎉</div>
          <div className="dash-kpi-num" style={{ color: (workDoneCount ?? 0) > 0 ? '#6B3FA0' : 'var(--ink)' }}>{workDoneCount ?? 0}</div>
          <div className="dash-kpi-label">Work Done</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#F0FFF4' }}>🏁</div>
          <div className="dash-kpi-num">{completedCount ?? 0}</div>
          <div className="dash-kpi-label">Completed</div>
        </div>
        <div className="dash-kpi" style={{ position: 'relative' }}>
          <div className="dash-kpi-icon" style={{ background: hasPendingAgreements ? '#FFF3E0' : '#EEF6FD' }}>📄</div>
          <div className="dash-kpi-num" style={{ color: hasPendingAgreements ? '#b85e00' : 'var(--ink)' }}>
            {(pendingAgreements ?? []).length}
          </div>
          <div className="dash-kpi-label">To Sign</div>
          {hasPendingAgreements && (
            <span style={{ position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: '50%', background: '#E8831A' }} />
          )}
        </div>
      </div>

      {/* Agreements */}
      {hasPendingAgreements && (
        <div className="dash-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #E8831A' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">📋 Agreements Awaiting Your Signature</span>
            <span style={{ background: 'rgba(232,131,26,0.12)', color: '#9A4B00', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>
              {(pendingAgreements ?? []).length} Action Required
            </span>
          </div>
          <div className="dash-card-body" style={{ padding: '0' }}>
            {(pendingAgreements ?? []).map((ag: any, i: number) => (
              <div key={ag.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: i < (pendingAgreements ?? []).length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ag.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9A4B00', fontWeight: 600, marginTop: 3 }}>
                    {ag.status === 'admin_approved' ? 'Admin signed — your signature needed' : 'Awaiting your approval'}
                  </div>
                </div>
                <Link href={`/provider/agreements/${ag.id}`} style={{
                  background: '#0E7B8C', color: '#fff', padding: '8px 18px', borderRadius: 8,
                  fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 16,
                }}>Review &amp; Sign →</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests Preview */}
      {(pendingRequests ?? []).length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #F5842A' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">📥 Pending Requests</span>
            <Link href="/provider/bookings" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ padding: 0 }}>
            {(pendingRequests ?? []).map((b: any, i: number) => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: i < (pendingRequests ?? []).length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{b.patient_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                    {b.service_type} · {b.shift} · {b.city} · {b.start_date}
                  </div>
                </div>
                <Link href="/provider/bookings" style={{
                  background: '#27A869', color: '#fff', padding: '6px 14px',
                  borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 12,
                }}>Respond →</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Bookings — full with filter + pagination */}
      <div className="dash-card">
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <span className="dash-card-title">My Bookings</span>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {FILTER_TABS.map(tab => (
              <Link key={tab.key} href={tabUrl(tab.key)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                textDecoration: 'none',
                background: filterTab === tab.key ? 'var(--teal)' : 'var(--cream)',
                color: filterTab === tab.key ? '#fff' : 'var(--muted)',
                border: filterTab === tab.key ? 'none' : '1px solid var(--border)',
              }}>
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {!myBookings?.length ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem', fontSize: '0.9rem' }}>
            No bookings found
          </div>
        ) : (
          <div style={{ padding: 0 }}>
            {(myBookings ?? []).map((req: any, i: number) => {
              const s = STATUS_MAP[req.status] ?? STATUS_MAP.pending
              const canMarkStarted = req.status === 'accepted' || req.status === 'confirmed'
              const canMarkDone    = req.status === 'in_progress'
              const isWorkDone     = req.status === 'work_done'

              return (
                <div key={req.id} style={{
                  padding: '1.1rem 1.5rem',
                  borderBottom: i < (myBookings ?? []).length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                      background: 'linear-gradient(135deg,rgba(14,123,140,0.1),rgba(10,191,204,0.08))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                    }}>🏥</div>

                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{req.patient_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{req.service_type}</span>
                        <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>{s.label}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        {req.start_date && <Chip>📅 {req.start_date}{req.end_date && req.end_date !== req.start_date ? ` → ${req.end_date}` : ''}</Chip>}
                        {req.shift && <Chip>🕐 {req.shift}</Chip>}
                        {req.duration_hours && <Chip>⏱ {req.duration_hours}h</Chip>}
                        {req.city && <Chip>📍 {req.city}</Chip>}
                        {req.booking_type && <Chip>{req.booking_type === 'weekly' ? '🔁 Weekly' : req.booking_type === 'monthly' ? '📆 Monthly' : '📅 One-Time'}</Chip>}
                      </div>

                      {req.address && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>📌 {req.address}</div>}
                      {req.notes  && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>📝 {req.notes}</div>}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0, textAlign: 'right' }}>
                      {new Date(req.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  {/* Work action buttons */}
                  {(canMarkStarted || canMarkDone || isWorkDone) && (
                    <div style={{ marginTop: '0.75rem', marginLeft: 54, display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {canMarkStarted && <WorkStartedBtn requestId={req.id} />}
                      {canMarkDone    && <WorkDoneBtn requestId={req.id} />}
                      {isWorkDone && (
                        <span style={{ fontSize: '0.75rem', color: '#6B3FA0', fontStyle: 'italic' }}>
                          ⏳ Awaiting patient confirmation…
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Page {page} of {totalPages} · {myBookingsTotal} total
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {page > 1 && <Link href={pageUrl(page - 1)} style={paginBtn(false)}>← Prev</Link>}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                <Link key={i + 1} href={pageUrl(i + 1)} style={paginBtn(i + 1 === page)}>{i + 1}</Link>
              ))}
              {page < totalPages && <Link href={pageUrl(page + 1)} style={paginBtn(false)}>Next →</Link>}
            </div>
          </div>
        )}
      </div>

      {/* Profile status card */}
      <div className="dash-card" style={{ marginTop: '1.5rem' }}>
        {nurseStatus === null && (
          <>
            <div className="dash-card-header">
              <span className="dash-card-title">Complete Your Profile</span>
              <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>Action Required</span>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Complete your nurse profile to start receiving bookings.</p>
              <Link href="/provider/onboarding" style={{ display: 'inline-block', background: 'var(--teal)', color: '#fff', padding: '10px 24px', borderRadius: '9px', fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none' }}>
                Complete Profile →
              </Link>
            </div>
          </>
        )}
        {nurseStatus === 'pending' && (
          <>
            <div className="dash-card-header">
              <span className="dash-card-title">Profile Under Review</span>
              <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>Pending Approval</span>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Your profile is under review by our admin team.</p>
            </div>
          </>
        )}
        {nurseStatus === 'approved' && (
          <>
            <div className="dash-card-header">
              <span className="dash-card-title">Profile Approved</span>
              <span style={{ background: 'rgba(39,168,105,0.1)', color: '#27A869', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>✓ Active</span>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Your profile is approved. You can now receive booking requests.</p>
            </div>
          </>
        )}
        {nurseStatus === 'update_pending' && (
          <>
            <div className="dash-card-header">
              <span className="dash-card-title">Profile Update Pending</span>
              <span style={{ background: 'rgba(184,94,0,0.1)', color: '#b85e00', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>⏳ Awaiting Approval</span>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Your profile update is under admin review.</p>
              <Link href="/provider/profile" style={{ fontSize: '0.85rem', color: 'var(--teal)', fontWeight: 600 }}>View Profile →</Link>
            </div>
          </>
        )}
        {nurseStatus === 'rejected' && (
          <>
            <div className="dash-card-header">
              <span className="dash-card-title">Profile Rejected</span>
              <span style={{ background: 'rgba(224,74,74,0.1)', color: '#E04A4A', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>Rejected</span>
            </div>
            <div className="dash-card-body">
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Your application was not approved. Please update and resubmit.</p>
              <Link href="/provider/onboarding" style={{ display: 'inline-block', background: '#E04A4A', color: '#fff', padding: '10px 24px', borderRadius: '9px', fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none' }}>
                Resubmit Profile →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'var(--cream)', border: '1px solid var(--border)',
      borderRadius: 7, padding: '2px 8px', fontSize: '0.7rem', color: 'var(--ink)', fontWeight: 500,
    }}>
      {children}
    </span>
  )
}

function paginBtn(active: boolean): React.CSSProperties {
  return {
    padding: '5px 11px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600,
    textDecoration: 'none', border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--teal)' : 'var(--cream)',
    color: active ? '#fff' : 'var(--muted)',
  }
}
