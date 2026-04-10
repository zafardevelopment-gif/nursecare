import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
}

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminDisputesPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params = await searchParams
  const filterStatus = params.status ?? ''

  // Fetch all booking_requests that have a dispute
  let query = supabase
    .from('booking_requests')
    .select('id, patient_name, patient_phone, nurse_name, service_type, start_date, status, dispute_type, dispute_reason, dispute_raised_by, dispute_raised_at, dispute_status, dispute_resolution, dispute_resolved_at')
    .not('dispute_type', 'is', null)
    .order('dispute_raised_at', { ascending: false })

  if (filterStatus) {
    query = query.eq('dispute_status', filterStatus)
  }

  const { data: disputes } = await query

  const all      = disputes ?? []
  const openCount    = all.filter(d => d.dispute_status === 'open').length
  const reviewCount  = all.filter(d => d.dispute_status === 'under_review').length
  const resolvedCount = all.filter(d => d.dispute_status === 'resolved').length

  function filterUrl(s: string) {
    return s ? `/admin/disputes?status=${s}` : '/admin/disputes'
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Disputes &amp; Issues</h1>
          <p className="dash-sub">No-shows, absent patients, and on-site issues reported by nurses or patients</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: '📋', label: 'Total',        value: all.length,     color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)' },
          { icon: '🔴', label: 'Open',          value: openCount,      color: '#E04A4A', bg: 'rgba(224,74,74,0.08)'  },
          { icon: '🔵', label: 'Under Review',  value: reviewCount,    color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
          { icon: '✅', label: 'Resolved',      value: resolvedCount,  color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)'  },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ padding: '1rem', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: '',           label: 'All' },
          { key: 'open',       label: '🔴 Open' },
          { key: 'under_review', label: '🔵 Under Review' },
          { key: 'resolved',   label: '✅ Resolved' },
        ].map(tab => (
          <Link key={tab.key} href={filterUrl(tab.key)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
            textDecoration: 'none',
            background: filterStatus === tab.key ? 'var(--teal)' : 'var(--card)',
            color: filterStatus === tab.key ? '#fff' : 'var(--muted)',
            border: filterStatus === tab.key ? 'none' : '1px solid var(--border)',
          }}>{tab.label}</Link>
        ))}
      </div>

      {/* Disputes table */}
      <div className="dash-card">
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>⚠️ Dispute Cases</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{all.length} total</span>
        </div>

        {all.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No disputes found</div>
            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>All bookings are running smoothly</div>
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
                {all.map((d, i) => {
                  const dtm = DISPUTE_TYPE_META[d.dispute_type ?? 'other'] ?? DISPUTE_TYPE_META.other
                  const dsm = DISPUTE_STATUS_META[d.dispute_status ?? 'open'] ?? DISPUTE_STATUS_META.open
                  const isOpen = d.dispute_status === 'open'
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', background: isOpen ? 'rgba(224,74,74,0.015)' : i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.01)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'var(--shell-bg)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 800, color: 'var(--muted)' }}>{i + 1}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: dtm.bg, color: dtm.color, padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {dtm.icon} {dtm.label}
                        </span>
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
                        <Link href={`/admin/disputes/${d.id}`} style={{
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
