'use client'

import { useState, useTransition } from 'react'
import { toggleAvailability } from '@/app/provider/actions'

export default function AvailabilityToggle({ initialValue }: { initialValue: boolean }) {
  const [isAvailable, setIsAvailable] = useState(initialValue)
  const [pending, startTransition]    = useTransition()

  function handleToggle() {
    const next = !isAvailable
    setIsAvailable(next) // optimistic
    startTransition(async () => {
      const result = await toggleAvailability(next)
      if (result.error) setIsAvailable(!next) // revert on error
    })
  }

  return (
    <div style={{
      margin: '0 0.8rem 1rem',
      padding: '10px 14px',
      borderRadius: 12,
      background: isAvailable ? 'rgba(39,168,105,0.12)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${isAvailable ? 'rgba(39,168,105,0.25)' : 'rgba(255,255,255,0.08)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      transition: 'all 0.25s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: isAvailable ? '#4ADE80' : 'rgba(255,255,255,0.2)',
          boxShadow: isAvailable ? '0 0 0 3px rgba(74,222,128,0.2)' : 'none',
          display: 'inline-block',
          transition: 'all 0.25s',
        }} />
        <span style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: isAvailable ? '#4ADE80' : 'rgba(255,255,255,0.4)',
          transition: 'color 0.25s',
        }}>
          {pending ? 'Updating…' : isAvailable ? 'Available for Bookings' : 'Not Taking Bookings'}
        </span>
      </div>

      {/* Toggle switch */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-label={isAvailable ? 'Turn off availability' : 'Turn on availability'}
        style={{
          width: 40, height: 22, borderRadius: 11, border: 'none', flexShrink: 0,
          background: isAvailable ? '#27A869' : 'rgba(255,255,255,0.15)',
          position: 'relative', cursor: pending ? 'not-allowed' : 'pointer',
          transition: 'background 0.25s', padding: 0,
          opacity: pending ? 0.6 : 1,
        }}
      >
        <span style={{
          position: 'absolute', top: 3,
          left: isAvailable ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.25s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          display: 'block',
        }} />
      </button>
    </div>
  )
}
