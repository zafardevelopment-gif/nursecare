import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: '#FFF8F0', color: '#b85e00', label: '⏳ Pending' },
  reviewing: { bg: '#EFF6FF', color: '#3B82F6', label: '🔍 Reviewing' },
  matched:   { bg: 'rgba(14,123,140,0.08)', color: '#0E7B8C', label: '✅ Matched' },
  confirmed: { bg: 'rgba(26,122,74,0.08)', color: '#1A7A4A', label: '✅ Confirmed' },
  cancelled: { bg: 'rgba(224,74,74,0.06)', color: '#E04A4A', label: '✕ Cancelled' },
}

const FILTER_TABS = [
  { key: '',          label: 'All' },
  { key: 'pending',   label: '⏳ Pending' },
  { key: 'reviewing', label: '🔍 Reviewing' },
  { key: 'matched',   label: '✅ Matched' },
  { key: 'confirmed', label: '✅ Confirmed' },
  { key: 'cancelled', label: '✕ Cancelled' },
]

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function AdminHospitalBookingsPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const filterStatus = params.status ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const PAGE_SIZE = 20
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('hospital_booking_requests')
    .select(`
      id, status, start_date, end_date, duration_days,
      total_nurses, shifts, booking_mode, created_at,
      nurse_selections, dept_breakdown, specializations,
      hospital_id,
      hospitals ( hospital_name, city )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filterStatus) query = query.eq('status', filterStatus)

  const { data: bookings, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Stats
  const { data: stats } = await supabase
    .from('hospital_booking_requests')
    .select('status')

  const allStats = stats ?? []
  const pendingCount   = allStats.filter(s => s.status === 'pending').length
  const reviewingCount = allStats.filter(s => s.status === 'reviewing').length
  const confirmedCount = allStats.filter(s => s.status === 'confirmed').length

  const buildUrl = (overrides: Record<string, string>) => {
    const p = { status: filterStatus, page: String(page), ...overrides }
    const qs = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')
    return `/admin/hospital-bookings${qs ? '?' + qs : ''}`
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Hospital Bookings</h1>
          <p className="dash-sub">Review and manage nurse booking requests from hospitals</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total',     value: count ?? 0,    color: '#0E7B8C', icon: '📋', bg: 'rgba(14,123,140,0.08)' },
          { label: 'Pending',   value: pendingCount,   color: '#b85e00', icon: '⏳', bg: 'rgba(181,94,0,0.08)' },
          { label: 'Reviewing', value: reviewingCount, color: '#3B82F6', icon: '🔍', bg: 'rgba(59,130,246,0.08)' },
          { label: 'Confirmed', value: confirmedCount, color: '#1A7A4A', icon: '✅', bg: 'rgba(26,122,74,0.08)' },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ padding: '1rem', borderTop: `3px solid ${k.color}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        {FILTER_TABS.map(tab => (
          <Link key={tab.key} href={buildUrl({ status: tab.key, page: '1' })} style={{
            padding: '6px 16px', borderRadius: 50, fontSize: '0.8rem', fontWeight: 700,
            textDecoration: 'none',
            background: filterStatus === tab.key ? 'linear-gradient(135deg,#0E7B8C,#0ABFCC)' : 'var(--card)',
            color: filterStatus === tab.key ? '#fff' : 'var(--muted)',
            border: filterStatus === tab.key ? 'none' : '1px solid var(--border)',
          }}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="dash-card" style={{ overflow: 'hidden' }}>
        <div className="table-scroll-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--shell-bg)' }}>
                {['Hospital', 'Period', 'Duration', 'Nurses Req.', 'Selected', 'Shifts', 'Submitted', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!bookings?.length ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
                    No booking requests found
                  </td>
                </tr>
              ) : bookings.map((b, i) => {
                const sm = STATUS_META[b.status] ?? STATUS_META.pending
                const hospital = (b.hospitals as any)
                const nurseCount = (b.nurse_selections as any[])?.length ?? 0
                return (
                  <tr key={b.id} style={{ borderBottom: i < bookings.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{hospital?.hospital_name ?? '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{hospital?.city ?? ''}</div>
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {new Date(b.start_date).toLocaleDateString('en-GB')} –<br />
                      {new Date(b.end_date).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{b.duration_days}d</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{b.total_nurses}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: nurseCount > 0 ? '#1A7A4A' : 'var(--muted)' }}>{nurseCount}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '0.75rem' }}>
                      {(b.shifts as string[])?.join(', ')}
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                      {new Date(b.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: sm.bg, color: sm.color, fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50, whiteSpace: 'nowrap' }}>
                        {sm.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link href={`/admin/hospital-bookings/${b.id}`} style={{
                        background: 'rgba(14,123,140,0.08)', color: 'var(--teal)',
                        padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700,
                        textDecoration: 'none', whiteSpace: 'nowrap',
                      }}>
                        Review →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '1rem', borderTop: '1px solid var(--border)' }}>
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} style={{ padding: '6px 14px', borderRadius: 7, background: 'var(--shell-bg)', border: '1px solid var(--border)', fontSize: '0.8rem', textDecoration: 'none', color: 'var(--ink)' }}>← Prev</Link>
            )}
            <span style={{ padding: '6px 14px', fontSize: '0.8rem', color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })} style={{ padding: '6px 14px', borderRadius: 7, background: 'var(--shell-bg)', border: '1px solid var(--border)', fontSize: '0.8rem', textDecoration: 'none', color: 'var(--ink)' }}>Next →</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
