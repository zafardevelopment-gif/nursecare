'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { revokeIdCard, renewIdCard } from './actions'

type Card = {
  id: string
  unique_id_code: string
  issue_date: string
  expiry_date: string
  status: string
  effective_status: string
  is_expired: boolean
  created_at: string
  nurses: { id: string; full_name: string; email: string; specialization: string | null; city: string | null } | null
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  active:  { color: '#27A869', bg: '#E8F9F0' },
  expired: { color: '#E04A4A', bg: '#FEE8E8' },
  revoked: { color: '#9AABB8', bg: 'var(--cream)' },
}

export default function IdCardsClient({ cards }: { cards: Card[] }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [renewExpiry, setRenewExpiry] = useState('')
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null)

  function flash(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const filtered = cards.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.nurses?.full_name?.toLowerCase().includes(q) || c.unique_id_code.toLowerCase().includes(q) || c.nurses?.email?.toLowerCase().includes(q)
    const matchStatus = !filterStatus || c.effective_status === filterStatus
    return matchSearch && matchStatus
  })

  function handleRevoke(id: string) {
    const fd = new FormData(); fd.set('id', id)
    startTransition(async () => {
      const res = await revokeIdCard(fd)
      if (res?.error) flash('error', res.error)
      else { flash('success', 'Card revoked'); setRevokeConfirm(null) }
    })
  }

  function handleRenew(id: string) {
    if (!renewExpiry) return
    const fd = new FormData(); fd.set('id', id); fd.set('expiry_date', renewExpiry)
    startTransition(async () => {
      const res = await renewIdCard(fd)
      if (res?.error) flash('error', res.error)
      else { flash('success', 'Card renewed'); setRenewingId(null); setRenewExpiry('') }
    })
  }

  return (
    <div className="dash-card">
      {/* Filters */}
      <div className="dash-card-header" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or ID code…"
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', fontFamily: 'inherit', background: 'var(--input-bg)', color: 'var(--ink)' }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', fontFamily: 'inherit', background: 'var(--input-bg)', color: 'var(--ink)' }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{filtered.length} cards</span>
      </div>

      {msg && (
        <div style={{ margin: '0 1.2rem', background: msg.type === 'success' ? '#E8F9F0' : '#FEE8E8', color: msg.type === 'success' ? '#1A7A4A' : '#C0392B', padding: '8px 14px', borderRadius: 8, fontSize: '0.83rem', fontWeight: 600, marginBottom: 8 }}>
          {msg.text}
        </div>
      )}

      <div className="dash-card-body" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>No ID cards found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Nurse', 'ID Code', 'Issued', 'Expires', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const ss = STATUS_STYLE[c.effective_status] ?? STATUS_STYLE.revoked
                const nurse = c.nurses
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{nurse?.full_name ?? '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{nurse?.specialization ?? nurse?.email ?? ''}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: 'var(--teal)' }}>
                      {c.unique_id_code}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {new Date(c.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: c.effective_status === 'expired' ? '#E04A4A' : 'var(--muted)', fontWeight: c.effective_status === 'expired' ? 700 : 400 }}>
                      {new Date(c.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: ss.bg, color: ss.color, padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        {c.effective_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <a href={`/api/id-cards/${c.id}/print`} target="_blank" rel="noopener noreferrer" style={{ background: '#0E7B8C', color: '#fff', padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>
                          🖨 Print
                        </a>
                        {nurse && (
                          <Link href={`/admin/nurses/${nurse.id}`} style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                            Profile
                          </Link>
                        )}
                        {c.effective_status !== 'revoked' && (
                          <>
                            {/* Renew */}
                            {renewingId === c.id ? (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <input type="date" value={renewExpiry} onChange={e => setRenewExpiry(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.78rem' }} />
                                <button onClick={() => handleRenew(c.id)} disabled={isPending || !renewExpiry} style={{ background: '#27A869', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                  Save
                                </button>
                                <button onClick={() => setRenewingId(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem' }}>✕</button>
                              </div>
                            ) : (
                              <button onClick={() => { setRenewingId(c.id); setRenewExpiry(c.expiry_date) }} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '5px 10px', borderRadius: 7, fontSize: '0.75rem', cursor: 'pointer' }}>
                                Renew
                              </button>
                            )}
                            {/* Revoke */}
                            {revokeConfirm === c.id ? (
                              <>
                                <button onClick={() => handleRevoke(c.id)} disabled={isPending} style={{ background: '#E04A4A', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                  {isPending ? '…' : 'Confirm?'}
                                </button>
                                <button onClick={() => setRevokeConfirm(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem' }}>✕</button>
                              </>
                            ) : (
                              <button onClick={() => setRevokeConfirm(c.id)} style={{ background: 'none', border: '1px solid rgba(224,74,74,0.3)', color: '#E04A4A', padding: '5px 10px', borderRadius: 7, fontSize: '0.75rem', cursor: 'pointer' }}>
                                Revoke
                              </button>
                            )}
                          </>
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
    </div>
  )
}
