'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveLeaveRequest, rejectLeaveRequest } from '@/app/actions/leaveActions'

export default function LeaveActionForm({
  leaveId,
  isBlocked,
  conflictCount,
}: {
  leaveId:       string
  isBlocked:     boolean
  conflictCount: number
}) {
  const [adminNote, setAdminNote]   = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [pending, startTransition]  = useTransition()
  const [action, setAction]         = useState<'approve' | 'reject' | null>(null)
  const router = useRouter()

  function handleAction(type: 'approve' | 'reject') {
    if (type === 'approve' && isBlocked) return
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
        router.refresh()
      }
    })
  }

  return (
    <div className="dash-card" style={{ borderLeft: `4px solid ${isBlocked ? '#E04A4A' : 'var(--teal)'}` }}>
      <div className="dash-card-header">
        <span className="dash-card-title">⚖️ Review Decision</span>
      </div>
      <div className="dash-card-body">
        {/* Blocked warning */}
        {isBlocked && (
          <div style={{ background: '#FEF2F2', border: '2px solid #E04A4A', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, color: '#E04A4A', fontSize: '0.88rem', marginBottom: 4 }}>
              🚫 Approval Blocked
            </div>
            <div style={{ fontSize: '0.8rem', color: '#92400E', lineHeight: 1.5 }}>
              This leave cannot be approved until all {conflictCount} conflicting booking{conflictCount !== 1 ? 's' : ''} are resolved. Go to each booking above and either reassign the nurse or cancel the booking.
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
            disabled={pending || isBlocked}
            title={isBlocked ? `Resolve ${conflictCount} conflict${conflictCount !== 1 ? 's' : ''} before approving` : undefined}
            style={{
              padding: '10px 24px', borderRadius: 9, border: 'none',
              background: isBlocked ? 'rgba(224,74,74,0.15)' : (pending && action === 'approve' ? 'var(--muted)' : 'linear-gradient(135deg,#1A7A4A,#27A869)'),
              color: isBlocked ? '#E04A4A' : '#fff',
              fontWeight: 700, fontSize: '0.9rem',
              cursor: (pending || isBlocked) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: isBlocked ? 0.7 : 1,
            }}
          >
            {isBlocked ? `🚫 Blocked (${conflictCount} conflict${conflictCount !== 1 ? 's' : ''})` : (pending && action === 'approve' ? '⏳ Approving…' : '✅ Approve Leave')}
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

        {isBlocked && (
          <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--muted)' }}>
            You can still reject this leave request at any time.
          </div>
        )}
      </div>
    </div>
  )
}
