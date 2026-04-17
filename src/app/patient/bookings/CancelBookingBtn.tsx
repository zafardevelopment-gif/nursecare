'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBooking } from './actions'

export function CancelBookingBtn({ requestId, compact }: { requestId: string; compact?: boolean }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleClick() {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    start(async () => {
      const result = await cancelBooking(requestId)
      if (result?.error) {
        setError(result.error)
        setTimeout(() => setError(null), 5000)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <button
        disabled={pending}
        onClick={handleClick}
        style={{
          background: pending ? 'var(--cream)' : 'rgba(224,74,74,0.08)',
          color: '#E04A4A',
          border: '1px solid rgba(224,74,74,0.25)',
          padding: compact ? '4px 10px' : '7px 14px',
          borderRadius: 7,
          fontSize: compact ? '0.7rem' : '0.78rem',
          fontWeight: 700,
          cursor: pending ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          opacity: pending ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {pending ? '⏳ Cancelling…' : '✕ Cancel'}
      </button>
      {error && (
        <span style={{ fontSize: '0.62rem', color: '#E04A4A', fontWeight: 600, maxWidth: 160 }}>{error}</span>
      )}
    </div>
  )
}
