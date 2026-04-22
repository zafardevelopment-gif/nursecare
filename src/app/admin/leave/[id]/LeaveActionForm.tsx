'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveLeaveRequest, rejectLeaveRequest } from '@/app/actions/leaveActions'

export default function LeaveActionForm({
  leaveId,
  hasBookings,
}: {
  leaveId: string
  hasBookings: boolean
}) {
  const [adminNote, setAdminNote]   = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [pending, startTransition]  = useTransition()
  const [action, setAction]         = useState<'approve' | 'reject' | null>(null)
  const router = useRouter()

  function handleAction(type: 'approve' | 'reject') {
    setError(null)
    setAction(type)
    const fd = new FormData()
    fd.set('leave_id', leaveId)
    fd.set('admin_note', adminNote)
    startTransition(async () => {
      const res = type === 'approve'
        ? await approveLeaveRequest(fd)
        : await rejectLeaveRequest(fd)
      if (res.error) {
        setError(res.error)
        setAction(null)
      } else {
        router.push('/admin/leave')
      }
    })
  }

  return (
    <div className="dash-card" style={{ borderLeft: '4px solid var(--teal)' }}>
      <div className="dash-card-header">
        <span className="dash-card-title">⚖️ Review Decision</span>
      </div>
      <div className="dash-card-body">
        {hasBookings && (
          <div style={{ background: '#FFF8E6', border: '1.5px solid #F59E0B', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
            <div style={{ fontSize: '0.8rem', color: '#92400E', fontWeight: 600 }}>
              This nurse has active bookings on the leave date. If approved, you must manually reassign those bookings using the links above.
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Admin Note (optional)
          </label>
          <textarea
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            rows={3}
            placeholder="Add a note for the nurse (reason for approval/rejection)…"
            className="form-input"
            style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(224,74,74,0.08)', border: '1px solid rgba(224,74,74,0.25)', borderRadius: 8, padding: '9px 12px', marginBottom: 14, fontSize: '0.8rem', color: '#E04A4A', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleAction('approve')}
            disabled={pending}
            style={{
              padding: '10px 24px', borderRadius: 9, border: 'none',
              background: pending && action === 'approve' ? 'var(--muted)' : 'linear-gradient(135deg,#1A7A4A,#27A869)',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {pending && action === 'approve' ? '⏳ Approving…' : '✅ Approve Leave'}
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={pending}
            style={{
              padding: '10px 24px', borderRadius: 9, border: 'none',
              background: pending && action === 'reject' ? 'var(--muted)' : '#E04A4A',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {pending && action === 'reject' ? '⏳ Rejecting…' : '❌ Reject Leave'}
          </button>
        </div>
      </div>
    </div>
  )
}
