'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markWorkStarted, markWorkDone } from './actions'

export function WorkStartedBtn({
  requestId,
  startDate,
  startTime,
  isPaid,
  hoursBeforeEnabled = 1,
}: {
  requestId: string
  startDate?: string | null
  startTime?: string | null   // HH:MM of shift start e.g. "16:00"
  isPaid?: boolean
  hoursBeforeEnabled?: number // from admin setting
}) {
  const [pending, start] = useTransition()
  const router = useRouter()

  const paid = isPaid ?? false

  // Build a Date for when button becomes enabled:
  // shift start time on startDate minus hoursBeforeEnabled
  let timeUnlocked = false
  let unlockMsg = ''
  if (startDate) {
    const now = new Date()
    // parse start datetime — default to 00:00 if no time
    const [sh, sm] = (startTime ?? '00:00').split(':').map(Number)
    const shiftStart = new Date(`${startDate}T${String(sh).padStart(2,'0')}:${String(sm ?? 0).padStart(2,'0')}:00`)
    const enableAt   = new Date(shiftStart.getTime() - hoursBeforeEnabled * 60 * 60 * 1000)
    timeUnlocked = now >= enableAt
    if (!timeUnlocked) {
      const diffMs  = enableAt.getTime() - now.getTime()
      const diffHrs = Math.ceil(diffMs / (1000 * 60 * 60))
      unlockMsg = `📅 Available ${diffHrs}h before shift (${startDate})`
    }
  } else {
    timeUnlocked = true // no date set — don't block
  }

  const blocked     = !paid || !timeUnlocked
  const blockReason = !paid
    ? '💳 Payment not received yet'
    : !timeUnlocked
      ? unlockMsg
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
