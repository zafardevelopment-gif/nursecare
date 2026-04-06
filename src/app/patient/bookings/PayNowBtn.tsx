'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markPaymentDone } from './actions'

export function PayNowBtn({ requestId, amount, compact }: { requestId: string; amount: number; compact?: boolean }) {
  const [pending, start] = useTransition()
  const router = useRouter()

  async function handleClick() {
    start(async () => {
      await markPaymentDone(requestId)
      router.refresh()
    })
  }

  return (
    <button
      disabled={pending}
      onClick={handleClick}
      style={{
        background: pending ? 'var(--cream)' : 'linear-gradient(135deg,#27A869,#1a8a55)',
        color: pending ? 'var(--muted)' : '#fff',
        border: 'none',
        padding: compact ? '5px 10px' : '10px 22px',
        borderRadius: compact ? 7 : 9,
        fontSize: compact ? '0.72rem' : '0.88rem',
        fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', opacity: pending ? 0.7 : 1,
        boxShadow: pending ? 'none' : '0 2px 8px rgba(39,168,105,0.3)',
        display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
      }}
    >
      {pending ? '⏳ Processing…' : <>💳 Pay {amount > 0 ? `SAR ${amount.toLocaleString()}` : 'Now'}</>}
    </button>
  )
}
