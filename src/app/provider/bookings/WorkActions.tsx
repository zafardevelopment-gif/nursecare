'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markWorkStarted, markWorkDone } from './actions'

export function WorkStartedBtn({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition()
  const router = useRouter()

  async function handleClick() {
    start(async () => {
      await markWorkStarted(requestId)
      router.refresh()
    })
  }

  return (
    <button
      disabled={pending}
      onClick={handleClick}
      style={{
        background: pending ? 'var(--cream)' : 'rgba(14,123,140,0.1)',
        color: '#0E7B8C',
        border: '1px solid rgba(14,123,140,0.25)',
        padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem',
        fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? '⏳ Updating…' : '🏃 Mark Work Started'}
    </button>
  )
}

export function WorkDoneBtn({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition()
  const router = useRouter()

  async function handleClick() {
    start(async () => {
      await markWorkDone(requestId)
      router.refresh()
    })
  }

  return (
    <button
      disabled={pending}
      onClick={handleClick}
      style={{
        background: pending ? 'var(--cream)' : 'rgba(39,168,105,0.1)',
        color: '#27A869',
        border: '1px solid rgba(39,168,105,0.25)',
        padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem',
        fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? '⏳ Updating…' : '✅ Mark Work Done'}
    </button>
  )
}
