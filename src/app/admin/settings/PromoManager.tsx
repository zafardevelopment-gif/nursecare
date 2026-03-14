'use client'

import { useState, useTransition } from 'react'
import { createPromoCode, disablePromoCode, enablePromoCode, updatePromoCode } from './actions'

interface Promo {
  id: string
  code: string
  discount_type: string
  discount_value: number
  max_uses: number | null
  used_count: number
  status: string
  expires_at: string | null
  created_at: string
}

export default function PromoManager({ promos }: { promos: Promo[] }) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [, startTransition]         = useTransition()

  const statusStyle: Record<string, { color: string; bg: string }> = {
    active:   { color: '#27A869', bg: 'rgba(39,168,105,0.1)'  },
    expired:  { color: '#b85e00', bg: 'rgba(184,94,0,0.1)'    },
    disabled: { color: '#E04A4A', bg: 'rgba(224,74,74,0.1)'   },
  }

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Promo Code Manager</span>
        <button
          onClick={() => { setShowCreate(v => !v); setEditingId(null) }}
          style={{
            background: showCreate ? 'var(--cream)' : 'var(--teal)',
            color: showCreate ? 'var(--muted)' : '#fff',
            border: showCreate ? '1px solid var(--border)' : 'none',
            padding: '6px 14px', borderRadius: '8px',
            fontSize: '0.8rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {showCreate ? '✕ Cancel' : '+ Create Code'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', background: 'rgba(14,123,140,0.03)' }}>
          <CreatePromoForm onDone={() => setShowCreate(false)} />
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--cream)' }}>
              {['Code', 'Value', 'Used', 'Status', ''].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                  No promo codes yet
                </td>
              </tr>
            ) : promos.map(promo => (
              <>
                <tr key={promo.id} style={{ borderBottom: editingId === promo.id ? 'none' : '1px solid var(--border)' }}>
                  <td style={td}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.88rem' }}>{promo.code}</span>
                    {promo.expires_at && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '1px' }}>
                        Expires {new Date(promo.expires_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    {promo.discount_type === 'percent'
                      ? `${promo.discount_value}% off`
                      : `SAR ${promo.discount_value} off`}
                  </td>
                  <td style={td}>
                    {promo.used_count}{promo.max_uses ? `/${promo.max_uses}` : ''}
                  </td>
                  <td style={td}>
                    <span style={{
                      ...statusStyle[promo.status],
                      fontSize: '0.72rem', fontWeight: 700,
                      padding: '3px 9px', borderRadius: '50px',
                      textTransform: 'capitalize',
                    }}>
                      {promo.status}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        onClick={() => setEditingId(editingId === promo.id ? null : promo.id)}
                        style={actionBtn('teal')}
                      >
                        Edit
                      </button>
                      {promo.status === 'active' ? (
                        <form onSubmit={e => { e.preventDefault(); startTransition(async () => { await disablePromoCode(new FormData(e.currentTarget)) }) }}>
                          <input type="hidden" name="id" value={promo.id} />
                          <button type="submit" style={actionBtn('red')}>Disable</button>
                        </form>
                      ) : promo.status === 'disabled' ? (
                        <form onSubmit={e => { e.preventDefault(); startTransition(async () => { await enablePromoCode(new FormData(e.currentTarget)) }) }}>
                          <input type="hidden" name="id" value={promo.id} />
                          <button type="submit" style={actionBtn('green')}>Enable</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>

                {/* Inline edit row */}
                {editingId === promo.id && (
                  <tr key={`${promo.id}-edit`} style={{ borderBottom: '1px solid var(--border)', background: 'rgba(14,123,140,0.03)' }}>
                    <td colSpan={5} style={{ padding: '0.8rem 1rem' }}>
                      <EditPromoForm promo={promo} onDone={() => setEditingId(null)} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreatePromoForm({ onDone }: { onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const [type, setType] = useState<'percent' | 'fixed'>('percent')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await createPromoCode(fd)
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--teal)', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        New Promo Code
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <div>
          <label style={labelStyle}>Code</label>
          <input type="text" name="code" required placeholder="WELCOME20" style={formInput} />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select name="discount_type" value={type} onChange={e => setType(e.target.value as any)} style={formInput}>
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed (SAR)</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>{type === 'percent' ? 'Discount (%)' : 'Discount (SAR)'}</label>
          <input type="number" name="discount_value" required min="0" step="0.01" placeholder={type === 'percent' ? '20' : '50'} style={formInput} />
        </div>
        <div>
          <label style={labelStyle}>Max Uses</label>
          <input type="number" name="max_uses" min="1" placeholder="unlimited" style={formInput} />
        </div>
        <div>
          <label style={labelStyle}>Expires At</label>
          <input type="date" name="expires_at" style={formInput} />
        </div>
      </div>
      <button type="submit" disabled={pending} style={{ background: 'var(--teal)', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: pending ? 0.7 : 1 }}>
        {pending ? 'Creating…' : 'Create Code'}
      </button>
    </form>
  )
}

function EditPromoForm({ promo, onDone }: { promo: Promo; onDone: () => void }) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await updatePromoCode(fd)
      onDone()
    })
  }

  const expiresValue = promo.expires_at
    ? new Date(promo.expires_at).toISOString().split('T')[0]
    : ''

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={promo.id} />
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={labelStyle}>Discount Value</label>
          <input type="number" name="discount_value" defaultValue={promo.discount_value} min="0" step="0.01" style={{ ...formInput, width: '100px' }} />
        </div>
        <div>
          <label style={labelStyle}>Max Uses</label>
          <input type="number" name="max_uses" defaultValue={promo.max_uses ?? ''} min="1" placeholder="unlimited" style={{ ...formInput, width: '100px' }} />
        </div>
        <div>
          <label style={labelStyle}>Expires At</label>
          <input type="date" name="expires_at" defaultValue={expiresValue} style={{ ...formInput, width: '130px' }} />
        </div>
        <button type="submit" disabled={pending} style={{ background: 'var(--teal)', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: '1px' }}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onDone} style={{ background: 'var(--cream)', color: 'var(--muted)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: '8px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '1px' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ── Styles ──────────────────────────────────────────────────────── */
const th: React.CSSProperties = {
  padding: '9px 12px', textAlign: 'left', fontWeight: 700,
  fontSize: '0.7rem', textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--muted)',
}
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.68rem', fontWeight: 700,
  color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '0.04em', marginBottom: '3px',
}
const formInput: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: '7px',
  border: '1px solid var(--border)', fontSize: '0.82rem',
  fontFamily: 'inherit', background: 'var(--cream)',
}

function actionBtn(variant: 'teal' | 'red' | 'green'): React.CSSProperties {
  const map = {
    teal:  { bg: 'rgba(14,123,140,0.08)',  color: 'var(--teal)', border: 'rgba(14,123,140,0.2)'  },
    red:   { bg: 'rgba(224,74,74,0.08)',   color: '#E04A4A',     border: 'rgba(224,74,74,0.2)'   },
    green: { bg: 'rgba(39,168,105,0.08)',  color: '#27A869',     border: 'rgba(39,168,105,0.2)'  },
  }
  const v = map[variant]
  return {
    background: v.bg, color: v.color, border: `1px solid ${v.border}`,
    padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem',
    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}
