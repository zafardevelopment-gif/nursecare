import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 15

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

const HOSP_STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(181,94,0,0.08)',   color: '#b85e00', label: '⏳ Pending Review' },
  reviewing: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', label: '🔍 Reviewing' },
  matched:   { bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', label: '✅ Matched' },
  confirmed: { bg: 'rgba(26,122,74,0.08)',  color: '#1A7A4A', label: '🎉 Confirmed' },
  cancelled: { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: '✕ Cancelled' },
}

const PATIENT_FILTER_TABS = [
  { key: '',            label: 'All' },
  { key: 'pending',     label: '⏳ Pending' },
  { key: 'accepted',    label: '✓ Active' },
  { key: 'in_progress', label: '🔄 In Progress' },
  { key: 'work_done',   label: '✅ Work Done' },
  { key: 'completed',   label: '🏁 Completed' },
  { key: 'declined',    label: '✕ Declined' },
]

const HOSP_FILTER_TABS = [
  { key: '',          label: 'All' },
  { key: 'pending',   label: '⏳ Pending' },
  { key: 'reviewing', label: '🔍 Reviewing' },
  { key: 'matched',   label: '✅ Matched' },
  { key: 'confirmed', label: '🎉 Confirmed' },
  { key: 'cancelled', label: '✕ Cancelled' },
]

interface Props {
  searchParams: Promise<{ type?: string; status?: string; page?: string; q?: string }>
}

