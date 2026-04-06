'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markWorkStarted, markWorkDone } from './actions'

export function WorkStartedBtn({
  requestId,
  startDate,
  isPaid,
}: {
  requestId: string
  startDate?: string | null
  isPaid?: boolean
}) {
  const [pending, start] = useTransition()
  const router = useRouter()

  // Check if today matches start_date (compare YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10)
  const isToday  = !startDate || startDate === todayStr
  const paid     = isPaid ?? false

  const blocked     = !isToday || !paid
  const blockReason = !paid
    ? '💳 Payment not received yet'
    : !isToday
      ? `📅 Can only start on ${startDate}`
      : ''

  async function handleClick() {
    if (blocked) return
    start(async () => {
      await markWorkStarted(requestId)
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <button
        disabled={pending || blocked}
        onClick={handleClick}
        title={blockReason}
        style={{
          background: blocked ? 'var(--cream)' : pending ? 'var(--cream)' : 'rgba(14,123,140,0.1)',
          color: blocked ? 'var(--muted)' : '#0E7B8C',
          border: `1px solid ${blocked ? 'var(--border)' : 'rgba(14,123,140,0.25)'}`,
          padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem',
          fontWeight: 700, cursor: blocked || pending ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', opacity: blocked ? 0.55 : pending ? 0.6 : 1,
        }}
      >
        {pending ? '⏳ Updating…' : blocked ? '🔒 Mark Work Started' : '🏃 Mark Work Started'}
      </button>
      {blocked && blockReason && (
        <span style={{ fontSize: '0.65rem', color: '#E04A4A', fontWeight: 600 }}>{blockReason}</span>
      )}
    </div>
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
