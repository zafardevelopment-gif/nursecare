'use client'

import { useState, useMemo } from 'react'
import { approveUpdateRequest, rejectUpdateRequest } from './actions'
import Link from 'next/link'

const FIELD_LABELS: Record<string, string> = {
  hourly_rate:      'Hourly Rate (SAR)',
  daily_rate:       'Daily Rate (SAR)',
  specialization:   'Specialization',
  experience_years: 'Years of Experience',
  license_no:       'License Number',
}

const PAGE_SIZE_OPTIONS = [5, 10, 20]

type UpdateRequest = {
  id: string
  status: string
  created_at: string
  reviewed_at?: string | null
  changed_fields: string[]
  old_values: Record<string, any>
  new_values: Record<string, any>
  nurses: { full_name: string; email: string; city: string; status: string } | null
}

type PendingNurse = {
  id: string
  full_name: string
  email: string
  city: string | null
  specialization: string | null
  created_at: string
  status: string
}

export default function UpdateRequestsClient({
  requests,
  pendingNurses,
}: {
  requests: UpdateRequest[]
  pendingNurses: PendingNurse[]
}) {
  const pending  = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  // Search + pagination for resolved
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const filteredResolved = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return resolved
    return resolved.filter(r =>
      (r.nurses?.full_name ?? '').toLowerCase().includes(q) ||
      (r.nurses?.email ?? '').toLowerCase().includes(q) ||
      (r.nurses?.city ?? '').toLowerCase().includes(q)
    )
  }, [resolved, search])

  const totalPages = Math.max(1, Math.ceil(filteredResolved.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedResolved = filteredResolved.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <>
      {/* ── Pending Nurse Approvals ── */}
      {pendingNurses.length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">Pending Nurse Approvals</span>
            <span style={{ background: 'rgba(245,132,42,0.1)', color: '#b85e00', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>
              {pendingNurses.length} pending
            </span>
          </div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {pendingNurses.map((nurse, i) => (
              <div key={nurse.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                padding: '0.9rem 1.5rem',
                borderBottom: i < pendingNurses.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? '#fff' : 'var(--cream)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{nurse.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
                    {nurse.email} · {nurse.city ?? '—'}
                    {nurse.specialization && <> · {nurse.specialization}</>}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>
                    Applied: {new Date(nurse.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <Link href={`/admin/nurses/${nurse.id}`} style={{
                  background: '#27A869', color: '#fff', textDecoration: 'none',
                  padding: '7px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pending Profile Update Requests ── */}
      <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
        <div className="dash-card-header">
          <span className="dash-card-title">Pending Profile Updates ({pending.length})</span>
        </div>
        <div className="dash-card-body" style={{ padding: 0 }}>
          {pending.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              No pending update requests
            </div>
          ) : pending.map(req => (
            <UpdateRequestRow key={req.id} req={req} showActions />
          ))}
        </div>
      </div>

      {/* ── Resolved with Search + Pagination ── */}
      {resolved.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.8rem' }}>
            <span className="dash-card-title">Resolved ({resolved.length})</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search by nurse name, email, city..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                style={{
                  flex: '1 1 220px', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', fontSize: '0.85rem',
                  background: '#fff', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--muted)' }}>
                Show
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.82rem', background: '#fff' }}
                >
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                per page · {filteredResolved.length} result{filteredResolved.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {pagedResolved.map(req => (
              <UpdateRequestRow key={req.id} req={req} />
            ))}
            {pagedResolved.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                No results found.
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '1rem', flexWrap: 'wrap' }}>
              <PBtn disabled={currentPage === 1} onClick={() => setPage(1)}>«</PBtn>
              <PBtn disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>‹</PBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...'
                    ? <span key={`d${i}`} style={{ padding: '6px 4px', color: '#9CA3AF' }}>…</span>
                    : <PBtn key={p} active={p === currentPage} onClick={() => setPage(p as number)}>{p}</PBtn>
                )}
              <PBtn disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}>›</PBtn>
              <PBtn disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}>»</PBtn>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function UpdateRequestRow({ req, showActions }: { req: UpdateRequest; showActions?: boolean }) {
  const nurse = req.nurses
  const changedFields = req.changed_fields ?? []
  const oldVals = req.old_values ?? {}
  const newVals = req.new_values ?? {}

  const statusColor: Record<string, string> = { pending: '#F5842A', approved: '#27A869', rejected: '#E04A4A' }
  const statusBg:    Record<string, string> = { pending: 'rgba(245,132,42,0.1)', approved: 'rgba(39,168,105,0.1)', rejected: 'rgba(224,74,74,0.1)' }

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '1.2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{nurse?.full_name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{nurse?.email} · {nurse?.city}</div>
        <span style={{ background: statusBg[req.status], color: statusColor[req.status], fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '50px', textTransform: 'capitalize', marginLeft: 'auto' }}>
          {req.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem', marginBottom: '0.9rem' }}>
        {changedFields.map(field => (
          <div key={field} style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.78rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--muted)', marginBottom: '0.3rem', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              {FIELD_LABELS[field] ?? field}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ color: '#E04A4A', textDecoration: 'line-through' }}>{oldVals[field] ?? '—'}</span>
              <span style={{ color: 'var(--muted)' }}>→</span>
              <span style={{ color: '#27A869', fontWeight: 700 }}>{newVals[field] ?? '—'}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '0.73rem', color: 'var(--muted)', marginBottom: showActions ? '0.75rem' : 0 }}>
        Requested: {new Date(req.created_at).toLocaleString()}
        {req.reviewed_at && ` · Reviewed: ${new Date(req.reviewed_at).toLocaleString()}`}
      </div>

      {showActions && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <form action={approveUpdateRequest}>
            <input type="hidden" name="requestId" value={req.id} />
            <button type="submit" style={{ background: '#27A869', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✓ Approve Update
            </button>
          </form>
          <form action={rejectUpdateRequest}>
            <input type="hidden" name="requestId" value={req.id} />
            <button type="submit" style={{ background: 'rgba(224,74,74,0.1)', color: '#E04A4A', border: '1px solid rgba(224,74,74,0.25)', padding: '7px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✕ Reject
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function PBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 32, height: 32,
      border: `1px solid ${active ? '#0E7B8C' : 'var(--border)'}`,
      background: active ? '#0E7B8C' : '#fff',
      color: active ? '#fff' : disabled ? '#D1D5DB' : 'var(--ink)',
      borderRadius: 6, fontSize: '0.82rem',
      fontWeight: active ? 700 : 400,
      cursor: disabled ? 'default' : 'pointer',
    }}>
      {children}
    </button>
  )
}
