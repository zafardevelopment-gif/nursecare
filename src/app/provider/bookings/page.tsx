import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { acceptBooking, declineBooking } from './actions'
import { WorkStartedBtn, WorkDoneBtn } from './WorkActions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
  accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Accepted' },
  confirmed:   { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
  declined:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
  in_progress: { bg: 'rgba(14,123,140,0.12)', color: '#0E7B8C', label: '🔄 In Progress' },
  work_done:   { bg: 'rgba(107,63,160,0.1)',  color: '#6B3FA0', label: '✅ Work Done' },
  completed:   { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
  cancelled:   { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Cancelled' },
}

const HOSP_BOOKING_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(181,94,0,0.08)',   color: '#b85e00', label: '⏳ Pending Review' },
  reviewing: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', label: '🔍 Under Review' },
  matched:   { bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', label: '✅ Matched' },
  confirmed: { bg: 'rgba(26,122,74,0.08)',  color: '#1A7A4A', label: '🎉 Confirmed' },
  cancelled: { bg: 'rgba(224,74,74,0.06)',  color: '#E04A4A', label: '✕ Cancelled' },
}

const NURSE_APPROVAL_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(181,94,0,0.08)',  color: '#b85e00', label: '⏳ Awaiting Approval' },
  approved: { bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A', label: '✅ Approved' },
  rejected: { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: '✕ Rejected' },
}

const SHIFT_START_TIMES: Record<string, string> = {
  morning: '08:00',
  evening: '16:00',
  night:   '00:00',
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

const FILTER_TABS = [
  { key: '',            label: 'All' },
  { key: 'pending',     label: '📥 Pending' },
  { key: 'accepted',    label: '✓ Active' },
  { key: 'in_progress', label: '🔄 In Progress' },
  { key: 'work_done',   label: '✅ Work Done' },
  { key: 'completed',   label: '🏁 Completed' },
  { key: 'declined',    label: '✕ Declined' },
]

interface Props {
  searchParams: Promise<{ type?: string; tab?: string; page?: string }>
}

export default async function ProviderBookingsPage({ searchParams }: Props) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const serviceSupabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const bookingType = params.type === 'hospital' ? 'hospital' : 'patient'
  const filterTab   = params.tab ?? ''
  const page        = Math.max(1, parseInt(params.page ?? '1'))
  const offset      = (page - 1) * PAGE_SIZE

  const { data: settings } = await serviceSupabase
    .from('platform_settings')
    .select('require_work_start_confirmation, work_start_enable_hours_before, auto_complete_hours, require_nurse_approval')
    .limit(1)
    .single()

  const requireWorkStart      = settings?.require_work_start_confirmation ?? true
  const hoursBeforeEnabled    = (settings as any)?.work_start_enable_hours_before ?? 1
  const autoCompleteHours: number = (settings as any)?.auto_complete_hours ?? 24
  const requireNurseApproval  = (settings as any)?.require_nurse_approval ?? true

  const { data: nurse } = await supabase
    .from('nurses')
    .select('status, city, user_id')
    .eq('user_id', user.id)
    .single()

  const isApproved = nurse?.status === 'approved'

  // ── Patient bookings ──────────────────────────────────────────────────────
  const { data: pendingRequests } = isApproved ? await serviceSupabase
    .from('booking_requests')
    .select('*')
    .eq('nurse_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    : { data: [] }

  let myQuery = serviceSupabase
    .from('booking_requests')
    .select('*, work_done_at, auto_confirm_at', { count: 'exact' })
    .eq('nurse_id', user.id)

  if (filterTab === 'pending') {
    myQuery = myQuery.eq('status', 'pending')
  } else if (filterTab === 'accepted') {
    myQuery = myQuery.in('status', ['accepted', 'confirmed'])
  } else if (filterTab) {
    myQuery = myQuery.eq('status', filterTab)
  } else {
    myQuery = myQuery.neq('status', 'pending')
  }

  const { data: myRequests, count: myTotal } = await myQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const { data: allMine } = await serviceSupabase
    .from('booking_requests')
    .select('status')
    .eq('nurse_id', user.id)

  const mine = allMine ?? []
  const patientKpi = {
    pending:     (pendingRequests ?? []).length,
    accepted:    mine.filter(b => b.status === 'accepted' || b.status === 'confirmed').length,
    in_progress: mine.filter(b => b.status === 'in_progress').length,
    work_done:   mine.filter(b => b.status === 'work_done').length,
    completed:   mine.filter(b => b.status === 'completed').length,
    total:       mine.length + (pendingRequests ?? []).length,
  }

  const patientTotalCount = myTotal ?? 0
  const patientTotalPages = Math.ceil(patientTotalCount / PAGE_SIZE)

  // ── Hospital bookings — where nurse_selections contains this nurse's user_id ──
  // We fetch all hospital bookings and filter in JS since JSONB array search
  // across all statuses requires a contains query
  const { data: allHospBookings } = await serviceSupabase
    .from('hospital_booking_requests')
    .select('id, status, start_date, end_date, duration_days, total_nurses, shifts, created_at, nurse_selections, dept_breakdown, hospital_id, specializations')
    .order('created_at', { ascending: false })

  // Filter: nurse must be in nurse_selections
  const myHospBookings = (allHospBookings ?? []).filter((b: any) => {
    const selections: any[] = b.nurse_selections ?? []
    return selections.some((ns: any) => ns.nurseId === user.id)
  })

  // Fetch hospital names
  const hospIds = [...new Set(myHospBookings.map((b: any) => b.hospital_id))]
  const { data: hospitalRows } = hospIds.length
    ? await serviceSupabase.from('hospitals').select('id, hospital_name, city').in('id', hospIds)
    : { data: [] }
  const hospitalMap = Object.fromEntries((hospitalRows ?? []).map((h: any) => [h.id, h]))

  const hospKpi = {
    total:     myHospBookings.length,
    pending:   myHospBookings.filter(b => b.status === 'pending' || b.status === 'reviewing').length,
    matched:   myHospBookings.filter(b => b.status === 'matched').length,
    confirmed: myHospBookings.filter(b => b.status === 'confirmed').length,
    cancelled: myHospBookings.filter(b => b.status === 'cancelled').length,
  }

  function typeUrl(t: string) {
    return `/provider/bookings?type=${t}`
  }

  function tabUrl(t: string) {
    const sp = new URLSearchParams()
    sp.set('type', 'patient')
    if (t) sp.set('tab', t)
    return `/provider/bookings?${sp.toString()}`
  }

  function pageUrl(p: number) {
    const sp = new URLSearchParams()
    sp.set('type', 'patient')
    if (filterTab) sp.set('tab', filterTab)
    sp.set('page', String(p))
    return `/provider/bookings?${sp.toString()}`
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Booking Requests</h1>
          <p className="dash-sub">
            {isApproved ? 'Manage incoming and active bookings' : 'Complete your profile to receive booking requests'}
          </p>
        </div>
      </div>

      {!isApproved && (
        <div className="auth-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span> Your profile must be approved before you can receive bookings.
        </div>
      )}

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <Link href={typeUrl('patient')} style={{
          padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem',
          textDecoration: 'none',
          background: bookingType === 'patient' ? 'var(--teal)' : 'var(--card)',
          color: bookingType === 'patient' ? '#fff' : 'var(--muted)',
          border: bookingType === 'patient' ? 'none' : '1px solid var(--border)',
        }}>
          🧑‍⚕️ Patient Bookings
          <span style={{ marginLeft: 8, background: bookingType === 'patient' ? 'rgba(255,255,255,0.25)' : 'var(--border)', color: bookingType === 'patient' ? '#fff' : 'var(--muted)', padding: '2px 8px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 800 }}>
            {patientKpi.total}
          </span>
        </Link>
        <Link href={typeUrl('hospital')} style={{
          padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem',
          textDecoration: 'none',
          background: bookingType === 'hospital' ? 'var(--teal)' : 'var(--card)',
          color: bookingType === 'hospital' ? '#fff' : 'var(--muted)',
          border: bookingType === 'hospital' ? 'none' : '1px solid var(--border)',
        }}>
          🏥 Hospital Bookings
          <span style={{ marginLeft: 8, background: bookingType === 'hospital' ? 'rgba(255,255,255,0.25)' : 'var(--border)', color: bookingType === 'hospital' ? '#fff' : 'var(--muted)', padding: '2px 8px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 800 }}>
            {hospKpi.total}
          </span>
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PATIENT BOOKINGS TAB
      ═══════════════════════════════════════════════════════════════════════ */}
      {bookingType === 'patient' && (
        <>
          {/* KPIs */}
          <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
            {[
              { icon: '📥', label: 'Pending',     count: patientKpi.pending,     color: patientKpi.pending > 0 ? '#F5842A' : undefined,   bg: '#FFF3E0' },
              { icon: '✅', label: 'Active',       count: patientKpi.accepted,    color: undefined,                                         bg: '#E8F9F0' },
              { icon: '🔄', label: 'In Progress',  count: patientKpi.in_progress, color: patientKpi.in_progress > 0 ? '#0E7B8C' : undefined, bg: 'rgba(14,123,140,0.08)' },
              { icon: '🎉', label: 'Work Done',    count: patientKpi.work_done,   color: patientKpi.work_done > 0 ? '#6B3FA0' : undefined,   bg: 'rgba(107,63,160,0.08)' },
              { icon: '🏁', label: 'Completed',    count: patientKpi.completed,   color: undefined,                                         bg: '#F0FFF4' },
              { icon: '📋', label: 'Total',        count: patientKpi.total,       color: undefined,                                         bg: '#EBF5FF' },
            ].map(k => (
              <div key={k.label} className="dash-kpi">
                <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="dash-kpi-num" style={{ color: k.color ?? 'var(--ink)' }}>{k.count}</div>
                <div className="dash-kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Incoming pending requests */}
          {isApproved && (pendingRequests ?? []).length > 0 && (
            <div className="dash-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #F5842A' }}>
              <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>📥 Incoming Patient Requests</span>
                <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>
                  {(pendingRequests ?? []).length} Pending
                </span>
              </div>
              <div className="table-scroll-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                      <Th>#</Th><Th>Patient</Th><Th>Service</Th><Th>Date / Shift</Th><Th>City</Th><Th>Created</Th><Th>Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pendingRequests ?? []).map((req: any, i: number) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(245,132,42,0.015)' }}>
                        <Td><SerialNum n={i + 1} /></Td>
                        <Td>
                          <div style={{ fontWeight: 700 }}>{req.patient_name}</div>
                          {req.patient_condition && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{req.patient_condition}</div>}
                        </Td>
                        <Td>{req.service_type ?? '—'}</Td>
                        <Td>
                          {req.start_date && <div>{req.start_date}{req.end_date && req.end_date !== req.start_date ? ` → ${req.end_date}` : ''}</div>}
                          <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                            {[req.shift, shiftTimeRange(req.shift, req.duration_hours), req.duration_hours ? `${req.duration_hours}h` : null].filter(Boolean).join(' · ')}
                          </div>
                        </Td>
                        <Td>{req.city ?? '—'}</Td>
                        <Td>
                          <div>{new Date(req.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{new Date(req.created_at).toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                        </Td>
                        <Td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {requireNurseApproval && (
                              <>
                                <form action={acceptBooking.bind(null, req.id)}>
                                  <button type="submit" style={{ background: '#27A869', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Accept</button>
                                </form>
                                <form action={declineBooking.bind(null, req.id)}>
                                  <button type="submit" style={{ background: 'rgba(224,74,74,0.1)', color: '#E04A4A', border: '1px solid rgba(224,74,74,0.25)', padding: '6px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Decline</button>
                                </form>
                              </>
                            )}
                            <Link href={`/provider/bookings/${req.id}`} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
                              View →
                            </Link>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* My Bookings History */}
          <div className="dash-card">
            <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>My Patient Bookings History</span>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {FILTER_TABS.map(tab => (
                  <Link key={tab.key} href={tabUrl(tab.key)} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none',
                    background: filterTab === tab.key ? 'var(--teal)' : 'var(--cream)',
                    color: filterTab === tab.key ? '#fff' : 'var(--muted)',
                    border: filterTab === tab.key ? 'none' : '1px solid var(--border)',
                  }}>{tab.label}</Link>
                ))}
              </div>
            </div>
            <div style={{ padding: '0.5rem 1.2rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted)' }}>
              {patientTotalCount} booking{patientTotalCount !== 1 ? 's' : ''}
              {filterTab ? ` · ${filterTab}` : ''}
              {patientTotalPages > 1 ? ` · Page ${page} of ${patientTotalPages}` : ''}
            </div>

            {!(myRequests ?? []).length ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem', fontSize: '0.9rem' }}>No bookings in this category</div>
            ) : (
              <div className="table-scroll-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                      <Th>#</Th><Th>Patient</Th><Th>Service</Th><Th>Date / Shift</Th><Th>City</Th><Th>Status</Th><Th>Work Action</Th><Th>Details</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(myRequests ?? []).map((req: any, i: number) => {
                      const s = statusStyle[req.status] ?? statusStyle.pending
                      const canMarkStarted = requireWorkStart && (req.status === 'accepted' || req.status === 'confirmed')
                      const canMarkDone    = req.status === 'in_progress'
                      const isWorkDone     = req.status === 'work_done'
                      const serial = offset + i + 1
                      return (
                        <tr key={req.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)' }}>
                          <Td><SerialNum n={serial} /></Td>
                          <Td><div style={{ fontWeight: 700 }}>{req.patient_name}</div></Td>
                          <Td>{req.service_type ?? '—'}</Td>
                          <Td>
                            {req.start_date && <div>{req.start_date}{req.end_date && req.end_date !== req.start_date ? ` → ${req.end_date}` : ''}</div>}
                            <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                              {[req.shift, shiftTimeRange(req.shift, req.duration_hours), req.duration_hours ? `${req.duration_hours}h` : null].filter(Boolean).join(' · ')}
                            </div>
                          </Td>
                          <Td>{req.city ?? '—'}</Td>
                          <Td>
                            <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{s.label}</span>
                          </Td>
                          <Td>
                            {canMarkStarted && <WorkStartedBtn requestId={req.id} startDate={req.start_date} startTime={SHIFT_START_TIMES[req.shift] ?? null} isPaid={req.payment_status === 'paid'} hoursBeforeEnabled={hoursBeforeEnabled} />}
                            {canMarkDone    && <WorkDoneBtn requestId={req.id} />}
                            {isWorkDone && <WorkDoneStatus autoConfirmAt={req.auto_confirm_at} autoCompleteHours={autoCompleteHours} />}
                            {!canMarkStarted && !canMarkDone && !isWorkDone && <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>—</span>}
                          </Td>
                          <Td>
                            <Link href={`/provider/bookings/${req.id}`} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>View →</Link>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {patientTotalPages > 1 && (
              <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, patientTotalCount)} of {patientTotalCount}</div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {page > 1 && <Link href={pageUrl(page - 1)} style={paginBtn(false)}>← Prev</Link>}
                  {Array.from({ length: Math.min(patientTotalPages, 7) }, (_, i) => (
                    <Link key={i + 1} href={pageUrl(i + 1)} style={paginBtn(i + 1 === page)}>{i + 1}</Link>
                  ))}
                  {page < patientTotalPages && <Link href={pageUrl(page + 1)} style={paginBtn(false)}>Next →</Link>}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          HOSPITAL BOOKINGS TAB
      ═══════════════════════════════════════════════════════════════════════ */}
      {bookingType === 'hospital' && (
        <>
          {/* KPIs */}
          <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
            {[
              { icon: '📋', label: 'Total',      count: hospKpi.total,     bg: '#EBF5FF', color: undefined },
              { icon: '⏳', label: 'Pending',     count: hospKpi.pending,   bg: '#FFF8F0', color: hospKpi.pending > 0 ? '#b85e00' : undefined },
              { icon: '✅', label: 'Matched',     count: hospKpi.matched,   bg: 'rgba(14,123,140,0.08)', color: hospKpi.matched > 0 ? '#0E7B8C' : undefined },
              { icon: '🎉', label: 'Confirmed',   count: hospKpi.confirmed, bg: 'rgba(26,122,74,0.08)',  color: hospKpi.confirmed > 0 ? '#1A7A4A' : undefined },
              { icon: '✕',  label: 'Cancelled',   count: hospKpi.cancelled, bg: 'rgba(224,74,74,0.06)',  color: hospKpi.cancelled > 0 ? '#E04A4A' : undefined },
            ].map(k => (
              <div key={k.label} className="dash-kpi">
                <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="dash-kpi-num" style={{ color: k.color ?? 'var(--ink)' }}>{k.count}</div>
                <div className="dash-kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {myHospBookings.length === 0 ? (
            <div className="dash-card">
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏥</div>
                <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.95rem', marginBottom: 6 }}>No Hospital Bookings Yet</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>You haven't been selected for any hospital bulk booking requests.</div>
              </div>
            </div>
          ) : (
            <div className="dash-card">
              <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>🏥 My Hospital Bookings</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{myHospBookings.length} booking{myHospBookings.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="table-scroll-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                      <Th>#</Th>
                      <Th>Hospital</Th>
                      <Th>Period</Th>
                      <Th>Shifts</Th>
                      <Th>My Department</Th>
                      <Th>My Shift</Th>
                      <Th>My Approval</Th>
                      <Th>Booking Status</Th>
                      <Th>Details</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {myHospBookings.map((b: any, i: number) => {
                      const hs = HOSP_BOOKING_STATUS[b.status] ?? HOSP_BOOKING_STATUS.pending
                      const hosp = hospitalMap[b.hospital_id]

                      // Find this nurse's selection entry
                      const mySelections: any[] = (b.nurse_selections ?? []).filter((ns: any) => ns.nurseId === user.id)

                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)' }}>
                          <Td><SerialNum n={i + 1} /></Td>
                          <Td>
                            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{hosp?.hospital_name ?? '—'}</div>
                            {hosp?.city && <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1 }}>{hosp.city}</div>}
                          </Td>
                          <Td>
                            <div style={{ fontWeight: 600 }}>
                              {new Date(b.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
                              {new Date(b.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1 }}>{b.duration_days} days</div>
                          </Td>
                          <Td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {(b.shifts ?? []).map((s: string) => (
                                <span key={s} style={{ background: 'rgba(14,123,140,0.07)', color: 'var(--teal)', padding: '2px 7px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 600 }}>{s}</span>
                              ))}
                            </div>
                          </Td>
                          <Td>
                            {mySelections.length > 0
                              ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {mySelections.map((ns: any, j: number) => (
                                    <span key={j} style={{ background: 'rgba(14,123,140,0.07)', color: 'var(--ink)', padding: '3px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600 }}>{ns.deptName}</span>
                                  ))}
                                </div>
                              : <span style={{ color: 'var(--muted)' }}>—</span>
                            }
                          </Td>
                          <Td>
                            {mySelections.length > 0
                              ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {mySelections.map((ns: any, j: number) => (
                                    <span key={j} style={{ background: 'rgba(14,123,140,0.07)', color: 'var(--teal)', padding: '3px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>{ns.shift}</span>
                                  ))}
                                </div>
                              : <span style={{ color: 'var(--muted)' }}>—</span>
                            }
                          </Td>
                          <Td>
                            {mySelections.length > 0
                              ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {mySelections.map((ns: any, j: number) => {
                                    const approvalStatus = ns.status ?? 'pending'
                                    const approvalMeta = NURSE_APPROVAL_STATUS[approvalStatus]
                                    return (
                                      <span key={j} style={{ background: approvalMeta.bg, color: approvalMeta.color, padding: '3px 9px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {approvalMeta.label}
                                      </span>
                                    )
                                  })}
                                </div>
                              : <span style={{ color: 'var(--muted)' }}>—</span>
                            }
                          </Td>
                          <Td>
                            <span style={{ background: hs.bg, color: hs.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{hs.label}</span>
                          </Td>
                          <Td>
                            <Link href={`/provider/bookings/hospital/${b.id}`} style={{
                              padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                              background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem',
                              fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                            }}>View →</Link>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
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
    // Should have been auto-confirmed by cron already — show pending cron
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
      <span style={{ fontSize: '0.62rem', color: 'var(--muted)', lineHeight: 1.4 }}>
        Auto-confirms in {diffHrs > 0 ? `${diffHrs}h ` : ''}{diffMin}m
      </span>
      <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>by {deadlineFmt}</span>
    </div>
  )
}

function SerialNum({ n }: { n: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)' }}>
      {n}
    </span>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
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
