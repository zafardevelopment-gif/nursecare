'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmWorkCompletion } from '@/app/provider/bookings/actions'

export function ConfirmCompletionBtn({ requestId }: { requestId: string }) {
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
        background: pending ? 'var(--cream)' : 'linear-gradient(135deg,#27A869,#1a8a55)',
        color: pending ? 'var(--muted)' : '#fff',
        border: 'none',
        padding: '9px 20px', borderRadius: 9, fontSize: '0.85rem',
        fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', opacity: pending ? 0.7 : 1,
        boxShadow: pending ? 'none' : '0 3px 12px rgba(39,168,105,0.3)',
      }}
    >
      {pending ? '⏳ Confirming…' : '✅ Confirm Work Completed'}
    </button>
  )
}
