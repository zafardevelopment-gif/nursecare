'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitLeaveRequest } from '@/app/actions/leaveActions'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: '⏳ Pending',  color: '#b85e00', bg: 'rgba(181,94,0,0.08)'  },
  approved: { label: '✅ Approved', color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
  rejected: { label: '❌ Rejected', color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
}

interface LeaveRow {
  id: string
  leave_date: string
  leave_type: string
  reason: string
  status: string
  admin_note: string | null
  has_bookings: boolean
  created_at: string
}

export default function LeaveClient({ leaves }: { leaves: LeaveRow[] }) {
  const [showForm, setShowForm]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await submitLeaveRequest(fd)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setShowForm(false)
          setSuccess(false)
          router.refresh()
        }, 1500)
      }
    })
  }

  return (
    <div className="dash-shell">
      {/* Header */}
      <div className="dash-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="dash-title">My Leave Requests</h1>
          <p className="dash-sub">Request days off and track approval status</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(null); setSuccess(false) }}
          style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          + Request Leave
        </button>
      </div>

      {/* Leave request form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(14,123,140,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>📅</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)' }}>Request Leave</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>Submit your leave request for admin review</div>
              </div>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, color: '#1A7A4A' }}>Leave request submitted!</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Leave Date */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Leave Date <span style={{ color: '#E04A4A' }}>*</span>
                  </label>
                  <input
                    type="date"
                    name="leave_date"
                    required
                    min={today}
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Leave Type */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Leave Type <span style={{ color: '#E04A4A' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[{ value: 'full_day', label: '🌅 Full Day' }, { value: 'half_day', label: '🕐 Half Day' }].map(opt => (
                      <label key={opt.value} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--shell-bg)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
                        <input type="radio" name="leave_type" value={opt.value} defaultChecked={opt.value === 'full_day'} style={{ accentColor: 'var(--teal)' }} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Reason <span style={{ color: '#E04A4A' }}>*</span>
                  </label>
                  <textarea
                    name="reason"
                    required
                    rows={3}
                    placeholder="e.g. Medical appointment, family emergency…"
                    className="form-input"
                    style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                {error && (
                  <div style={{ background: 'rgba(224,74,74,0.08)', border: '1px solid rgba(224,74,74,0.25)', borderRadius: 8, padding: '9px 12px', marginBottom: 14, fontSize: '0.8rem', color: '#E04A4A', fontWeight: 600 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowForm(false)} disabled={pending} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--shell-bg)', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={pending} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: pending ? 'var(--muted)' : 'var(--teal)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {pending ? '⏳ Submitting…' : '📅 Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Leave history table */}
      <div className="dash-card">
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>📋 Leave History</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{leaves.length} total</span>
        </div>

        {leaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📅</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No leave requests yet</div>
            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>Click "Request Leave" to submit your first request</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--shell-bg)', borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Type', 'Reason', 'Status', 'Admin Note'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave, i) => {
                  const sm = STATUS_META[leave.status] ?? STATUS_META.pending
                  return (
                    <tr key={leave.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(14,123,140,0.01)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                        {new Date(leave.leave_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {leave.has_bookings && (
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#b85e00', fontWeight: 600, marginTop: 2 }}>⚠️ Had bookings</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink)' }}>
                        {leave.leave_type === 'full_day' ? '🌅 Full Day' : '🕐 Half Day'}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink)', maxWidth: 220 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>{leave.reason}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: sm.bg, color: sm.color, padding: '4px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{sm.label}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--muted)', maxWidth: 200 }}>
                        {leave.admin_note ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
