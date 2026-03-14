import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
  accepted:  { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Accepted' },
  declined:  { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
  completed: { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
  cancelled: { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Cancelled' },
}

export default async function AdminBookingsPage() {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })

  const counts = {
    total:     bookings?.length ?? 0,
    pending:   bookings?.filter(b => b.status === 'pending').length   ?? 0,
    accepted:  bookings?.filter(b => b.status === 'accepted').length  ?? 0,
    declined:  bookings?.filter(b => b.status === 'declined').length  ?? 0,
    completed: bookings?.filter(b => b.status === 'completed').length ?? 0,
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">All Bookings</h1>
          <p className="dash-sub">Platform-wide booking overview</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="dash-kpi-row">
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#EBF5FF' }}>📋</div>
          <div className="dash-kpi-num">{counts.total}</div>
          <div className="dash-kpi-label">Total Bookings</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>⏳</div>
          <div className="dash-kpi-num">{counts.pending}</div>
          <div className="dash-kpi-label">Pending</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{counts.accepted}</div>
          <div className="dash-kpi-label">Accepted</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FEE8E8' }}>✕</div>
          <div className="dash-kpi-num">{counts.declined}</div>
          <div className="dash-kpi-label">Declined</div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">All Bookings ({counts.total})</span>
        </div>

        {!bookings?.length ? (
          <div className="dash-card-body" style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
            No bookings yet
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)' }}>
                  {['Patient', 'Service', 'Condition', 'Date', 'Shift', 'City', 'Nurse', 'Status', 'Created'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const s = statusStyle[b.status] ?? statusStyle.pending
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{b.patient_name}</td>
                      <td style={{ padding: '10px 14px' }}>{b.service_type}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.patient_condition}</td>
                      <td style={{ padding: '10px 14px' }}>{b.date}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{b.shift}</td>
                      <td style={{ padding: '10px 14px' }}>{b.city}</td>
                      <td style={{ padding: '10px 14px', color: b.nurse_name ? '#0E7B8C' : 'var(--muted)' }}>
                        {b.nurse_name ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          background: s.bg,
                          color: s.color,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 50,
                          whiteSpace: 'nowrap',
                        }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(b.created_at).toLocaleDateString('en-SA')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
