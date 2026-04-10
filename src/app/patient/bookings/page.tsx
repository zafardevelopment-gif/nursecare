import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { ConfirmCompletionBtn } from './ConfirmBtn'
import { PayNowBtn } from './PayNowBtn'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface Props {
  searchParams: Promise<{ message?: string; status?: string; page?: string }>
}

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Awaiting Nurse' },
  accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Nurse Confirmed' },
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

// Statuses where payment is required
const PAYMENT_STATUSES = ['accepted', 'confirmed', 'in_progress', 'work_done', 'completed']

export default async function PatientBookingsPage({ searchParams }: Props) {
  const user = await requireRole('patient')
  const supabase = await createSupabaseServerClient()
  const serviceSupabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const filterStatus = params.status ?? ''
  const page         = Math.max(1, parseInt(params.page ?? '1'))
  const offset       = (page - 1) * PAGE_SIZE

  const { data: settings } = await serviceSupabase
    .from('platform_settings')
    .select('require_work_start_confirmation, require_work_completion_confirmation, payment_deadline_hours')
    .limit(1)
    .single()

  const requireWorkDone       = settings?.require_work_completion_confirmation ?? true
  const paymentDeadlineHours  = settings?.payment_deadline_hours ?? 24

  // Filtered + paginated query
  let query = supabase
    .from('booking_requests')
    .select('*', { count: 'exact' })
    .eq('patient_id', user.id)

  if (filterStatus) {
    if (filterStatus === 'accepted') {
      query = query.in('status', ['accepted', 'confirmed'])
    } else {
      query = query.eq('status', filterStatus)
    }
  }

  const { data: requests, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  // KPI counts — unfiltered
  const { data: allForCounts } = await supabase
    .from('booking_requests')
    .select('status, payment_status')
    .eq('patient_id', user.id)

  const allRows    = allForCounts ?? []
  const total      = allRows.length
  const active     = allRows.filter(b => b.status === 'accepted' || b.status === 'confirmed').length
  const pending    = allRows.filter(b => b.status === 'pending').length
  const unpaidCount = allRows.filter(b =>
    PAYMENT_STATUSES.includes(b.status) && (b as any).payment_status !== 'paid'
  ).length

  const allItems   = requests ?? []
  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function filterUrl(s: string) {
    const sp = new URLSearchParams()
    if (s) sp.set('status', s)
    return `/patient/bookings${sp.toString() ? '?' + sp.toString() : ''}`
  }

  function pageUrl(p: number) {
    const sp = new URLSearchParams()
    if (filterStatus) sp.set('status', filterStatus)
    sp.set('page', String(p))
    return `/patient/bookings?${sp.toString()}`
  }

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

      {/* KPI row */}
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
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: unpaidCount > 0 ? 'rgba(245,132,42,0.1)' : '#F0FFF4' }}>💳</div>
          <div className="dash-kpi-num" style={{ color: unpaidCount > 0 ? '#F5842A' : 'var(--ink)' }}>{unpaidCount}</div>
          <div className="dash-kpi-label">Payment Pending</div>
        </div>
      </div>

      {/* Payment alert with deadline context */}
      {unpaidCount > 0 && (
        <div style={{ background: 'rgba(245,132,42,0.06)', border: '1.5px solid rgba(245,132,42,0.3)', borderRadius: 10, padding: '12px 18px', fontSize: '0.85rem', color: '#b85e00', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.6 }}>
          ⏳ {unpaidCount} booking{unpaidCount > 1 ? 's' : ''} with pending payment.
          {paymentDeadlineHours > 0 && (
            <span style={{ fontWeight: 400 }}> Bookings are automatically cancelled if payment is not received within <strong>{paymentDeadlineHours} hour{paymentDeadlineHours !== 1 ? 's' : ''}</strong>.</span>
          )}
          <span> </span>
          <Link href="/patient/bookings?status=accepted" style={{ color: '#b85e00', fontWeight: 700, textDecoration: 'underline' }}>Pay now →</Link>
        </div>
      )}

      {total === 0 ? (
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
        <div className="dash-card" style={{ marginBottom: 0 }}>
          {/* Filter tabs */}
          <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
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

          {/* Results count */}
          <div style={{ padding: '0.6rem 1.2rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted)' }}>
            {totalCount} booking{totalCount !== 1 ? 's' : ''}
            {filterStatus ? ` · ${filterStatus}` : ''}
            {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
          </div>

          {allItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem', fontSize: '0.9rem' }}>
              No bookings in this category
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                    <Th>#</Th>
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
                  {allItems.map((b: any, i: number) => {
                    const s = statusStyle[b.status] ?? statusStyle.pending
                    const serial = offset + i + 1
                    const needsPayment = PAYMENT_STATUSES.includes(b.status) && b.payment_status !== 'paid'
                    const isPaid = b.payment_status === 'paid'
                    const showPayment = PAYMENT_STATUSES.includes(b.status)
                    const deadlineAt: string | null = b.payment_deadline_at ?? null
                    const isOverdue = deadlineAt && new Date(deadlineAt) < new Date()
                    const deadlineFmt = deadlineAt && !isPaid
                      ? new Date(deadlineAt).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
                      : null
                    const needsConfirm = b.status === 'work_done' && requireWorkDone

                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)', verticalAlign: 'top' }}>
                        <Td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)' }}>
                            {serial}
                          </span>
                        </Td>
                        <Td>
                          <div style={{ fontWeight: 700 }}>{b.service_type ?? 'Booking'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1 }}>
                            {b.booking_type === 'weekly' ? '🔁' : b.booking_type === 'monthly' ? '📆' : '📅'} {b.total_sessions ? `${b.total_sessions} session${b.total_sessions > 1 ? 's' : ''}` : '1 session'}
                          </div>
                        </Td>
                        <Td>
                          {b.nurse_name
                            ? <span style={{ color: '#0E7B8C', fontWeight: 600 }}>👩‍⚕️ {b.nurse_name}</span>
                            : <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>—</span>
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
                          {showPayment ? (
                            isPaid ? (
                              <span style={{ background: 'rgba(39,168,105,0.1)', color: '#27A869', fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50 }}>✅ Paid</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ background: isOverdue ? 'rgba(224,74,74,0.1)' : 'rgba(245,132,42,0.1)', color: isOverdue ? '#E04A4A' : '#F5842A', fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>
                                  {isOverdue ? '❌ Overdue' : '⚠️ Unpaid'}
                                </span>
                                {deadlineFmt && !isOverdue && (
                                  <span style={{ fontSize: '0.62rem', color: '#b85e00', fontWeight: 600 }}>
                                    ⏳ Pay by {deadlineFmt}
                                  </span>
                                )}
                                {!isOverdue && (
                                  <PayNowBtn
                                    requestId={b.id}
                                    amount={b.total_amount ?? (b.hourly_rate && b.duration_hours ? Math.round(b.hourly_rate * b.duration_hours * 1.15) : 0)}
                                    compact
                                  />
                                )}
                              </div>
                            )
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>—</span>
                          )}
                        </Td>
                        <Td>
                          <div>{b.created_at && new Date(b.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        </Td>
                        <Td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <Link href={`/patient/bookings/${b.id}`} style={{
                              padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                              background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem',
                              fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', textAlign: 'center',
                            }}>
                              View →
                            </Link>
                            {needsConfirm && (
                              <ConfirmCompletionBtn requestId={b.id} compact />
                            )}
                          </div>
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
                {page > 1 && <Link href={pageUrl(page - 1)} style={paginBtn(false)}>← Prev</Link>}
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                  <Link key={i + 1} href={pageUrl(i + 1)} style={paginBtn(i + 1 === page)}>{i + 1}</Link>
                ))}
                {page < totalPages && <Link href={pageUrl(page + 1)} style={paginBtn(false)}>Next →</Link>}
              </div>
            </div>
          )}
        </div>
      )}
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
