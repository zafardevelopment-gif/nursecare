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

const FILTER_TABS = [
  { key: '',            label: 'All' },
  { key: 'pending',     label: '⏳ Pending' },
  { key: 'accepted',    label: '✓ Active' },
  { key: 'in_progress', label: '🔄 In Progress' },
  { key: 'work_done',   label: '✅ Work Done' },
  { key: 'completed',   label: '🏁 Completed' },
  { key: 'declined',    label: '✕ Declined' },
]

interface Props {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>
}

export default async function AdminBookingsPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const filterStatus = params.status ?? ''
  const page         = Math.max(1, parseInt(params.page ?? '1'))
  const search       = (params.q ?? '').trim()
  const offset       = (page - 1) * PAGE_SIZE

  // Build query
  let query = supabase.from('booking_requests').select('*', { count: 'exact' })

  if (filterStatus) {
    if (filterStatus === 'accepted') {
      query = query.in('status', ['accepted', 'confirmed'])
    } else {
      query = query.eq('status', filterStatus)
    }
  }
  if (search) {
    query = query.or(`patient_name.ilike.%${search}%,nurse_name.ilike.%${search}%,service_type.ilike.%${search}%,city.ilike.%${search}%`)
  }

  const { data: bookings, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const all = bookings ?? []
  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // KPI counts (all, no filter)
  const { data: allForCounts } = await supabase
    .from('booking_requests')
    .select('status')

  const allRows = allForCounts ?? []
  const counts = {
    total:       allRows.length,
    pending:     allRows.filter(b => b.status === 'pending').length,
    active:      allRows.filter(b => b.status === 'accepted' || b.status === 'confirmed').length,
    in_progress: allRows.filter(b => b.status === 'in_progress').length,
    work_done:   allRows.filter(b => b.status === 'work_done').length,
    completed:   allRows.filter(b => b.status === 'completed').length,
    declined:    allRows.filter(b => b.status === 'declined').length,
    paid:        allRows.filter(b => (b as any).payment_status === 'paid').length,
    unpaid:      allRows.filter(b => (b as any).payment_status !== 'paid' && b.status !== 'pending' && b.status !== 'declined' && b.status !== 'cancelled').length,
  }

  function pageUrl(p: number) {
    const sp = new URLSearchParams()
    if (filterStatus) sp.set('status', filterStatus)
    if (search) sp.set('q', search)
    sp.set('page', String(p))
    return `/admin/bookings?${sp.toString()}`
  }

  function filterUrl(s: string) {
    const sp = new URLSearchParams()
    if (s) sp.set('status', s)
    if (search) sp.set('q', search)
    return `/admin/bookings${sp.toString() ? '?' + sp.toString() : ''}`
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">All Bookings</h1>
          <p className="dash-sub">Platform-wide booking overview</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total',             count: counts.total,       bg: '#EBF5FF', color: 'var(--ink)', icon: '📋', key: '',            isStatus: true },
          { label: 'Awaiting Nurse',    count: counts.pending,     bg: '#FFF3E0', color: '#F5842A',    icon: '⏳', key: 'pending',     isStatus: true },
          { label: 'Active / Accepted', count: counts.active,      bg: '#E8F9F0', color: '#27A869',    icon: '✅', key: 'accepted',    isStatus: true },
          { label: 'In Progress',       count: counts.in_progress, bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', icon: '🔄', key: 'in_progress', isStatus: true },
          { label: 'Awaiting Confirm',  count: counts.work_done,   bg: 'rgba(107,63,160,0.08)', color: '#6B3FA0', icon: '🎉', key: 'work_done',   isStatus: true },
          { label: 'Completed',         count: counts.completed,   bg: '#F0FFF4', color: '#27A869',    icon: '🏁', key: 'completed',   isStatus: true },
          { label: '💳 Paid',           count: counts.paid,        bg: 'rgba(39,168,105,0.08)', color: '#27A869', icon: '✅', key: 'paid',        isStatus: false },
          { label: '💳 Unpaid',         count: counts.unpaid,      bg: 'rgba(245,132,42,0.08)', color: '#F5842A', icon: '⚠️', key: 'unpaid',      isStatus: false },
        ].map(k => (
          k.isStatus
            ? <Link key={k.key} href={filterUrl(k.key)} style={{ textDecoration: 'none' }}>
                <div className="dash-kpi" style={{ border: filterStatus === k.key ? `1.5px solid ${k.color}` : '1px solid var(--border)', cursor: 'pointer' }}>
                  <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                  <div className="dash-kpi-num" style={{ color: k.count > 0 ? k.color : 'var(--ink)' }}>{k.count}</div>
                  <div className="dash-kpi-label">{k.label}</div>
                </div>
              </Link>
            : <div key={k.key} className="dash-kpi" style={{ border: '1px solid var(--border)' }}>
                <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="dash-kpi-num" style={{ color: k.count > 0 ? k.color : 'var(--ink)' }}>{k.count}</div>
                <div className="dash-kpi-label">{k.label}</div>
              </div>
        ))}
      </div>

      {/* Alert banners */}
      {counts.work_done > 0 && (
        <div style={{ background: 'rgba(107,63,160,0.06)', border: '1px solid rgba(107,63,160,0.25)', borderRadius: 10, padding: '0.75rem 1.2rem', fontSize: '0.85rem', color: '#6B3FA0', fontWeight: 600, marginBottom: '1rem' }}>
          ✅ {counts.work_done} booking{counts.work_done > 1 ? 's' : ''} — nurse marked done, awaiting patient confirmation
        </div>
      )}
      {counts.pending > 0 && (
        <div style={{ background: 'rgba(245,132,42,0.06)', border: '1px solid rgba(245,132,42,0.25)', borderRadius: 10, padding: '0.75rem 1.2rem', fontSize: '0.85rem', color: '#b85e00', fontWeight: 600, marginBottom: '1rem' }}>
          ⏳ {counts.pending} booking{counts.pending > 1 ? 's' : ''} waiting for a nurse to accept
        </div>
      )}

      {/* Filter tabs + search */}
      <div className="dash-card" style={{ marginBottom: 0 }}>
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {FILTER_TABS.map(tab => (
              <Link key={tab.key} href={filterUrl(tab.key)} style={{
                padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600,
                textDecoration: 'none',
                background: filterStatus === tab.key ? 'var(--teal)' : 'var(--cream)',
                color: filterStatus === tab.key ? '#fff' : 'var(--muted)',
                border: filterStatus === tab.key ? 'none' : '1px solid var(--border)',
              }}>
                {tab.label}
              </Link>
            ))}
          </div>
          {/* Search form */}
          <form method="GET" action="/admin/bookings" style={{ display: 'flex', gap: '0.5rem' }}>
            {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search patient, nurse, city…"
              style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.8rem', fontFamily: 'inherit', background: 'var(--cream)', width: 220 }}
            />
            <button type="submit" style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: 'var(--teal)', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Search
            </button>
            {search && (
              <Link href={filterUrl(filterStatus)} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--muted)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                ✕
              </Link>
            )}
          </form>
        </div>

        {/* Results count */}
        <div style={{ padding: '0.6rem 1.2rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {totalCount} result{totalCount !== 1 ? 's' : ''}
          {search ? ` for "${search}"` : ''}
          {filterStatus ? ` · ${filterStatus}` : ''}
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
        </div>

        {!all.length ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem', fontSize: '0.9rem' }}>
            No bookings found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  <Th>#</Th>
                  <Th>Patient</Th>
                  <Th>Service</Th>
                  <Th>Nurse</Th>
                  <Th>Date / Shift</Th>
                  <Th>Type</Th>
                  <Th>City</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                  <Th>Created</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {all.map((b: any, i: number) => {
                  const s = STATUS_MAP[b.status] ?? STATUS_MAP.pending
                  const isPaid = b.payment_status === 'paid'
                  const showPayment = b.status !== 'pending' && b.status !== 'declined' && b.status !== 'cancelled'
                  const serial = offset + i + 1
                  return (
                    <tr key={b.id} style={{ borderBottom: i < all.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)' }}>
                      <Td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)' }}>
                          {serial}
                        </span>
                      </Td>
                      <Td>
                        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{b.patient_name ?? '—'}</div>
                        {b.patient_email && <div style={{ color: 'var(--muted)', fontSize: '0.7rem', marginTop: 1 }}>{b.patient_email}</div>}
                      </Td>
                      <Td>{b.service_type ?? '—'}</Td>
                      <Td>
                        {b.nurse_name
                          ? <span style={{ color: '#0E7B8C', fontWeight: 600 }}>{b.nurse_name}</span>
                          : <span style={{ color: '#F5842A', fontSize: '0.7rem' }}>⚠️ Unassigned</span>
                        }
                      </Td>
                      <Td>
                        {b.start_date && <div>{b.start_date}{b.end_date && b.end_date !== b.start_date ? ` → ${b.end_date}` : ''}</div>}
                        <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                          {[b.shift, shiftTimeRange(b.shift, b.duration_hours), b.duration_hours ? `${b.duration_hours}h` : null].filter(Boolean).join(' · ')}
                        </div>
                      </Td>
                      <Td>
                        {b.booking_type === 'weekly' ? '🔁 Weekly' : b.booking_type === 'monthly' ? '📆 Monthly' : '📅 One-Time'}
                      </Td>
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
                        <Link href={`/admin/bookings/${b.id}`} style={{
                          padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                          background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem',
                          fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>
                          View →
                        </Link>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {page > 1 && (
                <Link href={pageUrl(page - 1)} style={paginBtn(false)}>← Prev</Link>
              )}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return (
                  <Link key={p} href={pageUrl(p)} style={paginBtn(p === page)}>{p}</Link>
                )
              })}
              {page < totalPages && (
                <Link href={pageUrl(page + 1)} style={paginBtn(false)}>Next →</Link>
              )}
            </div>
          </div>
        )}
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

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: '10px 14px', verticalAlign: 'middle', color: 'var(--ink)' }}>
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
