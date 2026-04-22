'use client'

import { useTransition, useState, useRef } from 'react'
import { submitCancelRequest } from './actions'

interface Props {
  bookingId: string
}

export function CancelRequestBtn({ bookingId }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    start(async () => {
      const res = await submitCancelRequest(fd)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          setError(null)
        }, 2500)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'rgba(224,74,74,0.07)',
          color: '#E04A4A',
          border: '1px solid rgba(224,74,74,0.22)',
          padding: '7px 14px',
          borderRadius: 7,
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        ✕ Request Cancellation
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }}
        >
          <div style={{
            background: 'var(--surface, #fff)', borderRadius: 14,
            padding: '1.75rem', width: '100%', maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#E04A4A' }}>⚠️ Request Cancellation</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}>✕</button>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <div style={{ fontWeight: 700, color: '#27A869' }}>Cancellation request submitted!</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>Admin will review and contact you shortly.</div>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input type="hidden" name="booking_id" value={bookingId} />

                <div style={{ background: 'rgba(245,132,42,0.07)', border: '1px solid rgba(245,132,42,0.25)', borderRadius: 10, padding: '12px 14px', fontSize: '0.8rem', color: '#b36b00', lineHeight: 1.5 }}>
                  This booking is past the free-cancellation window. Your request will go to admin review. A cancellation fee may apply.
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Reason for cancellation (optional)
                  </label>
                  <textarea
                    name="reason"
                    rows={3}
                    placeholder="Please provide a reason to help admin review your request…"
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: '1px solid var(--border)', fontSize: '0.85rem',
                      fontFamily: 'inherit', background: 'var(--surface, #fff)',
                      color: 'var(--ink)', resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {error && (
                  <div style={{ background: 'rgba(224,74,74,0.08)', border: '1px solid rgba(224,74,74,0.25)', borderRadius: 8, padding: '10px 12px', fontSize: '0.8rem', color: '#E04A4A', fontWeight: 600 }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--cream, #f7f7f5)', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    style={{
                      padding: '9px 20px', borderRadius: 8, border: 'none',
                      background: pending ? 'var(--cream)' : '#E04A4A',
                      color: pending ? 'var(--muted)' : '#fff',
                      fontSize: '0.85rem', fontWeight: 700,
                      cursor: pending ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', opacity: pending ? 0.7 : 1,
                    }}
                  >
                    {pending ? '⏳ Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
