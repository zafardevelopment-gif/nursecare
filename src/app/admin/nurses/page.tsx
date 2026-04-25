import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import NurseFilters from './NurseFilters'
import NursesPagination from './NursesPagination'
import { Suspense } from 'react'

interface Props {
  searchParams: Promise<{
    q?: string
    status?: string
    city?: string
    spec?: string
    page?: string
    pageSize?: string
  }>
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pending:        { color: '#F5842A', bg: 'rgba(245,132,42,0.1)' },
  approved:       { color: '#27A869', bg: 'rgba(39,168,105,0.1)' },
  rejected:       { color: '#E04A4A', bg: 'rgba(224,74,74,0.1)'  },
  update_pending: { color: '#b85e00', bg: 'rgba(184,94,0,0.1)'   },
}

export default async function AdminNursesPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()
  const params   = await searchParams

  const q        = params.q?.trim()         ?? ''
  const status   = params.status            ?? ''
  const city     = params.city              ?? ''
  const spec     = params.spec              ?? ''
  const pageSize = Math.max(1, parseInt(params.pageSize ?? '10') || 10)
  const page     = Math.max(1, parseInt(params.page     ?? '1')  || 1)
  const from     = (page - 1) * pageSize
  const to       = from + pageSize - 1

  // Count query (no range) for pagination total
  let countQuery = supabase
    .from('nurses')
    .select('*', { count: 'exact', head: true })
  if (status) countQuery = countQuery.eq('status', status)
  if (city)   countQuery = countQuery.eq('city', city)
  if (spec)   countQuery = countQuery.eq('specialization', spec)
  if (q)      countQuery = countQuery.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%,license_no.ilike.%${q}%`)

  // Data query with range
  let query = supabase
    .from('nurses')
    .select('id, full_name, email, phone, city, specialization, experience_years, hourly_rate, daily_rate, status, license_no, created_at')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (city)   query = query.eq('city', city)
  if (spec)   query = query.eq('specialization', spec)
  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%,license_no.ilike.%${q}%`
    )
  }

  const [{ data: nurses }, { count: totalCount }] = await Promise.all([query, countQuery])
  const total = totalCount ?? 0

  // Unique specializations for filter dropdown
  const { data: allNurses } = await supabase
    .from('nurses')
    .select('specialization')
    .not('specialization', 'is', null)

  const specializations = [...new Set(
    (allNurses ?? []).map(n => n.specialization).filter(Boolean)
  )].sort() as string[]

  // Status counts — fetch all (not paged) for badge accuracy
  const { data: allForCounts } = await supabase
    .from('nurses')
    .select('status')
  const counts = (allForCounts ?? []).reduce<Record<string, number>>((acc, n) => {
    acc[n.status] = (acc[n.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Nurses</h1>
          <p className="dash-sub">{total} nurse{total !== 1 ? 's' : ''} found · page {page}</p>
        </div>
        <Link href="/admin/nurse-updates" style={{
          fontSize: '0.82rem', fontWeight: 600, color: '#b85e00',
          background: 'rgba(184,94,0,0.08)', border: '1px solid rgba(184,94,0,0.2)',
          padding: '7px 14px', borderRadius: '8px', textDecoration: 'none',
        }}>
          🔄 Profile Updates
        </Link>
      </div>

      {/* Status summary chips */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
        {Object.entries(STATUS_STYLE).map(([st, s]) => (
          <Link key={st} href={`/admin/nurses?status=${st}`} style={{
            fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '50px',
            background: s.bg, color: s.color, textDecoration: 'none', border: `1px solid ${s.color}22`,
          }}>
            {st.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} {counts[st] ? `(${counts[st]})` : ''}
          </Link>
        ))}
        {(status || city || spec || q) && (
          <Link href="/admin/nurses" style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: '50px', background: 'var(--cream)', color: 'var(--muted)', border: '1px solid var(--border)', textDecoration: 'none' }}>
            ✕ Clear filters
          </Link>
        )}
      </div>

      {/* Filters */}
      <Suspense>
        <NurseFilters specializations={specializations} />
      </Suspense>

      {/* Table */}
      <div className="dash-card">
        <div className="table-scroll-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--cream)' }}>
                {['Name', 'City', 'Specialization', 'Experience', 'Hourly', 'Daily', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!nurses || nurses.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic' }}>
                    No nurses found matching your filters.
                  </td>
                </tr>
              ) : nurses.map(nurse => {
                const s = STATUS_STYLE[nurse.status] ?? { color: 'var(--muted)', bg: 'var(--cream)' }
                return (
                  <tr key={nurse.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700 }}>{nurse.full_name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '2px' }}>{nurse.email}</div>
                      {nurse.phone && <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{nurse.phone}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{nurse.city ?? '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {nurse.specialization
                        ? <span style={{ background: 'rgba(14,123,140,0.08)', color: 'var(--teal)', fontSize: '0.74rem', fontWeight: 600, padding: '3px 8px', borderRadius: '50px', border: '1px solid rgba(14,123,140,0.15)' }}>{nurse.specialization}</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>
                      {nurse.experience_years != null ? `${nurse.experience_years} yrs` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      {nurse.hourly_rate ? `SAR ${nurse.hourly_rate}` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      {nurse.daily_rate ? `SAR ${nurse.daily_rate}` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: s.bg, color: s.color, fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: '50px', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                        {nurse.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link href={`/admin/nurses/${nurse.id}`} style={{
                        fontSize: '0.78rem', fontWeight: 700, color: 'var(--teal)',
                        background: 'rgba(14,123,140,0.07)', border: '1px solid rgba(14,123,140,0.2)',
                        padding: '5px 12px', borderRadius: '7px', textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Suspense>
          <NursesPagination total={total} pageSize={pageSize} currentPage={page} />
        </Suspense>
      </div>
    </div>
  )
}
