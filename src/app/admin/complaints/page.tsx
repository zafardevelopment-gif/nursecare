import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { getDisputeComplaintSettings } from '@/lib/platform-settings'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:     { label: '🔴 Open',     color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
  resolved: { label: '✅ Resolved', color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
  rejected: { label: '❌ Rejected', color: '#8A9BAA', bg: 'rgba(138,155,170,0.08)' },
}

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  patient:  { label: 'Patient',  color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)' },
  provider: { label: 'Nurse',    color: '#6B3FA0', bg: 'rgba(107,63,160,0.08)' },
  hospital: { label: 'Hospital', color: '#b85e00', bg: 'rgba(181,94,0,0.08)'   },
}

const TYPE_LABELS: Record<string, string> = {
  no_show:             '🚫 No Show',
  late_arrival:        '⏰ Late Arrival',
  misbehavior:         '😤 Misbehavior',
  service_quality:     '⚠️ Service Quality',
  payment_issue:       '💸 Payment Issue',
  wrong_cancellation:  '❌ Wrong Cancellation',
  safety_issue:        '🚨 Safety Issue',
  other:               '📝 Other',
}

interface Props {
  searchParams: Promise<{ status?: string; expired?: string }>
}

export default async function AdminComplaintsPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams
  const filter      = params.status ?? ''
  const onlyExpired = params.expired === '1'

  // Fetch settings for window + enabled state
  const settings = await getDisputeComplaintSettings()

  let query = supabase
    .from('complaints')
    .select('id, reporter_name, reporter_role, complaint_type, description, status, booking_id, created_at, expires_at, is_expired')
    .order('created_at', { ascending: false })

  if (filter && !onlyExpired) query = query.eq('status', filter)
  if (onlyExpired) query = query.eq('is_expired', true)

  const { data: complaints } = await query
  const all = complaints ?? []

  // Compute expiry client-side as well (for rows where is_expired not yet backfilled)
  const nowMs = Date.now()
  const withExpiry = all.map(c => {
    const expired = c.is_expired || (c.expires_at ? nowMs > new Date(c.expires_at).getTime() : false)
    return { ...c, computedExpired: expired }
  })

  const filtered = onlyExpired
    ? withExpiry.filter(c => c.computedExpired && c.status === 'open')
    : withExpiry

  const openCount     = withExpiry.filter(c => c.status === 'open').length
  const resolvedCount = withExpiry.filter(c => c.status === 'resolved').length
  const rejectedCount = withExpiry.filter(c => c.status === 'rejected').length
  const expiredCount  = withExpiry.filter(c => c.computedExpired && c.status === 'open').length

  function filterUrl(s: string, expired = false) {
    const q = new URLSearchParams()
    if (s) q.set('status', s)
    if (expired) q.set('expired', '1')
    return `/admin/complaints${q.toString() ? '?' + q.toString() : ''}`
  }

  const activeFilter = onlyExpired ? 'expired' : filter

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Complaints</h1>
          <p className="dash-sub">Review and resolve user complaints</p>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
          📣 Complaint window: <strong>{settings.complaint_window_hours >= 24 ? `${Math.round(settings.complaint_window_hours / 24)} days` : `${settings.complaint_window_hours}h`}</strong> after completion
          {!settings.complaints_enabled && (
            <span style={{ marginLeft: 8, color: '#E04A4A', fontWeight: 700 }}>🔒 Complaints DISABLED</span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: '📋', label: 'Total',    value: all.length,     color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)' },
          { icon: '🔴', label: 'Open',     value: openCount,      color: '#E04A4A', bg: 'rgba(224,74,74,0.08)'  },
          { icon: '✅', label: 'Resolved', value: resolvedCount,  color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
          { icon: '❌', label: 'Rejected', value: rejectedCount,  color: '#8A9BAA', bg: 'rgba(138,155,170,0.08)' },
          { icon: '⏰', label: 'Expired',  value: expiredCount,   color: '#b85e00', bg: 'rgba(181,94,0,0.08)'   },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ padding: '1rem', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Disabled banner */}
      {!settings.complaints_enabled && (
        <div style={{ background: 'rgba(224,74,74,0.05)', border: '1.5px solid rgba(224,74,74,0.25)', borderRadius: 10, padding: '12px 18px', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#E04A4A', fontWeight: 700 }}>
          🔒 Complaints are currently <strong>disabled</strong> for all users. New complaints cannot be submitted. Go to{' '}
          <Link href="/admin/settings" style={{ color: '#E04A4A', textDecoration: 'underline' }}>Settings → Disputes</Link> to re-enable.
        </div>
      )}

      {/* Expired banner */}
      {expiredCount > 0 && !onlyExpired && (
        <div style={{ background: 'rgba(181,94,0,0.05)', border: '1px solid rgba(181,94,0,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.85rem', color: '#b85e00', fontWeight: 700 }}>
            ⏰ {expiredCount} open complaint{expiredCount !== 1 ? 's have' : ' has'} passed the submission window — users can no longer edit them
          </div>
          <Link href={filterUrl('', true)} style={{ fontSize: '0.78rem', color: '#b85e00', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            View expired →
          </Link>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: '',         label: 'All',           expired: false },
          { key: 'open',     label: '🔴 Open',       expired: false },
          { key: 'resolved', label: '✅ Resolved',   expired: false },
          { key: 'rejected', label: '❌ Rejected',   expired: false },
          { key: '',         label: '⏰ Expired',    expired: true  },
        ].map((tab, i) => {
          const isActive = tab.expired ? activeFilter === 'expired' : activeFilter === tab.key
          return (
            <Link key={i} href={filterUrl(tab.key, tab.expired)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
              textDecoration: 'none',
              background: isActive ? 'var(--teal)' : 'var(--card)',
              color:      isActive ? '#fff'        : 'var(--muted)',
              border:     isActive ? 'none'        : '1px solid var(--border)',
            }}>{tab.label}</Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="dash-card">
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>📣 Complaint Cases</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{filtered.length} {onlyExpired ? 'expired' : filter || 'total'}</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📣</div>
            <div style={{ fontWeight: 700 }}>No complaints found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Reporter', 'Type', 'Description', 'Status', 'Date', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const sm = STATUS_META[c.status] ?? STATUS_META.open
                  const rm = ROLE_META[c.reporter_role] ?? ROLE_META.patient
                  const isOpen = c.status === 'open'
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: isOpen ? 'rgba(224,74,74,0.015)' : i % 2 === 0 ? 'transparent' : 'rgba(14,123,140,0.01)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--shell-bg)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 800, color: 'var(--muted)' }}>{i + 1}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{c.reporter_name || '—'}</div>
                        <span style={{ background: rm.bg, color: rm.color, padding: '2px 7px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>{rm.label}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {TYPE_LABELS[c.complaint_type] ?? c.complaint_type}
                        {c.computedExpired && isOpen && (
                          <div style={{ fontSize: '0.62rem', color: '#b85e00', fontWeight: 600, marginTop: 2 }}>⏰ Window expired</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink)', maxWidth: 220 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.description}>{c.description}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: sm.bg, color: sm.color, padding: '4px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{sm.label}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link href={`/admin/complaints/${c.id}`} style={{
                          padding: '5px 12px', borderRadius: 7,
                          border: isOpen ? 'none' : '1px solid var(--border)',
                          background: isOpen ? '#E04A4A' : 'var(--shell-bg)',
                          color: isOpen ? '#fff' : 'var(--teal)',
                          fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>
                          {isOpen ? 'Review →' : 'View →'}
                        </Link>
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
