'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateComplaintStatus } from '@/app/actions/complaintActions'

export default function ComplaintActionForm({
  complaintId,
  currentStatus,
}: {
  complaintId: string
  currentStatus: string
}) {
  const [adminNote, setAdminNote]   = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [pending, startTransition]  = useTransition()
  const [action, setAction]         = useState<string | null>(null)
  const router = useRouter()

  function handleAction(status: string) {
    setError(null)
    setAction(status)
    const fd = new FormData()
    fd.set('complaint_id', complaintId)
    fd.set('status', status)
    fd.set('admin_note', adminNote)
    startTransition(async () => {
      const res = await updateComplaintStatus(fd)
      if (res.error) {
        setError(res.error)
        setAction(null)
      } else {
        router.push('/admin/complaints')
      }
    })
  }

  if (currentStatus !== 'open') {
    return (
      <div className="dash-card">
        <div className="dash-card-body" style={{ padding: '1.2rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
          This complaint is already {currentStatus}. No further action required.
        </div>
      </div>
    )
  }

  return (
    <div className="dash-card" style={{ borderLeft: '4px solid var(--teal)' }}>
      <div className="dash-card-header">
        <span className="dash-card-title">⚖️ Resolve Complaint</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Choose an outcome and optionally add a note</span>
      </div>
      <div className="dash-card-body">
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Admin Note (optional — shared with reporter)
          </label>
          <textarea
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            rows={3}
            placeholder="Describe the outcome, finding, or reason for rejection…"
            className="form-input"
            style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(224,74,74,0.08)', border: '1px solid rgba(224,74,74,0.25)', borderRadius: 8, padding: '9px 12px', marginBottom: 14, fontSize: '0.8rem', color: '#E04A4A', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleAction('resolved')}
            disabled={pending}
            style={{
              padding: '10px 24px', borderRadius: 9, border: 'none',
              background: pending && action === 'resolved' ? 'var(--muted)' : 'linear-gradient(135deg,#1A7A4A,#27A869)',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {pending && action === 'resolved' ? '⏳ Saving…' : '✅ Mark Resolved'}
          </button>
          <button
            onClick={() => handleAction('rejected')}
            disabled={pending}
            style={{
              padding: '10px 24px', borderRadius: 9, border: '1px solid var(--border)',
              background: 'var(--shell-bg)',
              color: 'var(--ink)', fontWeight: 700, fontSize: '0.9rem',
              cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {pending && action === 'rejected' ? '⏳ Saving…' : '❌ Reject Complaint'}
          </button>
        </div>
      </div>
    </div>
  )
}
