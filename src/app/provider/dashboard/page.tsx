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

const BOOKING_STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(181,94,0,0.08)',   color: '#b85e00', label: '⏳ Pending' },
  reviewing: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', label: '🔍 Reviewing' },
  matched:   { bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', label: '✅ Matched' },
  confirmed: { bg: 'rgba(26,122,74,0.08)',  color: '#1A7A4A', label: '✅ Confirmed' },
  cancelled: { bg: 'rgba(224,74,74,0.06)',  color: '#E04A4A', label: '✕ Cancelled' },
}

const SHIFT_START_TIMES: Record<string, string> = {
  morning: '08:00',
  evening: '16:00',
  night:   '00:00',
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

  const { data: settings } = await serviceSupabase
    .from('platform_settings')
    .select('work_start_enable_hours_before, auto_complete_hours, require_nurse_approval')
    .limit(1)
    .single()

  const hoursBeforeEnabled    = (settings as any)?.work_start_enable_hours_before ?? 1
  const autoCompleteHours: number = (settings as any)?.auto_complete_hours ?? 24
  const requireNurseApproval  = (settings as any)?.require_nurse_approval ?? true
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
    { data: allHospBookingsRaw },
    { data: myComplaints },
    { data: recentBookingsActivity },
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
          .eq('nurse_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    myBookingsQuery.order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    // Hospital bookings — filter server-side using Postgres JSON operator
    serviceSupabase.from('hospital_booking_requests')
      .select('id, status, start_date, end_date, hospital_id, nurse_selections, created_at')
      .filter('nurse_selections', 'cs', JSON.stringify([{ nurseId: user.id }]))
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('complaints').select('id, complaint_type, status, created_at').eq('reporter_id', user.id).order('created_at', { ascending: false }).limit(5),
    serviceSupabase.from('booking_requests')
      .select('id, patient_name, service_type, status, created_at')
      .eq('nurse_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const myHospBookings = allHospBookingsRaw ?? []
  const hospBookingCount = myHospBookings.length

  // Fetch hospital names for my hospital bookings
  const hospIds = [...new Set(myHospBookings.map((b: any) => b.hospital_id).filter(Boolean))]
  const { data: hospitalsData } = hospIds.length > 0
    ? await serviceSupabase.from('hospitals').select('id, hospital_name, city').in('id', hospIds)
    : { data: [] }
  const hospitalMap: Record<string, { hospital_name: string; city: string }> = {}
  for (const h of (hospitalsData ?? [])) hospitalMap[h.id] = h

  // Count hospital bookings awaiting my response (admin approved, no nurse response)
  const hospActionRequired = myHospBookings.filter((b: any) => {
    const myNs = (b.nurse_selections ?? []).filter((ns: any) => ns.nurseId === user.id)
    return myNs.some((ns: any) => ns.status === 'approved' && !ns.nurseResponse)
  }).length

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
        <Link href="/provider/bookings?type=hospital" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ cursor: 'pointer', border: hospActionRequired > 0 ? '1px solid rgba(245,132,42,0.4)' : hospBookingCount > 0 ? '1px solid rgba(14,123,140,0.25)' : '1px solid var(--border)', position: 'relative' }}>
            <div className="dash-kpi-icon" style={{ background: hospActionRequired > 0 ? '#FFF3E0' : 'rgba(14,123,140,0.08)' }}>🏥</div>
            <div className="dash-kpi-num" style={{ color: hospActionRequired > 0 ? '#F5842A' : hospBookingCount > 0 ? 'var(--teal)' : 'var(--ink)' }}>{hospBookingCount}</div>
            <div className="dash-kpi-label">Hospital</div>
            {hospActionRequired > 0 && (
              <span style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: '50%', background: '#F5842A' }} />
            )}
          </div>
        </Link>
        <Link href="/provider/complaints" style={{ textDecoration: 'none' }}>
          <div className="dash-kpi" style={{ cursor: 'pointer' }}>
            <div className="dash-kpi-icon" style={{ background: '#FEE8E8' }}>⚖️</div>
            <div className="dash-kpi-num">{(myComplaints ?? []).length}</div>
            <div className="dash-kpi-label">Disputes</div>
          </div>
        </Link>
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
          <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>📥 Pending Requests</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>
                {(pendingRequests ?? []).length} Pending
              </span>
              <Link href="/provider/bookings" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
            </div>
          </div>
          <div className="table-scroll-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  <DashTh>#</DashTh>
                  <DashTh>Patient</DashTh>
                  <DashTh>Service</DashTh>
                  <DashTh>Date / Shift</DashTh>
                  <DashTh>City</DashTh>
                  <DashTh>Received</DashTh>
                  <DashTh>Action</DashTh>
                </tr>
              </thead>
              <tbody>
                {(pendingRequests ?? []).map((b: any, i: number) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(245,132,42,0.015)' }}>
                    <DashTd>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)' }}>
                        {i + 1}
                      </span>
                    </DashTd>
                    <DashTd>
                      <div style={{ fontWeight: 700 }}>{b.patient_name}</div>
                    </DashTd>
                    <DashTd>{b.service_type ?? '—'}</DashTd>
                    <DashTd>
                      {b.start_date && <div>{b.start_date}</div>}
                      <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{[b.shift, shiftTimeRange(b.shift, b.duration_hours)].filter(Boolean).join(' · ')}</div>
                    </DashTd>
                    <DashTd>{b.city ?? '—'}</DashTd>
                    <DashTd>
                      <div>{new Date(b.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{new Date(b.created_at).toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                    </DashTd>
                    <DashTd>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Link href={`/provider/bookings/${b.id}`} style={{
                          padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)',
                          background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem',
                          fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>View →</Link>
                        {requireNurseApproval && (
                          <Link href="/provider/bookings" style={{
                            padding: '5px 10px', borderRadius: 7, border: 'none',
                            background: '#27A869', color: '#fff', fontSize: '0.72rem',
                            fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                          }}>Respond →</Link>
                        )}
                      </div>
                    </DashTd>
                  </tr>
                ))}
              </tbody>
            </table>
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

        {/* Results count */}
        <div style={{ padding: '0.5rem 1.2rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {myBookingsTotal ?? 0} booking{(myBookingsTotal ?? 0) !== 1 ? 's' : ''}
          {filterTab ? ` · ${filterTab}` : ''}
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
        </div>

        {!myBookings?.length ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem', fontSize: '0.9rem' }}>
            No bookings found
          </div>
        ) : (
          <div className="table-scroll-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  <DashTh>#</DashTh>
                  <DashTh>Patient</DashTh>
                  <DashTh>Service</DashTh>
                  <DashTh>Date / Shift</DashTh>
                  <DashTh>City</DashTh>
                  <DashTh>Status</DashTh>
                  <DashTh>Action</DashTh>
                  <DashTh>Details</DashTh>
                </tr>
              </thead>
              <tbody>
                {(myBookings ?? []).map((req: any, i: number) => {
                  const s = STATUS_MAP[req.status] ?? STATUS_MAP.pending
                  const canMarkStarted = req.status === 'accepted' || req.status === 'confirmed'
                  const canMarkDone    = req.status === 'in_progress'
                  const isWorkDone     = req.status === 'work_done'
                  const serial = offset + i + 1
                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)' }}>
                      <DashTd>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)' }}>
                          {serial}
                        </span>
                      </DashTd>
                      <DashTd>
                        <div style={{ fontWeight: 700 }}>{req.patient_name}</div>
                      </DashTd>
                      <DashTd>{req.service_type ?? '—'}</DashTd>
                      <DashTd>
                        {req.start_date && <div>{req.start_date}{req.end_date && req.end_date !== req.start_date ? ` → ${req.end_date}` : ''}</div>}
                        <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                          {[req.shift, shiftTimeRange(req.shift, req.duration_hours), req.duration_hours ? `${req.duration_hours}h` : null].filter(Boolean).join(' · ')}
                        </div>
                      </DashTd>
                      <DashTd>{req.city ?? '—'}</DashTd>
                      <DashTd>
                        <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{s.label}</span>
                      </DashTd>
                      <DashTd>
                        {canMarkStarted && <WorkStartedBtn requestId={req.id} startDate={req.start_date} startTime={SHIFT_START_TIMES[req.shift] ?? null} isPaid={req.payment_status === 'paid'} hoursBeforeEnabled={hoursBeforeEnabled} />}
                        {canMarkDone    && <WorkDoneBtn requestId={req.id} />}
                        {isWorkDone && <WorkDoneStatus autoConfirmAt={(req as any).auto_confirm_at} autoCompleteHours={autoCompleteHours} />}
                        {!canMarkStarted && !canMarkDone && !isWorkDone && <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>—</span>}
                      </DashTd>
                      <DashTd>
                        <Link href={`/provider/bookings/${req.id}`} style={{
                          padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                          background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem',
                          fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>View →</Link>
                      </DashTd>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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

      {/* Hospital Bookings section */}
      {myHospBookings.length > 0 && (
        <div className="dash-card" style={{ marginTop: '1.5rem' }}>
          <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
            <span className="dash-card-title">🏥 My Hospital Bookings</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hospActionRequired > 0 && (
                <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>
                  {hospActionRequired} Action Required
                </span>
              )}
              <Link href="/provider/bookings?type=hospital" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
            </div>
          </div>
          <div className="table-scroll-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  <DashTh>#</DashTh>
                  <DashTh>Hospital</DashTh>
                  <DashTh>Period</DashTh>
                  <DashTh>Dept / Shift</DashTh>
                  <DashTh>Booking Status</DashTh>
                  <DashTh>My Status</DashTh>
                  <DashTh>Details</DashTh>
                </tr>
              </thead>
              <tbody>
                {myHospBookings.slice(0, 8).map((b: any, i: number) => {
                  const myNs = (b.nurse_selections ?? []).filter((ns: any) => ns.nurseId === user.id)
                  const hosp = hospitalMap[b.hospital_id]
                  const bsm = BOOKING_STATUS_MAP[b.status] ?? BOOKING_STATUS_MAP.pending
                  const needsAction = myNs.some((ns: any) => ns.status === 'approved' && !ns.nurseResponse)
                  const myResp = myNs[0]?.nurseResponse as string | undefined
                  const myAdminStatus = myNs[0]?.status as string | undefined
                  const myStatusLabel = needsAction
                    ? { label: '⚡ Action Required', bg: 'rgba(245,132,42,0.1)', color: '#F5842A' }
                    : myResp === 'accepted'
                    ? { label: '✅ Accepted', bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A' }
                    : myResp === 'rejected'
                    ? { label: '✕ Rejected', bg: 'rgba(224,74,74,0.06)', color: '#E04A4A' }
                    : myAdminStatus === 'pending'
                    ? { label: '⏳ Awaiting Approval', bg: 'rgba(181,94,0,0.08)', color: '#b85e00' }
                    : myAdminStatus === 'rejected'
                    ? { label: '✕ Not Selected', bg: 'rgba(224,74,74,0.06)', color: '#E04A4A' }
                    : { label: '—', bg: 'var(--shell-bg)', color: 'var(--muted)' }
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', background: needsAction ? 'rgba(245,132,42,0.02)' : i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)' }}>
                      <DashTd>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)' }}>
                          {i + 1}
                        </span>
                      </DashTd>
                      <DashTd>
                        <div style={{ fontWeight: 700 }}>{hosp?.hospital_name ?? '—'}</div>
                        {hosp?.city && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{hosp.city}</div>}
                      </DashTd>
                      <DashTd>
                        <div>{new Date(b.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(b.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </DashTd>
                      <DashTd>
                        {myNs.map((ns: any, j: number) => (
                          <div key={j} style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: j < myNs.length - 1 ? 2 : 0 }}>
                            {ns.deptName} · <span style={{ color: ns.shift === 'morning' ? '#b85e00' : ns.shift === 'evening' ? '#DD6B20' : '#7B2FBE' }}>{ns.shift}</span>
                          </div>
                        ))}
                      </DashTd>
                      <DashTd>
                        <span style={{ background: bsm.bg, color: bsm.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{bsm.label}</span>
                      </DashTd>
                      <DashTd>
                        <span style={{ background: myStatusLabel.bg, color: myStatusLabel.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{myStatusLabel.label}</span>
                      </DashTd>
                      <DashTd>
                        <Link href={`/provider/bookings/hospital/${b.id}`} style={{
                          padding: '4px 10px', borderRadius: 6, border: needsAction ? 'none' : '1px solid var(--border)',
                          background: needsAction ? '#F5842A' : 'var(--cream)',
                          color: needsAction ? '#fff' : 'var(--teal)',
                          fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>{needsAction ? 'Respond →' : 'View →'}</Link>
                      </DashTd>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {((recentBookingsActivity ?? []).length > 0 || (myComplaints ?? []).length > 0) && (
        <div className="dash-card" style={{ marginTop: '1.5rem' }}>
          <div className="dash-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="dash-card-title">Recent Activity</span>
            <Link href="/provider/bookings" style={{ fontSize: '0.78rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ padding: 0 }}>
            {[...(recentBookingsActivity ?? []).map((b: any) => ({ type: 'booking', data: b, ts: b.created_at })),
              ...(myComplaints ?? []).map((c: any) => ({ type: 'complaint', data: c, ts: c.created_at }))
            ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 8).map((item, i, arr) => {
              if (item.type === 'booking') {
                const b = item.data
                const s = STATUS_MAP[b.status] ?? STATUS_MAP.pending
                return (
                  <Link key={`b-${b.id}`} href={`/provider/bookings/${b.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>📋</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)' }}>{b.patient_name ?? 'Patient'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1 }}>{b.service_type ?? 'Booking'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{s.label}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{new Date(b.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                  </Link>
                )
              } else {
                const c = item.data
                const cStatus = c.status === 'open'
                  ? { bg: 'rgba(192,57,43,0.08)', color: '#C0392B', label: '🔴 Open' }
                  : c.status === 'resolved'
                  ? { bg: 'rgba(39,168,105,0.08)', color: '#27A869', label: '✅ Resolved' }
                  : { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Closed' }
                return (
                  <Link key={`c-${c.id}`} href="/provider/complaints" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(192,57,43,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>⚖️</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)' }}>Dispute: {c.complaint_type?.replace(/_/g, ' ')}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1 }}>Complaint submitted</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ background: cStatus.bg, color: cStatus.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{cStatus.label}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                  </Link>
                )
              }
            })}
          </div>
        </div>
      )}

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

function WorkDoneStatus({ autoConfirmAt, autoCompleteHours }: { autoConfirmAt?: string | null; autoCompleteHours: number }) {
  const now = new Date()
  if (!autoConfirmAt) {
    return <span style={{ fontSize: '0.7rem', color: '#6B3FA0', fontStyle: 'italic' }}>⏳ Awaiting patient confirmation…</span>
  }
  const deadline = new Date(autoConfirmAt)
  const isOverdue = now >= deadline
  if (isOverdue) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: '0.7rem', color: '#0E7B8C', fontWeight: 700 }}>🤖 Auto-confirming soon…</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>System will confirm shortly</span>
      </div>
    )
  }
  const diffMs  = deadline.getTime() - now.getTime()
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const deadlineFmt = deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + deadline.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: '0.7rem', color: '#6B3FA0', fontWeight: 600 }}>⏳ Awaiting patient…</span>
      <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>
        Auto-confirms in {diffHrs > 0 ? `${diffHrs}h ` : ''}{diffMin}m
      </span>
      <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>by {deadlineFmt}</span>
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

function DashTh({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </th>
  )
}

function DashTd({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: '10px 12px', verticalAlign: 'middle', color: 'var(--ink)' }}>
      {children}
    </td>
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
