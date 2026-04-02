'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { deleteAgreement } from './actions'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: 'Pending',          color: '#b85e00', bg: '#FFF8F0' },
  admin_approved:    { label: 'Awaiting Nurse',    color: '#0E5C8C', bg: '#EEF6FD' },
  nurse_approved:    { label: 'Nurse Approved',    color: '#0E7B8C', bg: '#E8F4FD' },
  hospital_approved: { label: 'Hospital Approved', color: '#0E7B8C', bg: '#E8F4FD' },
  fully_approved:    { label: 'Fully Executed',    color: '#1A7A4A', bg: '#E8F9F0' },
}

type Agreement = {
  id: string
  title: string
  status: string
  generated_at: string
  nurse_id: string | null
  hospital_id: string | null
  template_version: number
  nurseName: string
  partyName: string  // admin or hospital name
}

const PAGE_SIZE = 10

export default function AgreementsClient({
  agreements,
  search: initSearch,
  statusFilter: initStatus,
}: {
  agreements: Agreement[]
  search: string
  statusFilter: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(1)

  // Client-side search filter
  const [search, setSearch] = useState(initSearch)
  const [statusFilter, setStatusFilter] = useState(initStatus)

  const filtered = agreements.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      a.title.toLowerCase().includes(q) ||
      a.nurseName.toLowerCase().includes(q) ||
      a.partyName.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q)
    const matchStatus = !statusFilter || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleSearchChange(val: string) {
    setSearch(val)
    setPage(1)
  }

  function handleStatusChange(val: string) {
    setStatusFilter(val)
    setPage(1)
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deleteAgreement(fd)
      setDeleteConfirm(null)
    })
  }

  const inp: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--input-bg)', color: 'var(--ink)', fontSize: '0.83rem',
    fontFamily: 'inherit',
  }

  return (
    <div className="dash-card">
      {/* Search + Filter bar */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inp, flex: 1, minWidth: 200 }}
          placeholder="Search by title, nurse, or ID…"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
        />
        <select style={inp} value={statusFilter} onChange={e => handleStatusChange(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ padding: 0 }}>
        {paginated.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
            {search || statusFilter ? 'No agreements match your search.' : 'No agreements yet. Generate your first one above.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Title', 'Nurse', 'Party', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(a => {
                const s = STATUS_LABELS[a.status] ?? STATUS_LABELS.pending
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600 }}>
                      {a.title}
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 400 }}>
                        v{a.template_version} · {a.id.substring(0,8).toUpperCase()}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.83rem' }}>{a.nurseName || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.83rem' }}>{a.partyName || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700 }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {new Date(a.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link href={`/admin/agreements/${a.id}`} style={{
                          background: 'var(--cream)', color: 'var(--ink)',
                          border: '1px solid var(--border)', padding: '5px 12px',
                          borderRadius: 7, fontSize: '0.78rem', fontWeight: 600,
                          textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>View →</Link>
                        {deleteConfirm === a.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(a.id)}
                              disabled={isPending}
                              style={{ background: '#e53e3e', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              {isPending ? '…' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              style={{ background: 'var(--cream)', color: 'var(--muted)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 7, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(a.id)}
                            style={{ background: 'none', color: '#e53e3e', border: '1px solid #e53e3e44', padding: '5px 10px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Page {currentPage} of {totalPages} · {filtered.length} total
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--ink)', fontSize: '0.8rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontFamily: 'inherit' }}
            >← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i-1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) => p === '...' ? (
                <span key={`ellipsis-${i}`} style={{ padding: '6px 4px', color: 'var(--muted)', fontSize: '0.8rem' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: currentPage === p ? '#0E7B8C' : 'var(--cream)', color: currentPage === p ? '#fff' : 'var(--ink)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: currentPage === p ? 700 : 400, fontFamily: 'inherit' }}
                >{p}</button>
              ))
            }
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--ink)', fontSize: '0.8rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, fontFamily: 'inherit' }}
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
