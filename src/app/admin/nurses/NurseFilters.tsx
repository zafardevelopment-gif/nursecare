'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

const STATUSES = ['all', 'pending', 'approved', 'rejected', 'update_pending']
const CITIES   = ['all', 'Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina', 'Khobar', 'Tabuk', 'Abha']

export default function NurseFilters({ specializations }: { specializations: string[] }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`))
  }

  const q      = searchParams.get('q')      ?? ''
  const status = searchParams.get('status') ?? 'all'
  const city   = searchParams.get('city')   ?? 'all'
  const spec   = searchParams.get('spec')   ?? 'all'

  return (
    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.2rem', alignItems: 'center' }}>
      {/* Search */}
      <input
        type="text"
        defaultValue={q}
        placeholder="Search name, email, phone, city, license…"
        onChange={e => update('q', e.target.value)}
        style={{
          flex: '1 1 260px', padding: '8px 12px', borderRadius: '8px',
          border: '1px solid var(--border)', fontSize: '0.85rem',
          fontFamily: 'inherit', outline: 'none',
          background: 'var(--card)',
        }}
      />

      {/* Status */}
      <select
        value={status}
        onChange={e => update('status', e.target.value)}
        style={selectStyle}
      >
        {STATUSES.map(s => (
          <option key={s} value={s}>
            {s === 'all' ? 'All Statuses' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </option>
        ))}
      </select>

      {/* City */}
      <select value={city} onChange={e => update('city', e.target.value)} style={selectStyle}>
        {CITIES.map(c => (
          <option key={c} value={c}>{c === 'all' ? 'All Cities' : c}</option>
        ))}
      </select>

      {/* Specialization */}
      <select value={spec} onChange={e => update('spec', e.target.value)} style={selectStyle}>
        <option value="all">All Specializations</option>
        {specializations.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)',
  fontSize: '0.82rem', fontFamily: 'inherit', background: 'var(--card)', cursor: 'pointer',
}
