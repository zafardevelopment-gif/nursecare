import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 15

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pending:           { color: '#F5842A', bg: 'rgba(245,132,42,0.1)',  label: '⏳ Pending' },
  approved:          { color: '#27A869', bg: 'rgba(39,168,105,0.1)',  label: '✓ Approved' },
  rejected:          { color: '#E04A4A', bg: 'rgba(224,74,74,0.1)',   label: '✕ Rejected' },
  agreement_pending: { color: '#0E7B8C', bg: 'rgba(14,123,140,0.1)', label: '📄 Agr. Pending' },
  active:            { color: '#1A7A4A', bg: 'rgba(26,122,74,0.1)',   label: '✅ Active' },
}

const FILTER_TABS = [
  { key: '',                 label: 'All' },
  { key: 'pending',          label: '⏳ Pending' },
  { key: 'approved',         label: '✓ Approved' },
  { key: 'agreement_pending',label: '📄 Agr. Pending' },
  { key: 'active',           label: '✅ Active' },
  { key: 'rejected',         label: '✕ Rejected' },
]

interface Props {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>
}

export default async function AdminHospitalsPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const sp = await searchParams
  const statusFilter = sp.status ?? ''
  const page   = Math.max(1, parseInt(sp.page ?? '1'))
  const offset = (page - 1) * PAGE_SIZE
  const q      = sp.q?.trim() ?? ''

  // KPI counts
  const { data: allStatuses } = await supabase
    .from('hospitals')
    .select('status')

  const counts: Record<string, number> = { pending: 0, approved: 0, agreement_pending: 0, active: 0, rejected: 0 }
  for (const h of allStatuses ?? []) {
    if (h.status in counts) counts[h.status]++
  }

  // Main query
  let query = supabase
    .from('hospitals')
    .select('id, hospital_name, license_cr, contact_person, email, phone, city, status, created_at', { count: 'exact' })

  if (statusFilter) query = query.eq('status', statusFilter)
  if (q) query = query.or(`hospital_name.ilike.%${q}%,contact_person.ilike.%${q}%,email.ilike.%${q}%,city.ilike.%${q}%`)

  const { data: hospitals, count: total } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const totalPages = Math.ceil((total ?? 0) / PAGE_SIZE)

  function tabUrl(t: string) {
    const sp = new URLSearchParams()
    if (t) sp.set('status', t)
    if (q)  sp.set('q', q)
    return `/admin/hospitals${sp.toString() ? '?' + sp.toString() : ''}`
  }
  function pageUrl(p: number) {
    const sp = new URLSearchParams()
    if (statusFilter) sp.set('status', statusFilter)
    if (q) sp.set('q', q)
    sp.set('page', String(p))
    return `/admin/hospitals?${sp.toString()}`
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Hospitals</h1>
          <p className="dash-sub">Manage hospital registrations, approvals and agreements</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="dash-kpi-row">
        {[
          { key: 'pending',          label: 'Pending',     icon: '⏳', color: '#F5842A' },
          { key: 'approved',         label: 'Approved',    icon: '✓',  color: '#27A869' },
          { key: 'agreement_pending',label: 'Agr. Pending',icon: '📄', color: '#0E7B8C' },
          { key: 'active',           label: 'Active',      icon: '✅', color: '#1A7A4A' },
          { key: 'rejected',         label: 'Rejected',    icon: '✕',  color: '#E04A4A' },
        ].map(k => (
          <Link key={k.key} href={tabUrl(k.key)} style={{ textDecoration: 'none' }}>
            <div className="dash-kpi" style={{ cursor: 'pointer', borderTop: statusFilter === k.key ? `3px solid ${k.color}` : '3px solid transparent' }}>
              <div className="dash-kpi-icon">{k.icon}</div>
              <div className="dash-kpi-num" style={{ color: k.color }}>{counts[k.key] ?? 0}</div>
              <div className="dash-kpi-label">{k.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="dash-card">
        {/* Filter + Search bar */}
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {FILTER_TABS.map(tab => (
              <Link key={tab.key} href={tabUrl(tab.key)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                textDecoration: 'none',
                background: statusFilter === tab.key ? 'var(--teal)' : 'var(--cream)',
                color: statusFilter === tab.key ? '#fff' : 'var(--muted)',
                border: statusFilter === tab.key ? 'none' : '1px solid var(--border)',
              }}>
                {tab.label}
              </Link>
            ))}
          </div>
          <form method="GET" action="/admin/hospitals">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text" name="q" defaultValue={q}
                placeholder="Search hospitals…"
                style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem', width: 220, fontFamily: 'inherit', outline: 'none' }}
              />
              <button type="submit" style={{ padding: '7px 14px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Count */}
        <div style={{ padding: '0.5rem 1.2rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted)' }}>
          {total ?? 0} hospital{total !== 1 ? 's' : ''}{statusFilter ? ` · ${statusFilter}` : ''}
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
        </div>

        {/* Table */}
        {!(hospitals ?? []).length ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem', fontSize: '0.9rem' }}>No hospitals found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                  <Th>#</Th>
                  <Th>Hospital</Th>
                  <Th>Contact</Th>
                  <Th>City</Th>
                  <Th>Status</Th>
                  <Th>Registered</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {(hospitals ?? []).map((h, i) => {
                  const s = STATUS_STYLE[h.status] ?? STATUS_STYLE.pending
                  return (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)' }}>
                      <Td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'var(--cream)', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)' }}>
                          {offset + i + 1}
                        </span>
                      </Td>
                      <Td>
                        <div style={{ fontWeight: 700 }}>{h.hospital_name}</div>
                        {h.license_cr && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{h.license_cr}</div>}
                      </Td>
                      <Td>
                        <div>{h.contact_person}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{h.email}</div>
                      </Td>
                      <Td>{h.city ?? '—'}</Td>
                      <Td>
                        <span style={{ background: s.bg, color: s.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>
                          {s.label}
                        </span>
                      </Td>
                      <Td>
                        <div>{new Date(h.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </Td>
                      <Td>
                        <Link href={`/admin/hospitals/${h.id}`} style={{
                          padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                          background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem',
                          fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>
                          View →
                        </Link>
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
          <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total ?? 0)} of {total ?? 0}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {page > 1 && <Link href={pageUrl(page - 1)} style={pBtn(false)}>← Prev</Link>}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                <Link key={i + 1} href={pageUrl(i + 1)} style={pBtn(i + 1 === page)}>{i + 1}</Link>
              ))}
              {page < totalPages && <Link href={pageUrl(page + 1)} style={pBtn(false)}>Next →</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function pBtn(active: boolean): React.CSSProperties {
  return {
    padding: '5px 11px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none',
    background: active ? 'var(--teal)' : 'var(--cream)',
    color: active ? '#fff' : 'var(--muted)',
    border: active ? 'none' : '1px solid var(--border)',
  }
}
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, fontSize: '0.67rem', color: 'var(--muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '10px 12px', verticalAlign: 'middle', color: 'var(--ink)' }}>{children}</td>
}
