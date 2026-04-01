'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { generateIdCard, revokeIdCard } from '../id-cards/actions'

type IdCard = {
  id: string
  unique_id_code: string
  issue_date: string
  expiry_date: string
  status: string
  created_at: string
}

type Props = {
  nurseId: string
  nurseName: string
  nurseSpecialization: string | null
  nurseCity: string | null
  photoUrl: string | null
  idCard: IdCard | null
}

function getCardState(card: IdCard | null): 'none' | 'active' | 'expired' | 'revoked' {
  if (!card) return 'none'
  if (card.status === 'revoked') return 'revoked'
  if (new Date(card.expiry_date) < new Date()) return 'expired'
  return 'active'
}

// Default expiry: 1 year from today
function defaultExpiry() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

export default function IdCardSection({ nurseId, nurseName, idCard }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState(false)
  const [showGenForm, setShowGenForm] = useState(false)

  const cardState = getCardState(idCard)

  const stateConfig = {
    none:    { color: 'var(--muted)',  bg: 'var(--cream)',  label: 'No ID Card' },
    active:  { color: '#27A869',       bg: '#E8F9F0',       label: 'Active' },
    expired: { color: '#E04A4A',       bg: '#FEE8E8',       label: 'Expired' },
    revoked: { color: '#E04A4A',       bg: '#FEE8E8',       label: 'Revoked' },
  }
  const sc = stateConfig[cardState]

  function flash(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await generateIdCard(fd)
      if (res?.error) { flash('error', res.error); return }
      flash('success', `ID Card generated: ${res.card?.unique_id_code}`)
      setShowGenForm(false)
    })
  }

  function handleRevoke() {
    if (!idCard) return
    const fd = new FormData()
    fd.set('id', idCard.id)
    startTransition(async () => {
      const res = await revokeIdCard(fd)
      if (res?.error) { flash('error', res.error); return }
      flash('success', 'ID Card revoked')
      setRevokeConfirm(false)
    })
  }

  return (
    <div className="dash-card">
      <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="dash-card-title">Nurse ID Card</span>
        {idCard && (
          <span style={{ background: sc.bg, color: sc.color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>
            {sc.label}
          </span>
        )}
      </div>
      <div className="dash-card-body">
        {msg && (
          <div style={{ background: msg.type === 'success' ? '#E8F9F0' : '#FEE8E8', color: msg.type === 'success' ? '#1A7A4A' : '#C0392B', padding: '8px 12px', borderRadius: 7, marginBottom: 12, fontSize: '0.82rem', fontWeight: 600 }}>
            {msg.text}
          </div>
        )}

        {!idCard || cardState === 'revoked' ? (
          /* No card or revoked — show generate form */
          <div>
            <p style={{ fontSize: '0.83rem', color: 'var(--muted)', marginBottom: 12 }}>
              {cardState === 'revoked' ? 'Previous card was revoked. Generate a new one.' : 'No ID card issued yet. Generate one for this approved nurse.'}
            </p>
            {showGenForm ? (
              <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <input type="hidden" name="nurse_id" value={nurseId} />
                <div>
                  <div style={labelStyle}>Expiry Date</div>
                  <input type="date" name="expiry_date" defaultValue={defaultExpiry()} required style={inputStyle} />
                </div>
                <button type="submit" disabled={isPending} style={btnTeal}>
                  {isPending ? 'Generating…' : '🪪 Generate ID Card'}
                </button>
                <button type="button" onClick={() => setShowGenForm(false)} style={btnSecondary}>Cancel</button>
              </form>
            ) : (
              <button onClick={() => setShowGenForm(true)} style={btnTeal}>🪪 Generate ID Card</button>
            )}
          </div>
        ) : (
          /* Has card */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.7rem', marginBottom: '1rem' }}>
              {[
                { label: 'ID Code',    value: idCard.unique_id_code },
                { label: 'Issued',     value: new Date(idCard.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Expires',    value: new Date(idCard.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Status',     value: sc.label },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={`/api/id-cards/${idCard.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...btnTeal, textDecoration: 'none', display: 'inline-block' }}
              >
                🖨 View / Print
              </a>
              <button onClick={() => setShowGenForm(v => !v)} style={btnSecondary}>
                🔄 Regenerate
              </button>
              {revokeConfirm ? (
                <>
                  <button onClick={handleRevoke} disabled={isPending} style={{ ...btnSecondary, color: '#E04A4A', borderColor: '#E04A4A' }}>
                    {isPending ? 'Revoking…' : 'Confirm Revoke?'}
                  </button>
                  <button onClick={() => setRevokeConfirm(false)} style={btnSecondary}>Cancel</button>
                </>
              ) : (
                <button onClick={() => setRevokeConfirm(true)} style={{ ...btnSecondary, color: '#E04A4A', borderColor: 'rgba(224,74,74,0.3)' }}>
                  Revoke
                </button>
              )}
            </div>

            {showGenForm && (
              <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <input type="hidden" name="nurse_id" value={nurseId} />
                <div>
                  <div style={labelStyle}>New Expiry Date</div>
                  <input type="date" name="expiry_date" defaultValue={defaultExpiry()} required style={inputStyle} />
                </div>
                <button type="submit" disabled={isPending} style={btnTeal}>
                  {isPending ? 'Generating…' : '🪪 Generate New Card'}
                </button>
                <button type="button" onClick={() => setShowGenForm(false)} style={btnSecondary}>Cancel</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted)',
  marginBottom: '3px', textTransform: 'uppercase',
}
const inputStyle: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)',
  fontSize: '0.83rem', fontFamily: 'inherit', background: 'var(--input-bg)', color: 'var(--ink)',
}
const btnTeal: React.CSSProperties = {
  background: '#0E7B8C', color: '#fff', border: 'none',
  padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem',
  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
const btnSecondary: React.CSSProperties = {
  background: 'var(--cream)', color: 'var(--ink)',
  border: '1px solid var(--border)', padding: '7px 14px',
  borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
}
