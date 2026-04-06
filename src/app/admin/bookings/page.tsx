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
          { label: 'Total',             count: counts.total,       bg: '#EBF5FF', color: 'var(--ink)', icon: '📋', key: '' },
          { label: 'Awaiting Nurse',    count: counts.pending,     bg: '#FFF3E0', color: '#F5842A',    icon: '⏳', key: 'pending' },
          { label: 'Active / Accepted', count: counts.active,      bg: '#E8F9F0', color: '#27A869',    icon: '✅', key: 'accepted' },
          { label: 'In Progress',       count: counts.in_progress, bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', icon: '🔄', key: 'in_progress' },
          { label: 'Awaiting Confirm',  count: counts.work_done,   bg: 'rgba(107,63,160,0.08)', color: '#6B3FA0', icon: '🎉', key: 'work_done' },
          { label: 'Completed',         count: counts.completed,   bg: '#F0FFF4', color: '#27A869',    icon: '🏁', key: 'completed' },
        ].map(k => (
          <Link key={k.key} href={filterUrl(k.key)} style={{ textDecoration: 'none' }}>
            <div className="dash-kpi" style={{ border: filterStatus === k.key ? `1.5px solid ${k.color}` : '1px solid var(--border)', cursor: 'pointer' }}>
              <div className="dash-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
              <div className="dash-kpi-num" style={{ color: k.count > 0 ? k.color : 'var(--ink)' }}>{k.count}</div>
              <div className="dash-kpi-label">{k.label}</div>
            </div>
          </Link>
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
          <div style={{ padding: 0 }}>
            {all.map((b: any, i: number) => {
              const s = STATUS_MAP[b.status] ?? STATUS_MAP.pending
              return (
                <div key={b.id} style={{
                  padding: '1.1rem 1.5rem',
                  borderBottom: i < all.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                    background: 'linear-gradient(135deg,rgba(14,123,140,0.1),rgba(10,191,204,0.08))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                  }}>🏥</div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.patient_name ?? '—'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{b.service_type}</span>
                      <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>{s.label}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      {b.start_date && <Chip>📅 {b.start_date}{b.end_date && b.end_date !== b.start_date ? ` → ${b.end_date}` : ''}</Chip>}
                      {b.shift && <Chip>🕐 {b.shift}</Chip>}
                      {b.duration_hours && <Chip>⏱ {b.duration_hours}h</Chip>}
                      {b.city && <Chip>📍 {b.city}</Chip>}
                      {b.booking_type && <Chip>{b.booking_type === 'weekly' ? '🔁 Weekly' : b.booking_type === 'monthly' ? '📆 Monthly' : '📅 One-Time'}</Chip>}
                    </div>

                    <div style={{ fontSize: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {b.nurse_name
                        ? <span style={{ color: 'var(--muted)' }}>👩‍⚕️ Nurse: <strong style={{ color: '#0E7B8C' }}>{b.nurse_name}</strong></span>
                        : <span style={{ color: '#F5842A', fontWeight: 600 }}>⚠️ No nurse assigned</span>
                      }
                      {b.patient_email && <span style={{ color: 'var(--muted)' }}>✉️ {b.patient_email}</span>}
                    </div>

                    {b.address && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                        📌 {b.address}
                      </div>
                    )}
                    {b.notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        📝 {b.notes}
                      </div>
                    )}
                  </div>

                  {/* Right: date */}
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0, textAlign: 'right', paddingTop: 2 }}>
                    {new Date(b.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <div style={{ marginTop: 2 }}>{new Date(b.created_at).toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              )
            })}
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
