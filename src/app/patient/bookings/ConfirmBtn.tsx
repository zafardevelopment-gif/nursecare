'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmWorkCompletion } from '@/app/provider/bookings/actions'

export function ConfirmCompletionBtn({ requestId, compact }: { requestId: string; compact?: boolean }) {
  const [pending, start] = useTransition()
  const router = useRouter()

  async function handleClick() {
    start(async () => {
      await confirmWorkCompletion(requestId)
      router.refresh()
    })
  }

  return (
    <button
      disabled={pending}
      onClick={handleClick}
      style={{
        background: pending ? 'var(--cream)' : 'linear-gradient(135deg,#6B3FA0,#4e2d78)',
        color: pending ? 'var(--muted)' : '#fff',
        border: 'none',
        padding: compact ? '5px 10px' : '9px 20px',
        borderRadius: compact ? 7 : 9,
        fontSize: compact ? '0.72rem' : '0.85rem',
        fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', opacity: pending ? 0.7 : 1,
        boxShadow: pending ? 'none' : '0 2px 8px rgba(107,63,160,0.3)',
        whiteSpace: 'nowrap',
      }}
    >
      {pending ? '⏳ Confirming…' : '🎉 Confirm Done'}
    </button>
  )
}
