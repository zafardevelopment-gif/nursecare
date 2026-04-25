'use client'

import { useTransition, useState } from 'react'
import { saveProfessionCommission, addProfessionCommission, deleteProfessionCommission } from './actions'

interface Profession {
  id: string
  profession: string
  commission_percent: number
}

export default function CommissionForm({ professions }: { professions: Profession[] }) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="dash-card">
      <div className="dash-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="dash-card-title">Commission by Profession</span>
        <button
          type="button"
          onClick={() => setShowAdd(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', borderRadius: 8, border: 'none',
            background: showAdd ? 'rgba(14,123,140,0.1)' : 'var(--teal)',
            color: showAdd ? 'var(--teal)' : '#fff',
            fontSize: '0.8rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {showAdd ? '✕ Cancel' : '+ Add Profession'}
        </button>
      </div>

      {showAdd && <AddProfessionRow onAdded={() => setShowAdd(false)} />}

      <div className="table-scroll-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--cream)' }}>
              <th style={th}>Profession</th>
              <th style={th}>Commission</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {professions.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '16px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                  No professions yet — add one above
                </td>
              </tr>
            )}
            {professions.map(p => (
              <ProfessionRow key={p.id} profession={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AddProfessionRow({ onAdded }: { onAdded: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await addProfessionCommission(fd)
      if (result.error) { setError(result.error); return }
      onAdded()
    })
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '12px 14px', background: 'rgba(14,123,140,0.04)' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profession Name</label>
            <input
              type="text"
              name="profession"
              placeholder="e.g. Dentist"
              required
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', fontFamily: 'inherit', background: '#fff', width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commission %</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                name="commission_percent"
                defaultValue={10}
                min="0"
                max="100"
                step="0.5"
                required
                style={{ width: 70, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', fontFamily: 'inherit', background: '#fff', textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>%</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: 'var(--teal)', color: '#fff',
              fontSize: '0.85rem', fontWeight: 700,
              cursor: pending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: pending ? 0.7 : 1,
              marginBottom: 1,
            }}
          >
            {pending ? 'Adding…' : '+ Add'}
          </button>
        </div>
        {error && <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#E53E3E' }}>⚠ {error}</div>}
      </form>
    </div>
  )
}

function ProfessionRow({ profession }: { profession: Profession }) {
  const [savePending, startSave] = useTransition()
  const [delPending, startDel]   = useTransition()
  const [saved, setSaved]        = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startSave(async () => {
      await saveProfessionCommission(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return }
    const fd = new FormData()
    fd.set('id', profession.id)
    startDel(async () => { await deleteProfessionCommission(fd) })
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
            disabled={savePending}
            style={{
              background: saved ? 'rgba(39,168,105,0.1)' : 'rgba(14,123,140,0.08)',
              color: saved ? '#27A869' : 'var(--teal)',
              border: `1px solid ${saved ? 'rgba(39,168,105,0.2)' : 'rgba(14,123,140,0.2)'}`,
              padding: '5px 14px', borderRadius: '7px',
              fontSize: '0.8rem', fontWeight: 700,
              cursor: savePending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: savePending ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {saved ? '✓ Saved' : savePending ? '…' : 'Save'}
          </button>
        </form>
      </td>
      <td style={{ ...td, width: 60 }}>
        <button
          type="button"
          onClick={handleDelete}
          disabled={delPending}
          style={{
            padding: '5px 10px', borderRadius: 7,
            border: `1px solid ${confirmDel ? '#E53E3E' : 'var(--border)'}`,
            background: confirmDel ? 'rgba(229,62,62,0.08)' : 'none',
            color: confirmDel ? '#E53E3E' : 'var(--muted)',
            fontSize: '0.78rem', fontWeight: 600,
            cursor: delPending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {confirmDel ? 'Sure?' : '🗑'}
        </button>
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
