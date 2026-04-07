import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:             { label: 'Draft',             color: '#64748B', bg: '#F1F5F9' },
  admin_approved:    { label: 'Awaiting Your Review', color: '#b85e00', bg: '#FFF8F0' },
  sent:              { label: 'Awaiting Your Review', color: '#b85e00', bg: '#FFF8F0' },
  hospital_accepted: { label: 'Accepted',           color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
  hospital_rejected: { label: 'Rejected',           color: '#E04A4A', bg: 'rgba(224,74,74,0.06)' },
  active:            { label: 'Active',             color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
  expired:           { label: 'Expired',            color: '#64748B', bg: '#F1F5F9' },
}

export default async function HospitalAgreementsPage() {
  const user    = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  // Get hospital record
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, hospital_name, status')
    .eq('user_id', user.id)
    .single()

  const { data: agreements } = hospital
    ? await supabase
        .from('hospital_agreements')
        .select('id, ref_number, status, payment_type, start_date, end_date, created_at')
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const pendingCount = (agreements ?? []).filter(a => a.status === 'sent').length

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Service Agreements</h1>
          <p className="dash-sub">Review and manage your NurseCare+ service agreements</p>
        </div>
        {pendingCount > 0 && (
          <div style={{ background: '#FFF8F0', border: '1px solid #F5842A44', color: '#b85e00', padding: '10px 16px', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700 }}>
            📨 {pendingCount} agreement{pendingCount > 1 ? 's' : ''} awaiting your review
          </div>
        )}
      </div>

      {!hospital && (
        <div style={{ background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.2)', borderRadius: 10, padding: '20px 24px', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--teal)', marginBottom: 6 }}>Complete Your Registration</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>You need to register your hospital before agreements can be created.</div>
          <Link href="/hospital/onboarding" style={{ background: 'var(--teal)', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: '0.83rem', fontWeight: 700, textDecoration: 'none' }}>
            Register Hospital →
          </Link>
        </div>
      )}

      <div className="dash-card">
        <div className="dash-card-body" style={{ padding: 0 }}>
          {!(agreements ?? []).length ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.88rem' }}>
              No agreements have been sent to you yet. Once an agreement is drafted by NurseCare+ admin, it will appear here.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Reference', 'Payment Type', 'Validity', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(agreements ?? []).map(a => {
                  const meta = STATUS_META[a.status] ?? STATUS_META.draft
                  const payLabels: Record<string, string> = { advance: 'Advance', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }
                  const needsAction = a.status === 'sent'
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)' }}>{a.ref_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 500 }}>
                        {payLabels[a.payment_type] ?? a.payment_type}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--muted)' }}>
                        {new Date(a.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' → '}
                        {new Date(a.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: meta.bg, color: meta.color, padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700 }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link
                          href={`/hospital/agreements/${a.id}`}
                          style={{
                            background:    needsAction ? '#0E7B8C' : 'var(--cream)',
                            color:         needsAction ? '#fff' : 'var(--ink)',
                            border:        needsAction ? 'none' : '1px solid var(--border)',
                            padding:       '6px 14px',
                            borderRadius:  7,
                            fontSize:      '0.78rem',
                            fontWeight:    700,
                            textDecoration: 'none',
                            whiteSpace:    'nowrap',
                          }}
                        >
                          {needsAction ? 'Review & Sign →' : 'View'}
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
