'use client'

import { useTransition, useState } from 'react'
import { saveProfessionCommission } from './actions'

interface Profession {
  id: string
  profession: string
  commission_percent: number
}

export default function CommissionForm({ professions }: { professions: Profession[] }) {
  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Commission by Profession</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--cream)' }}>
              <th style={th}>Profession</th>
              <th style={th}>Commission</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {professions.map(p => (
              <ProfessionRow key={p.id} profession={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProfessionRow({ profession }: { profession: Profession }) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await saveProfessionCommission(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={td}>{profession.profession}</td>
      <td style={td}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="hidden" name="id" value={profession.id} />
          <input
            type="number"
            name="commission_percent"
            defaultValue={profession.commission_percent}
            min="0"
            max="100"
            step="0.5"
            style={{
              width: '80px', padding: '6px 10px',
              borderRadius: '8px', border: '1px solid var(--border)',
              fontSize: '0.85rem', fontFamily: 'inherit',
              background: 'var(--cream)', textAlign: 'center',
            }}
          />
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>%</span>
          <button
            type="submit"
            disabled={pending}
            style={{
              background: saved ? 'rgba(39,168,105,0.1)' : 'rgba(14,123,140,0.08)',
              color: saved ? '#27A869' : 'var(--teal)',
              border: `1px solid ${saved ? 'rgba(39,168,105,0.2)' : 'rgba(14,123,140,0.2)'}`,
              padding: '5px 14px', borderRadius: '7px',
              fontSize: '0.8rem', fontWeight: 700,
              cursor: pending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: pending ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {saved ? '✓ Saved' : pending ? '…' : 'Save'}
          </button>
        </form>
      </td>
    </tr>
  )
}

const th: React.CSSProperties = {
  padding: '9px 14px', textAlign: 'left', fontWeight: 700,
  fontSize: '0.72rem', textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--muted)',
}
const td: React.CSSProperties = {
  padding: '10px 14px', verticalAlign: 'middle',
}