export default async function AdminBookingsPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const bookingType  = params.type === 'hospital' ? 'hospital' : 'patient'
  const filterStatus = params.status ?? ''
  const page         = Math.max(1, parseInt(params.page ?? '1'))
  const search       = (params.q ?? '').trim()
  const offset       = (page - 1) * PAGE_SIZE

  // ── Patient bookings ──────────────────────────────────────────────────────
  let patientQuery = supabase.from('booking_requests').select('*', { count: 'exact' })
  if (filterStatus && bookingType === 'patient') {
    if (filterStatus === 'accepted') {
      patientQuery = patientQuery.in('status', ['accepted', 'confirmed'])
    } else {
      patientQuery = patientQuery.eq('status', filterStatus)
    }
  }
  if (search && bookingType === 'patient') {
    patientQuery = patientQuery.or(`patient_name.ilike.%${search}%,nurse_name.ilike.%${search}%,service_type.ilike.%${search}%,city.ilike.%${search}%`)
  }

  // ── Hospital bookings ─────────────────────────────────────────────────────
  let hospQuery = supabase
    .from('hospital_booking_requests')
    .select('id, status, start_date, end_date, duration_days, total_nurses, shifts, created_at, nurse_selections, dept_breakdown, hospital_id, specializations, gender_preference, language_preference', { count: 'exact' })
  if (filterStatus && bookingType === 'hospital') {
    hospQuery = hospQuery.eq('status', filterStatus)
  }
  if (search && bookingType === 'hospital') {
    hospQuery = hospQuery.ilike('status', `%${search}%`)
  }

  const [
    { data: patientBookings, count: patientCount },
    { data: hospBookings,    count: hospCount },
    { data: patientCountRows },
    { data: hospCountRows },
    { data: hospitals },
  ] = await Promise.all([
    bookingType === 'patient'
      ? patientQuery.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1)
      : Promise.resolve({ data: [], count: 0 }),
    bookingType === 'hospital'
      ? hospQuery.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1)
      : Promise.resolve({ data: [], count: 0 }),
    // Single DB GROUP BY instead of full-table fetch + 8 JS .filter() passes
    supabase.rpc('count_bookings_by_status'),
    supabase.rpc('count_hosp_bookings_by_status'),
    supabase.from('hospitals').select('id, hospital_name'),
  ])

  const hospitalMap = Object.fromEntries((hospitals ?? []).map((h: any) => [h.id, h.hospital_name]))

  // RPC returns [{ status, payment_status, count }]
  type BookingCountRow = { status: string; payment_status: string; count: number }
  const pbRows = (patientCountRows ?? []) as BookingCountRow[]
  const sum = (fn: (r: BookingCountRow) => boolean) => pbRows.filter(fn).reduce((a, r) => a + r.count, 0)

  const patientCounts = {
    total:       pbRows.reduce((a, r) => a + r.count, 0),
    pending:     sum(r => r.status === 'pending'),
    active:      sum(r => r.status === 'accepted' || r.status === 'confirmed'),
    in_progress: sum(r => r.status === 'in_progress'),
    work_done:   sum(r => r.status === 'work_done'),
    completed:   sum(r => r.status === 'completed'),
    paid:        sum(r => r.payment_status === 'paid'),
    unpaid:      sum(r => r.payment_status !== 'paid' && !['pending','declined','cancelled'].includes(r.status)),
  }

  type HospCountRow = { status: string; count: number }
  const hbRows = (hospCountRows ?? []) as HospCountRow[]
  const hSum = (st: string) => hbRows.filter(r => r.status === st).reduce((a, r) => a + r.count, 0)

  const hospCounts = {
    total:     hbRows.reduce((a, r) => a + r.count, 0),
    pending:   hSum('pending'),
    reviewing: hSum('reviewing'),
    matched:   hSum('matched'),
    confirmed: hSum('confirmed'),
    cancelled: hSum('cancelled'),
  }

  const totalCount = bookingType === 'patient' ? (patientCount ?? 0) : (hospCount ?? 0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function pageUrl(p: number) {
    const sp = new URLSearchParams()
    sp.set('type', bookingType)
    if (filterStatus) sp.set('status', filterStatus)
    if (search) sp.set('q', search)
    sp.set('page', String(p))
    return `/admin/bookings?${sp.toString()}`
  }

  function filterUrl(s: string) {
    const sp = new URLSearchParams()
    sp.set('type', bookingType)
    if (s) sp.set('status', s)
    if (search) sp.set('q', search)
    return `/admin/bookings?${sp.toString()}`
  }

  function typeUrl(t: string) {
    return `/admin/bookings?type=${t}`
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">All Bookings</h1>
          <p className="dash-sub">Platform-wide booking overview</p>
        </div>
      </div>

      {/* Type toggle — Patient / Hospital */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link href={typeUrl('patient')} style={{
          padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem',
          textDecoration: 'none',
          background: bookingType === 'patient' ? 'var(--teal)' : 'var(--card)',
          color: bookingType === 'patient' ? '#fff' : 'var(--muted)',
          border: bookingType === 'patient' ? 'none' : '1px solid var(--border)',
        }}>
          🧑‍⚕️ Patient Bookings
          <span style={{ marginLeft: 8, background: bookingType === 'patient' ? 'rgba(255,255,255,0.25)' : 'var(--border)', color: bookingType === 'patient' ? '#fff' : 'var(--muted)', padding: '2px 8px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 800 }}>
            {patientCounts.total}
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
            {hospCounts.total}
          </span>
        </Link>
      </div>

      {/* ── PATIENT BOOKINGS ─────────────────────────────────────────────────── */}
      {bookingType === 'patient' && (
        <>
          {/* KPI row */}
          <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
            {[
              { label: 'Total',             count: patientCounts.total,       bg: '#EBF5FF', color: 'var(--ink)', icon: '📋', key: '',            isStatus: true },
              { label: 'Awaiting Nurse',    count: patientCounts.pending,     bg: '#FFF3E0', color: '#F5842A',    icon: '⏳', key: 'pending',     isStatus: true },
              { label: 'Active',            count: patientCounts.active,      bg: '#E8F9F0', color: '#27A869',    icon: '✅', key: 'accepted',    isStatus: true },
              { label: 'In Progress',       count: patientCounts.in_progress, bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', icon: '🔄', key: 'in_progress', isStatus: true },
              { label: 'Awaiting Confirm',  count: patientCounts.work_done,   bg: 'rgba(107,63,160,0.08)', color: '#6B3FA0', icon: '🎉', key: 'work_done',   isStatus: true },
              { label: 'Completed',         count: patientCounts.completed,   bg: '#F0FFF4', color: '#27A869',    icon: '🏁', key: 'completed',   isStatus: true },
              { label: '💳 Paid',           count: patientCounts.paid,        bg: 'rgba(39,168,105,0.08)', color: '#27A869', icon: '💳', key: '', isStatus: false },
              { label: '⚠️ Unpaid',         count: patientCounts.unpaid,      bg: 'rgba(245,132,42,0.08)', color: '#F5842A', icon: '⚠️', key: '', isStatus: false },
            ].map((k, idx) => (
              k.isStatus
                ? <Link key={idx} href={filterUrl(k.key)} style={{ textDecoration: 'none' }}>
                    <div className="dash-kpi" style={{ border: filterStatus === k.key ? `1.5px solid ${k.color}` : '1px solid var(--border)', cursor: 'pointer' }}>
                      <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                      <div className="dash-kpi-num" style={{ color: k.count > 0 ? k.color : 'var(--ink)' }}>{k.count}</div>
                      <div className="dash-kpi-label">{k.label}</div>
                    </div>
                  </Link>
                : <div key={idx} className="dash-kpi" style={{ border: '1px solid var(--border)' }}>
                    <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                    <div className="dash-kpi-num" style={{ color: k.count > 0 ? k.color : 'var(--ink)' }}>{k.count}</div>
                    <div className="dash-kpi-label">{k.label}</div>
                  </div>
            ))}
          </div>

          {patientCounts.work_done > 0 && (
            <div style={{ background: 'rgba(107,63,160,0.06)', border: '1px solid rgba(107,63,160,0.25)', borderRadius: 10, padding: '0.75rem 1.2rem', fontSize: '0.85rem', color: '#6B3FA0', fontWeight: 600, marginBottom: '1rem' }}>
              ✅ {patientCounts.work_done} booking{patientCounts.work_done > 1 ? 's' : ''} — nurse marked done, awaiting patient confirmation
            </div>
          )}

          <div className="dash-card" style={{ marginBottom: 0 }}>
            <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {PATIENT_FILTER_TABS.map(tab => (
                  <Link key={tab.key} href={filterUrl(tab.key)} style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600,
                    textDecoration: 'none',
                    background: filterStatus === tab.key ? 'var(--teal)' : 'var(--cream)',
                    color: filterStatus === tab.key ? '#fff' : 'var(--muted)',
                    border: filterStatus === tab.key ? 'none' : '1px solid var(--border)',
                  }}>{tab.label}</Link>
                ))}
              </div>
              <form method="GET" action="/admin/bookings" style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="hidden" name="type" value="patient" />
                {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
                <input type="text" name="q" defaultValue={search} placeholder="Search patient, nurse, city…"
                  className="bookings-search-input"
                  style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.8rem', fontFamily: 'inherit', background: 'var(--cream)', width: 220 }} />
                <button type="submit" style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: 'var(--teal)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Search</button>
                {search && <Link href={filterUrl(filterStatus)} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--muted)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>✕</Link>}
              </form>
            </div>

            <div style={{ padding: '0.6rem 1.2rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted)' }}>
              {totalCount} result{totalCount !== 1 ? 's' : ''}
              {search ? ` for "${search}"` : ''}
              {filterStatus ? ` · ${filterStatus}` : ''}
              {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
            </div>

            {!(patientBookings ?? []).length ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem', fontSize: '0.9rem' }}>No bookings found</div>
            ) : (
              <div className="table-scroll-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                      <Th>#</Th><Th>Patient</Th><Th>Service</Th><Th>Nurse</Th>
                      <Th>Date / Shift</Th><Th>Type</Th><Th>City</Th>
                      <Th>Status</Th><Th>Payment</Th><Th>Created</Th><Th>Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(patientBookings ?? []).map((b: any, i: number) => {
                      const s = STATUS_MAP[b.status] ?? STATUS_MAP.pending
                      const isPaid = b.payment_status === 'paid'
                      const showPayment = !['pending','declined','cancelled'].includes(b.status)
                      const serial = offset + i + 1
                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)' }}>
                          <Td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)' }}>{serial}</span>
                          </Td>
                          <Td>
                            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{b.patient_name ?? '—'}</div>
                            {b.patient_email && <div style={{ color: 'var(--muted)', fontSize: '0.7rem', marginTop: 1 }}>{b.patient_email}</div>}
                          </Td>
                          <Td>{b.service_type ?? '—'}</Td>
                          <Td>
                            {b.nurse_id
                              ? <Link href={`/admin/nurses/${b.nurse_id}`} style={{ color: '#0E7B8C', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(14,123,140,0.08)', border: '1.5px solid rgba(14,123,140,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>👩‍⚕️</span>
                                  <span style={{ borderBottom: '1px dashed #0E7B8C' }}>{b.nurse_name ?? 'View Nurse'}</span>
                                </Link>
                              : <span style={{ color: '#F5842A', fontSize: '0.7rem' }}>⚠️ Unassigned</span>
                            }
                          </Td>
                          <Td>
                            {b.start_date && <div>{b.start_date}{b.end_date && b.end_date !== b.start_date ? ` → ${b.end_date}` : ''}</div>}
                            <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                              {[b.shift, shiftTimeRange(b.shift, b.duration_hours), b.duration_hours ? `${b.duration_hours}h` : null].filter(Boolean).join(' · ')}
                            </div>
                          </Td>
                          <Td>{b.booking_type === 'weekly' ? '🔁 Weekly' : b.booking_type === 'monthly' ? '📆 Monthly' : '📅 One-Time'}</Td>
                          <Td>{b.city ?? '—'}</Td>
                          <Td>
                            <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{s.label}</span>
                          </Td>
                          <Td>
                            {showPayment
                              ? isPaid
                                ? <span style={{ background:'rgba(39,168,105,0.1)', color:'#27A869', fontSize:'0.65rem', fontWeight:700, padding:'3px 9px', borderRadius:50 }}>💳 Paid</span>
                                : <span style={{ background:'rgba(245,132,42,0.1)', color:'#F5842A', fontSize:'0.65rem', fontWeight:700, padding:'3px 9px', borderRadius:50 }}>⚠️ Unpaid</span>
                              : <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>—</span>
                            }
                          </Td>
                          <Td>
                            <div>{new Date(b.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{new Date(b.created_at).toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                          </Td>
                          <Td>
                            <Link href={`/admin/bookings/${b.id}`} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>View →</Link>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination page={page} totalPages={totalPages} totalCount={totalCount} offset={offset} pageSize={PAGE_SIZE} pageUrl={pageUrl} />
          </div>
        </>
      )}

      {/* ── HOSPITAL BOOKINGS ─────────────────────────────────────────────────── */}
      {bookingType === 'hospital' && (
        <>
          {/* KPI row */}
          <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
            {[
              { label: 'Total',      count: hospCounts.total,     bg: '#EBF5FF', color: 'var(--ink)', icon: '📋', key: '' },
              { label: 'Pending',    count: hospCounts.pending,   bg: '#FFF8F0', color: '#b85e00',    icon: '⏳', key: 'pending' },
              { label: 'Reviewing',  count: hospCounts.reviewing, bg: '#EFF6FF', color: '#3B82F6',    icon: '🔍', key: 'reviewing' },
              { label: 'Matched',    count: hospCounts.matched,   bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', icon: '✅', key: 'matched' },
              { label: 'Confirmed',  count: hospCounts.confirmed, bg: 'rgba(26,122,74,0.08)',  color: '#1A7A4A', icon: '🎉', key: 'confirmed' },
              { label: 'Cancelled',  count: hospCounts.cancelled, bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', icon: '✕',  key: 'cancelled' },
            ].map((k, idx) => (
              <Link key={idx} href={filterUrl(k.key)} style={{ textDecoration: 'none' }}>
                <div className="dash-kpi" style={{ border: filterStatus === k.key ? `1.5px solid ${k.color}` : '1px solid var(--border)', cursor: 'pointer' }}>
                  <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                  <div className="dash-kpi-num" style={{ color: k.count > 0 ? k.color : 'var(--ink)' }}>{k.count}</div>
                  <div className="dash-kpi-label">{k.label}</div>
                </div>
              </Link>
            ))}
          </div>

          <div className="dash-card" style={{ marginBottom: 0 }}>
            <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {HOSP_FILTER_TABS.map(tab => (
                  <Link key={tab.key} href={filterUrl(tab.key)} style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600,
                    textDecoration: 'none',
                    background: filterStatus === tab.key ? 'var(--teal)' : 'var(--cream)',
                    color: filterStatus === tab.key ? '#fff' : 'var(--muted)',
                    border: filterStatus === tab.key ? 'none' : '1px solid var(--border)',
                  }}>{tab.label}</Link>
                ))}
              </div>
            </div>

            <div style={{ padding: '0.6rem 1.2rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted)' }}>
              {totalCount} result{totalCount !== 1 ? 's' : ''}
              {filterStatus ? ` · ${filterStatus}` : ''}
              {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
            </div>

            {!(hospBookings ?? []).length ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem', fontSize: '0.9rem' }}>No hospital bookings found</div>
            ) : (
              <div className="table-scroll-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                      <Th>#</Th><Th>Hospital</Th><Th>Period</Th><Th>Duration</Th>
                      <Th>Nurses Req.</Th><Th>Selected</Th><Th>Shifts</Th>
                      <Th>Status</Th><Th>Submitted</Th><Th>Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hospBookings ?? []).map((b: any, i: number) => {
                      const hs = HOSP_STATUS_MAP[b.status] ?? HOSP_STATUS_MAP.pending
                      const nurseCount = (b.nurse_selections as any[])?.length ?? 0
                      const serial = offset + i + 1
                      const hospitalName = hospitalMap[b.hospital_id] ?? '—'
                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)' }}>
                          <Td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)' }}>{serial}</span>
                          </Td>
                          <Td>
                            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{hospitalName}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1 }}>ID: {b.hospital_id?.slice(0, 8)}</div>
                          </Td>
                          <Td>
                            <div>{new Date(b.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(b.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          </Td>
                          <Td>{b.duration_days} days</Td>
                          <Td style={{ fontWeight: 700, color: '#0E7B8C' }}>{b.total_nurses}</Td>
                          <Td>
                            <span style={{ fontWeight: 700, color: nurseCount > 0 ? '#27A869' : 'var(--muted)' }}>{nurseCount}</span>
                            {nurseCount > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--muted)', marginLeft: 4 }}>/ {b.total_nurses}</span>}
                          </Td>
                          <Td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {(b.shifts as string[] ?? []).map((s: string) => (
                                <span key={s} style={{ background: 'rgba(14,123,140,0.07)', color: 'var(--teal)', padding: '2px 7px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 600 }}>{s}</span>
                              ))}
                            </div>
                          </Td>
                          <Td>
                            <span style={{ background: hs.bg, color: hs.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{hs.label}</span>
                          </Td>
                          <Td>
                            <div>{new Date(b.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{new Date(b.created_at).toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                          </Td>
                          <Td>
                            <Link href={`/admin/hospital-bookings/${b.id}`} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Review →</Link>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination page={page} totalPages={totalPages} totalCount={totalCount} offset={offset} pageSize={PAGE_SIZE} pageUrl={pageUrl} />
          </div>
        </>
      )}
    </div>
  )
}

function Pagination({ page, totalPages, totalCount, offset, pageSize, pageUrl }: { page: number; totalPages: number; totalCount: number; offset: number; pageSize: number; pageUrl: (p: number) => string }) {
  if (totalPages <= 1) return null
  return (
    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
        Showing {offset + 1}–{Math.min(offset + pageSize, totalCount)} of {totalCount}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {page > 1 && <Link href={pageUrl(page - 1)} style={paginBtn(false)}>← Prev</Link>}
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
          <Link key={i + 1} href={pageUrl(i + 1)} style={paginBtn(i + 1 === page)}>{i + 1}</Link>
        ))}
        {page < totalPages && <Link href={pageUrl(page + 1)} style={paginBtn(false)}>Next →</Link>}
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </th>
  )
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: '10px 14px', verticalAlign: 'middle', color: 'var(--ink)', ...style }}>
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
