import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { getDisputeComplaintSettings } from '@/lib/platform-settings'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/* ── Disputes meta ───────────────────────────────────────────────── */
const DISPUTE_TYPE_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  provider_no_show: { icon: '🚨', label: 'Provider No-Show',  color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
  patient_absent:   { icon: '🚪', label: 'Patient Absent',    color: '#b85e00', bg: 'rgba(181,94,0,0.08)'  },
  access_denied:    { icon: '🔒', label: 'Access Denied',     color: '#7B2FBE', bg: 'rgba(123,47,190,0.08)' },
  quality_issue:    { icon: '⚠️', label: 'Quality Issue',     color: '#b85e00', bg: 'rgba(181,94,0,0.08)'  },
  other:            { icon: '📝', label: 'Other',             color: '#8A9BAA', bg: 'rgba(138,155,170,0.08)' },
}

const DISPUTE_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:         { label: '🔴 Open',         color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
  under_review: { label: '🔵 Under Review', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  resolved:     { label: '✅ Resolved',     color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)'  },
  expired:      { label: '⏰ Expired',      color: '#8A9BAA', bg: 'rgba(138,155,170,0.08)' },
}

/* ── Complaints meta ─────────────────────────────────────────────── */
const C_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:     { label: '🔴 Open',     color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
  resolved: { label: '✅ Resolved', color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
  rejected: { label: '❌ Rejected', color: '#8A9BAA', bg: 'rgba(138,155,170,0.08)' },
}
const C_ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  patient:  { label: 'Patient',  color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)' },
  provider: { label: 'Nurse',    color: '#6B3FA0', bg: 'rgba(107,63,160,0.08)' },
  hospital: { label: 'Hospital', color: '#b85e00', bg: 'rgba(181,94,0,0.08)'   },
}
const TYPE_LABELS: Record<string, string> = {
  no_show:            '🚫 No Show',
  late_arrival:       '⏰ Late Arrival',
  misbehavior:        '😤 Misbehavior',
  service_quality:    '⚠️ Service Quality',
  payment_issue:      '💸 Payment Issue',
  wrong_cancellation: '❌ Wrong Cancellation',
  safety_issue:       '🚨 Safety Issue',
  other:              '📝 Other',
}

/* ── Tab bar styles ─────────────────────────────────────────────── */
function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '9px 22px', borderRadius: 10, fontWeight: 700,
    fontSize: '0.85rem', textDecoration: 'none', cursor: 'pointer',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--teal)' : 'var(--card)',
    color: active ? '#fff' : 'var(--muted)',
    boxShadow: active ? '0 2px 10px rgba(14,123,140,0.2)' : 'none',
  }
}

function filterPillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
    textDecoration: 'none',
    background: active ? 'var(--teal)' : 'var(--card)',
    color: active ? '#fff' : 'var(--muted)',
    border: active ? 'none' : '1px solid var(--border)',
  }
}

interface Props {
  searchParams: Promise<{ tab?: string; status?: string; expired?: string }>
}

