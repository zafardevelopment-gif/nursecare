'use client'

import { useState, useMemo, useTransition } from 'react'
import { resetUserPassword, toggleUserActive } from './actions'

type User = {
  id: string
  email: string
  full_name: string | null
  role: string
  phone: string | null
  city: string | null
  is_active: boolean
  created_at: string
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin:    { bg: '#FEE8E8', color: '#C0392B' },
  provider: { bg: '#E8F4FD', color: '#0E7B8C' },
  patient:  { bg: '#E8F9F0', color: '#1A7A4A' },
  hospital: { bg: '#F3E8FD', color: '#7C3AED' },
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

export default function UsersClient({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState<User[]>(initial)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      const matchSearch =
        !q ||
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? '').toLowerCase().includes(q) ||
        (u.phone ?? '').includes(q) ||
        (u.city ?? '').toLowerCase().includes(q)
      const matchRole = roleFilter === 'all' || u.role === roleFilter
      return matchSearch && matchRole
    })
  }, [users, search, roleFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function handleSearchChange(val: string) {
    setSearch(val)
    setPage(1)
  }

  function handleRoleChange(val: string) {
    setRoleFilter(val)
    setPage(1)
  }

  function handlePageSizeChange(val: number) {
    setPageSize(val)
    setPage(1)
  }

  function openReset(u: User) {
    setResetTarget(u)
    setNewPassword('')
    setResetMsg(null)
  }

  function closeReset() {
    setResetTarget(null)
    setNewPassword('')
    setResetMsg(null)
  }

  function handleResetSubmit() {
    if (!resetTarget) return
    startTransition(async () => {
      const res = await resetUserPassword(resetTarget.id, newPassword)
      if (res.error) {
        setResetMsg({ type: 'error', text: res.error })
      } else {
        setResetMsg({ type: 'success', text: 'Password updated successfully!' })
        setTimeout(closeReset, 1500)
      }
    })
  }

  function handleToggleActive(u: User) {
    startTransition(async () => {
      const res = await toggleUserActive(u.id, !u.is_active)
      if (!res.error) {
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x))
      }
    })
  }

  return (
    <>
      {/* Filters row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name, email, phone, city..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          style={{
            flex: '1 1 260px',
            padding: '9px 14px',
            borderRadius: 9,
            border: '1px solid var(--border)',
            fontSize: '0.88rem',
            background: '#fff',
            outline: 'none',
          }}
        />
        <select
          value={roleFilter}
          onChange={e => handleRoleChange(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="provider">Provider (Nurse)</option>
          <option value="patient">Patient</option>
          <option value="hospital">Hospital</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--muted)' }}>
          Show
          <select
            value={pageSize}
            onChange={e => handlePageSizeChange(Number(e.target.value))}
            style={{ ...selectStyle, width: 70 }}
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          per page
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', marginLeft: 'auto' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
              <th style={th}>#</th>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Phone</th>
              <th style={th}>City</th>
              <th style={th}>Status</th>
              <th style={th}>Joined</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((u, i) => {
              const roleStyle = ROLE_COLORS[u.role] ?? { bg: '#F3F4F6', color: '#374151' }
              const rowNum = (currentPage - 1) * pageSize + i + 1
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--cream)' }}>
                  <td style={{ ...td, color: '#9CA3AF', width: 40 }}>{rowNum}</td>
                  <td style={td}>
                    <span style={{ fontWeight: 600 }}>{u.full_name || '—'}</span>
                  </td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>
                    <span style={{
                      background: roleStyle.bg,
                      color: roleStyle.color,
                      padding: '3px 10px',
                      borderRadius: 50,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={td}>{u.phone || '—'}</td>
                  <td style={td}>{u.city || '—'}</td>
                  <td style={td}>
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={isPending}
                      style={{
                        background: u.is_active ? '#E8F9F0' : '#F3F4F6',
                        color: u.is_active ? '#1A7A4A' : '#6B7280',
                        border: 'none',
                        padding: '3px 10px',
                        borderRadius: 50,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Click to toggle active status"
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ ...td, color: '#6B7280', whiteSpace: 'nowrap' }}>
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => openReset(u)}
                      style={{
                        background: 'var(--cream)',
                        border: '1px solid var(--border)',
                        color: 'var(--ink)',
                        padding: '5px 12px',
                        borderRadius: 7,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🔑 Reset Password
                    </button>
                  </td>
                </tr>
              )
            })}
            {paged.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...td, textAlign: 'center', color: '#6B7280', padding: '2.5rem' }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <PaginationBtn disabled={currentPage === 1} onClick={() => setPage(1)}>«</PaginationBtn>
          <PaginationBtn disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>‹</PaginationBtn>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '...'
                ? <span key={`dots-${i}`} style={{ padding: '6px 4px', color: '#9CA3AF' }}>…</span>
                : <PaginationBtn key={p} active={p === currentPage} onClick={() => setPage(p as number)}>{p}</PaginationBtn>
            )}
          <PaginationBtn disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}>›</PaginationBtn>
          <PaginationBtn disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}>»</PaginationBtn>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '2rem', width: '100%', maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ margin: '0 0 0.3rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>
              Reset Password
            </h2>
            <p style={{ margin: '0 0 1.2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              {resetTarget.full_name || resetTarget.email}
            </p>

            {resetMsg && (
              <div style={{
                background: resetMsg.type === 'success' ? '#E8F9F0' : '#FEE8E8',
                color: resetMsg.type === 'success' ? '#1A7A4A' : '#C0392B',
                padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: '0.85rem',
              }}>
                {resetMsg.text}
              </div>
            )}

            <input
              type="password"
              placeholder="New password (min. 6 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResetSubmit()}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 9,
                border: '1px solid var(--border)', fontSize: '0.9rem',
                boxSizing: 'border-box', marginBottom: '1rem', outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeReset} style={btnSecondary}>Cancel</button>
              <button
                onClick={handleResetSubmit}
                disabled={isPending || newPassword.length < 6}
                style={{ ...btnPrimary, opacity: (isPending || newPassword.length < 6) ? 0.6 : 1 }}
              >
                {isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PaginationBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34, height: 34,
        border: `1px solid ${active ? '#0E7B8C' : 'var(--border)'}`,
        background: active ? '#0E7B8C' : '#fff',
        color: active ? '#fff' : disabled ? '#D1D5DB' : 'var(--ink)',
        borderRadius: 7,
        fontSize: '0.85rem',
        fontWeight: active ? 700 : 400,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

const th: React.CSSProperties = {
  padding: '11px 14px',
  textAlign: 'left',
  fontWeight: 700,
  color: 'var(--muted)',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '11px 14px',
  color: 'var(--ink)',
  verticalAlign: 'middle',
}

const selectStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 9,
  border: '1px solid var(--border)',
  fontSize: '0.85rem',
  background: '#fff',
  outline: 'none',
  cursor: 'pointer',
}

const btnPrimary: React.CSSProperties = {
  background: '#0E7B8C',
  color: '#fff',
  border: 'none',
  padding: '9px 20px',
  borderRadius: 9,
  fontWeight: 700,
  fontSize: '0.88rem',
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  background: 'var(--cream)',
  color: 'var(--ink)',
  border: '1px solid var(--border)',
  padding: '9px 20px',
  borderRadius: 9,
  fontWeight: 600,
  fontSize: '0.88rem',
  cursor: 'pointer',
}
