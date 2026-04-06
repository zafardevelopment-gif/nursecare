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
  searchParams: Promise<{ tab?: string; page?: string }>
}

export default async function ProviderBookingsPage({ searchParams }: Props) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const serviceSupabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const filterTab = params.tab ?? ''
  const page      = Math.max(1, parseInt(params.page ?? '1'))
  const offset    = (page - 1) * PAGE_SIZE

  const { data: settings } = await serviceSupabase
    .from('platform_settings')
    .select('require_work_start_confirmation, require_work_completion_confirmation')
    .limit(1)
    .single()

  const requireWorkStart = settings?.require_work_start_confirmation ?? true

  const { data: nurse } = await supabase
    .from('nurses')
    .select('status, city, user_id')
    .eq('user_id', user.id)
    .single()

  const isApproved = nurse?.status === 'approved'

  // Incoming pending requests (unfiltered, always shown separately)
  const { data: pendingRequests } = isApproved ? await serviceSupabase
    .from('booking_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    : { data: [] }

  // My bookings (accepted/declined/etc) — filtered + paginated
  let myQuery = serviceSupabase
    .from('booking_requests')
    .select('*', { count: 'exact' })
    .eq('nurse_id', user.id)

  if (filterTab === 'pending') {
    // pending tab shows the incoming requests section instead
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

  const totalCount = myTotal ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // KPI counts
  const { data: allMine } = await serviceSupabase
    .from('booking_requests')
    .select('status')
    .eq('nurse_id', user.id)

  const mine = allMine ?? []
  const kpi = {
    pending:     (pendingRequests ?? []).length,
    accepted:    mine.filter(b => b.status === 'accepted' || b.status === 'confirmed').length,
    in_progress: mine.filter(b => b.status === 'in_progress').length,
    work_done:   mine.filter(b => b.status === 'work_done').length,
    completed:   mine.filter(b => b.status === 'completed').length,
    total:       mine.length + (pendingRequests ?? []).length,
  }

  function tabUrl(t: string) {
    const sp = new URLSearchParams()
    if (t) sp.set('tab', t)
    return `/provider/bookings${sp.toString() ? '?' + sp.toString() : ''}`
  }

  function pageUrl(p: number) {
    const sp = new URLSearchParams()
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

      {/* KPIs */}
      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>📥</div>
          <div className="dash-kpi-num" style={{ color: kpi.pending > 0 ? '#F5842A' : 'var(--ink)' }}>{kpi.pending}</div>
          <div className="dash-kpi-label">Pending</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{kpi.accepted}</div>
          <div className="dash-kpi-label">Active</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(14,123,140,0.08)' }}>🔄</div>
          <div className="dash-kpi-num" style={{ color: kpi.in_progress > 0 ? '#0E7B8C' : 'var(--ink)' }}>{kpi.in_progress}</div>
          <div className="dash-kpi-label">In Progress</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: 'rgba(107,63,160,0.08)' }}>🎉</div>
          <div className="dash-kpi-num" style={{ color: kpi.work_done > 0 ? '#6B3FA0' : 'var(--ink)' }}>{kpi.work_done}</div>
          <div className="dash-kpi-label">Work Done</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#F0FFF4' }}>🏁</div>
          <div className="dash-kpi-num">{kpi.completed}</div>
          <div className="dash-kpi-label">Completed</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#EBF5FF' }}>📋</div>
          <div className="dash-kpi-num">{kpi.total}</div>
          <div className="dash-kpi-label">Total</div>
        </div>
      </div>

      {/* Incoming Pending Requests — always visible when approved */}
      {isApproved && (pendingRequests ?? []).length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #F5842A' }}>
          <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>📥 Incoming Requests</span>
            <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>
              {(pendingRequests ?? []).length} Pending
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  <Th>#</Th>
                  <Th>Patient</Th>
                  <Th>Service</Th>
                  <Th>Date / Shift</Th>
                  <Th>City</Th>
                  <Th>Created</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {(pendingRequests ?? []).map((req: any, i: number) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(245,132,42,0.015)' }}>
                    <Td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)' }}>
                        {i + 1}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 700 }}>{req.patient_name}</div>
                      {req.patient_condition && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{req.patient_condition}</div>}
                    </Td>
                    <Td>{req.service_type ?? '—'}</Td>
                    <Td>
                      {req.start_date && <div>{req.start_date}{req.end_date && req.end_date !== req.start_date ? ` → ${req.end_date}` : ''}</div>}
                      <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                        {[req.shift, req.duration_hours ? `${req.duration_hours}h` : null].filter(Boolean).join(' · ')}
                      </div>
                    </Td>
                    <Td>{req.city ?? '—'}</Td>
                    <Td>
                      <div>{new Date(req.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{new Date(req.created_at).toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <form action={acceptBooking.bind(null, req.id)}>
                          <button type="submit" style={{ background: '#27A869', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Accept</button>
                        </form>
                        <form action={declineBooking.bind(null, req.id)}>
                          <button type="submit" style={{ background: 'rgba(224,74,74,0.1)', color: '#E04A4A', border: '1px solid rgba(224,74,74,0.25)', padding: '6px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Decline</button>
                        </form>
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

      {/* My Bookings History — tabular with filter + pagination */}
      <div className="dash-card">
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>My Bookings History</span>
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

        {/* Count row */}
        <div style={{ padding: '0.5rem 1.2rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {totalCount} booking{totalCount !== 1 ? 's' : ''}
          {filterTab ? ` · ${filterTab}` : ''}
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
        </div>

        {!(myRequests ?? []).length ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem', fontSize: '0.9rem' }}>
            No bookings in this category
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  <Th>#</Th>
                  <Th>Patient</Th>
                  <Th>Service</Th>
                  <Th>Date / Shift</Th>
                  <Th>City</Th>
                  <Th>Status</Th>
                  <Th>Work Action</Th>
                  <Th>Details</Th>
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
                      <Td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)' }}>
                          {serial}
                        </span>
                      </Td>
                      <Td>
                        <div style={{ fontWeight: 700 }}>{req.patient_name}</div>
                      </Td>
                      <Td>{req.service_type ?? '—'}</Td>
                      <Td>
                        {req.start_date && <div>{req.start_date}{req.end_date && req.end_date !== req.start_date ? ` → ${req.end_date}` : ''}</div>}
                        <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                          {[req.shift, req.duration_hours ? `${req.duration_hours}h` : null].filter(Boolean).join(' · ')}
                        </div>
                      </Td>
                      <Td>{req.city ?? '—'}</Td>
                      <Td>
                        <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>{s.label}</span>
                      </Td>
                      <Td>
                        {canMarkStarted && <WorkStartedBtn requestId={req.id} startDate={req.start_date} isPaid={req.payment_status === 'paid'} />}
                        {canMarkDone    && <WorkDoneBtn requestId={req.id} />}
                        {isWorkDone && <span style={{ fontSize: '0.7rem', color: '#6B3FA0', fontStyle: 'italic' }}>⏳ Awaiting patient…</span>}
                        {!canMarkStarted && !canMarkDone && !isWorkDone && <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>—</span>}
                      </Td>
                      <Td>
                        <Link href={`/provider/bookings/${req.id}`} style={{
                          padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
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
    </div>
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