export default async function AdminIssuesPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const activeTab   = params.tab === 'complaints' ? 'complaints' : 'disputes'
  const filterStatus = params.status ?? ''
  const onlyExpired  = params.expired === '1'

  const settings = await getDisputeComplaintSettings()

  /* ── Fetch disputes ─────────────────────────────────────────────── */
  let dQuery = supabase
    .from('booking_requests')
    .select('id, patient_name, patient_phone, nurse_name, service_type, start_date, status, completed_at, dispute_type, dispute_reason, dispute_raised_by, dispute_raised_at, dispute_status, dispute_resolution, dispute_resolved_at')
    .not('dispute_type', 'is', null)
    .order('dispute_raised_at', { ascending: false })
  if (activeTab === 'disputes' && filterStatus && !onlyExpired)
    dQuery = dQuery.eq('dispute_status', filterStatus)
  const { data: disputesRaw } = await dQuery
  const allDisputes = disputesRaw ?? []

  const windowMs = settings.dispute_window_hours * 60 * 60 * 1000
  const nowMs    = Date.now()
  const disputes = allDisputes.map(d => ({
    ...d,
    isExpired: d.completed_at ? nowMs > new Date(d.completed_at).getTime() + windowMs : false,
  }))
  const filteredDisputes = onlyExpired && activeTab === 'disputes'
    ? disputes.filter(d => d.isExpired && d.dispute_status !== 'resolved')
    : disputes
  const dOpen     = disputes.filter(d => d.dispute_status === 'open').length
  const dReview   = disputes.filter(d => d.dispute_status === 'under_review').length
  const dResolved = disputes.filter(d => d.dispute_status === 'resolved').length
  const dExpired  = disputes.filter(d => d.isExpired && d.dispute_status !== 'resolved').length

  /* ── Fetch complaints ───────────────────────────────────────────── */
  let cQuery = supabase
    .from('complaints')
    .select('id, reporter_name, reporter_role, complaint_type, description, status, booking_id, created_at, expires_at, is_expired')
    .order('created_at', { ascending: false })
  if (activeTab === 'complaints' && filterStatus && !onlyExpired) cQuery = cQuery.eq('status', filterStatus)
  if (activeTab === 'complaints' && onlyExpired) cQuery = cQuery.eq('is_expired', true)
  const { data: complaintsRaw } = await cQuery
  const allComplaints = complaintsRaw ?? []
  const complaints = allComplaints.map(c => ({
    ...c,
    computedExpired: c.is_expired || (c.expires_at ? nowMs > new Date(c.expires_at).getTime() : false),
  }))
  const filteredComplaints = onlyExpired && activeTab === 'complaints'
    ? complaints.filter(c => c.computedExpired && c.status === 'open')
    : complaints
  const cOpen     = complaints.filter(c => c.status === 'open').length
  const cResolved = complaints.filter(c => c.status === 'resolved').length
  const cRejected = complaints.filter(c => c.status === 'rejected').length
  const cExpired  = complaints.filter(c => c.computedExpired && c.status === 'open').length

  /* ── URL helpers ────────────────────────────────────────────────── */
  function tabUrl(tab: string) {
    return `/admin/issues?tab=${tab}`
  }
  function filterUrl(s: string, expired = false) {
    const q = new URLSearchParams({ tab: activeTab })
    if (s) q.set('status', s)
    if (expired) q.set('expired', '1')
    return `/admin/issues?${q.toString()}`
  }
  const activeFilter = onlyExpired ? 'expired' : filterStatus

  return (
    <div className="dash-shell">

      {/* Page header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Issues</h1>
          <p className="dash-sub">Manage disputes and complaints across all bookings</p>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', textAlign: 'right' }}>
          {activeTab === 'disputes'
            ? <>⚖️ Dispute window: <strong>{settings.dispute_window_hours}h</strong> after completion</>
            : <>📣 Complaint window: <strong>{settings.complaint_window_hours >= 24 ? `${Math.round(settings.complaint_window_hours / 24)} days` : `${settings.complaint_window_hours}h`}</strong> after completion</>
          }
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <Link href={tabUrl('disputes')}   style={tabStyle(activeTab === 'disputes')}>⚖️ Disputes</Link>
        <Link href={tabUrl('complaints')} style={tabStyle(activeTab === 'complaints')}>📣 Complaints</Link>
      </div>

      {/* ══ DISPUTES TAB ══ */}
      {activeTab === 'disputes' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { icon: '📋', label: 'Total',       value: disputes.length, color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)' },
              { icon: '🔴', label: 'Open',         value: dOpen,           color: '#E04A4A', bg: 'rgba(224,74,74,0.08)'  },
              { icon: '🔵', label: 'Under Review', value: dReview,         color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
              { icon: '✅', label: 'Resolved',     value: dResolved,       color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)'  },
              { icon: '⏰', label: 'Expired',      value: dExpired,        color: '#8A9BAA', bg: 'rgba(138,155,170,0.08)' },
            ].map(k => (
              <div key={k.label} className="dash-card" style={{ padding: '1rem', borderTop: `3px solid ${k.color}` }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{k.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '1.5rem', color: k.color }}>{k.value}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {!settings.disputes_enabled && (
            <div style={{ background: 'rgba(224,74,74,0.05)', border: '1.5px solid rgba(224,74,74,0.25)', borderRadius: 10, padding: '12px 18px', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#E04A4A', fontWeight: 700 }}>
              🔒 Disputes are currently <strong>disabled</strong>. Go to{' '}
              <Link href="/admin/settings" style={{ color: '#E04A4A', textDecoration: 'underline' }}>Settings → Disputes</Link> to re-enable.
            </div>
          )}

          {dExpired > 0 && !onlyExpired && (
            <div style={{ background: 'rgba(138,155,170,0.08)', border: '1px solid rgba(138,155,170,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.85rem', color: '#8A9BAA', fontWeight: 700 }}>
                ⏰ {dExpired} dispute{dExpired !== 1 ? 's have' : ' has'} exceeded the {settings.dispute_window_hours}h window
              </div>
              <Link href={filterUrl('', true)} style={{ fontSize: '0.78rem', color: '#8A9BAA', fontWeight: 700, textDecoration: 'none' }}>View expired →</Link>
            </div>
          )}

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { key: '',             label: 'All',             expired: false },
              { key: 'open',         label: '🔴 Open',         expired: false },
              { key: 'under_review', label: '🔵 Under Review', expired: false },
              { key: 'resolved',     label: '✅ Resolved',     expired: false },
              { key: '',             label: '⏰ Expired',      expired: true  },
            ].map((f, i) => {
              const active = f.expired ? activeFilter === 'expired' : activeFilter === f.key
              return <Link key={i} href={filterUrl(f.key, f.expired)} style={filterPillStyle(active)}>{f.label}</Link>
            })}
          </div>

          {/* Table */}
          <div className="dash-card">
            <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>⚖️ Dispute Cases</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{filteredDisputes.length} {onlyExpired ? 'expired' : filterStatus || 'total'}</span>
            </div>
            {filteredDisputes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700 }}>No disputes found</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)' }}>
                      {['#', 'Issue Type', 'Patient', 'Provider', 'Service / Date', 'Reported', 'Status', 'Action'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDisputes.map((d, i) => {
                      const dtm = DISPUTE_TYPE_META[d.dispute_type ?? 'other'] ?? DISPUTE_TYPE_META.other
                      const dsm = d.isExpired && d.dispute_status !== 'resolved'
                        ? DISPUTE_STATUS_META.expired
                        : (DISPUTE_STATUS_META[d.dispute_status ?? 'open'] ?? DISPUTE_STATUS_META.open)
                      const isOpen = d.dispute_status === 'open'
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', background: isOpen ? 'rgba(224,74,74,0.015)' : i % 2 === 0 ? 'var(--card)' : 'rgba(14,123,140,0.01)' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--shell-bg)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 800, color: 'var(--muted)' }}>{i + 1}</span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ background: dtm.bg, color: dtm.color, padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{dtm.icon} {dtm.label}</span>
                            {d.isExpired && d.dispute_status !== 'resolved' && (
                              <div style={{ fontSize: '0.62rem', color: '#8A9BAA', marginTop: 3, fontWeight: 600 }}>⏰ Window expired</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{d.patient_name ?? '—'}</div>
                            {d.patient_phone && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{d.patient_phone}</div>}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>{d.nurse_name ?? '—'}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600 }}>{d.service_type ?? '—'}</div>
                            {d.start_date && <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{new Date(d.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                            {d.dispute_raised_at ? new Date(d.dispute_raised_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ background: dsm.bg, color: dsm.color, padding: '4px 10px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{dsm.label}</span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <Link href={`/admin/disputes/${d.id}`} style={{ padding: '5px 12px', borderRadius: 7, border: isOpen ? 'none' : '1px solid var(--border)', background: isOpen ? '#E04A4A' : 'var(--shell-bg)', color: isOpen ? '#fff' : 'var(--teal)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
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
        </>
      )}

      {/* ══ COMPLAINTS TAB ══ */}
      {activeTab === 'complaints' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { icon: '📋', label: 'Total',    value: complaints.length, color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)' },
              { icon: '🔴', label: 'Open',     value: cOpen,             color: '#E04A4A', bg: 'rgba(224,74,74,0.08)'  },
              { icon: '✅', label: 'Resolved', value: cResolved,         color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)'  },
              { icon: '❌', label: 'Rejected', value: cRejected,         color: '#8A9BAA', bg: 'rgba(138,155,170,0.08)' },
              { icon: '⏰', label: 'Expired',  value: cExpired,          color: '#b85e00', bg: 'rgba(181,94,0,0.08)'   },
            ].map(k => (
              <div key={k.label} className="dash-card" style={{ padding: '1rem', borderTop: `3px solid ${k.color}` }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{k.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '1.5rem', color: k.color }}>{k.value}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {!settings.complaints_enabled && (
            <div style={{ background: 'rgba(224,74,74,0.05)', border: '1.5px solid rgba(224,74,74,0.25)', borderRadius: 10, padding: '12px 18px', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#E04A4A', fontWeight: 700 }}>
              🔒 Complaints are currently <strong>disabled</strong>. Go to{' '}
              <Link href="/admin/settings" style={{ color: '#E04A4A', textDecoration: 'underline' }}>Settings → Disputes</Link> to re-enable.
            </div>
          )}

          {cExpired > 0 && !onlyExpired && (
            <div style={{ background: 'rgba(181,94,0,0.05)', border: '1px solid rgba(181,94,0,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.85rem', color: '#b85e00', fontWeight: 700 }}>
                ⏰ {cExpired} open complaint{cExpired !== 1 ? 's have' : ' has'} passed the submission window
              </div>
              <Link href={filterUrl('', true)} style={{ fontSize: '0.78rem', color: '#b85e00', fontWeight: 700, textDecoration: 'none' }}>View expired →</Link>
            </div>
          )}

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { key: '',         label: 'All',         expired: false },
              { key: 'open',     label: '🔴 Open',     expired: false },
              { key: 'resolved', label: '✅ Resolved', expired: false },
              { key: 'rejected', label: '❌ Rejected', expired: false },
              { key: '',         label: '⏰ Expired',  expired: true  },
            ].map((f, i) => {
              const active = f.expired ? activeFilter === 'expired' : activeFilter === f.key
              return <Link key={i} href={filterUrl(f.key, f.expired)} style={filterPillStyle(active)}>{f.label}</Link>
            })}
          </div>

          {/* Table */}
          <div className="dash-card">
            <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>📣 Complaint Cases</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{filteredComplaints.length} {onlyExpired ? 'expired' : filterStatus || 'total'}</span>
            </div>
            {filteredComplaints.length === 0 ? (
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
                    {filteredComplaints.map((c, i) => {
                      const sm   = C_STATUS_META[c.status] ?? C_STATUS_META.open
                      const rm   = C_ROLE_META[c.reporter_role] ?? C_ROLE_META.patient
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
                            <Link href={`/admin/complaints/${c.id}`} style={{ padding: '5px 12px', borderRadius: 7, border: isOpen ? 'none' : '1px solid var(--border)', background: isOpen ? '#E04A4A' : 'var(--shell-bg)', color: isOpen ? '#fff' : 'var(--teal)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
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
        </>
      )}
    </div>
  )
}
