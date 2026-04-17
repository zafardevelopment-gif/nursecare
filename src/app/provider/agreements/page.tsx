import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: 'Awaiting Approval', color: '#b85e00', bg: '#FFF8F0' },
  admin_approved:    { label: 'Awaiting Your Sign', color: '#0E5C8C', bg: '#EEF6FD' },
  nurse_approved:    { label: 'You Approved',       color: '#0E7B8C', bg: '#E8F4FD' },
  hospital_approved: { label: 'Hospital Approved',  color: '#0E7B8C', bg: '#E8F4FD' },
  fully_approved:    { label: 'Fully Executed',      color: '#1A7A4A', bg: '#E8F9F0' },
  rejected:          { label: 'You Rejected',        color: '#C0392B', bg: '#FEF2F2' },
}

export default async function NurseAgreementsPage() {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { data: agreements } = nurse
    ? await supabase
        .from('agreements')
        .select('id, title, status, generated_at, hospital_id, template_version, nurse_approved_at, hospital_approved_at')
        .eq('nurse_id', nurse.id)
        .order('generated_at', { ascending: false })
    : { data: [] }

  const pendingCount = (agreements ?? []).filter(a => !a.nurse_approved_at && a.status !== 'rejected').length

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">My Agreements</h1>
          <p className="dash-sub">View and approve service agreements sent to you</p>
        </div>
        {pendingCount > 0 && (
          <div style={{ background: '#FFF8F0', border: '1px solid #F5842A44', color: '#b85e00', padding: '10px 16px', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700 }}>
            ⏳ {pendingCount} agreement{pendingCount > 1 ? 's' : ''} awaiting your approval
          </div>
        )}
      </div>

      <div className="dash-card">
        <div className="dash-card-body" style={{ padding: 0 }}>
          {!(agreements ?? []).length ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
              No agreements have been sent to you yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Title', 'Status', 'Your Approval', 'Hospital Approval', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(agreements ?? []).map(a => {
                  const s = STATUS_LABELS[a.status] ?? STATUS_LABELS.pending
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600 }}>{a.title}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700 }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {a.nurse_approved_at
                          ? <span style={{ color: '#27A869', fontSize: '0.78rem', fontWeight: 700 }}>✓ {new Date(a.nurse_approved_at).toLocaleDateString()}</span>
                          : <span style={{ color: '#F5842A', fontSize: '0.78rem', fontWeight: 600 }}>⏳ Pending</span>
                        }
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {a.hospital_approved_at
                          ? <span style={{ color: '#27A869', fontSize: '0.78rem', fontWeight: 700 }}>✓ {new Date(a.hospital_approved_at).toLocaleDateString()}</span>
                          : <span style={{ color: '#F5842A', fontSize: '0.78rem', fontWeight: 600 }}>⏳ Pending</span>
                        }
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--muted)' }}>
                        {new Date(a.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/provider/agreements/${a.id}`} style={{
                          background: (a.nurse_approved_at || a.status === 'rejected') ? 'var(--cream)' : '#0E7B8C',
                          color: (a.nurse_approved_at || a.status === 'rejected') ? 'var(--ink)' : '#fff',
                          border: (a.nurse_approved_at || a.status === 'rejected') ? '1px solid var(--border)' : 'none',
                          padding: '6px 14px', borderRadius: 7, fontSize: '0.78rem',
                          fontWeight: 700, textDecoration: 'none',
                        }}>
                          {a.status === 'rejected' ? 'View' : a.nurse_approved_at ? 'View' : 'Review & Approve →'}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
