'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reportProviderNoShow, reportPatientIssue } from '@/app/actions/disputeActions'

// ─── Patient: Report nurse didn't show ────────────────────────────────────────
export function PatientReportNoShowBtn({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startT] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startT(async () => {
      await reportProviderNoShow(fd)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'rgba(224,74,74,0.08)', color: '#E04A4A',
          border: '1.5px solid rgba(224,74,74,0.25)',
          padding: '8px 18px', borderRadius: 9, fontSize: '0.82rem',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        🚨 Report No-Show
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--card)', borderRadius: 16, padding: '28px 28px 24px',
            maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(224,74,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🚨</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)' }}>Report Provider No-Show</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>The nurse did not arrive for the scheduled session</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <input type="hidden" name="booking_id" value={bookingId} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Describe what happened
                </label>
                <textarea
                  name="reason"
                  required
                  rows={4}
                  placeholder="e.g. The nurse did not arrive at the scheduled time. I waited for 30 minutes and received no communication…"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 9,
                    border: '1.5px solid var(--border)', background: 'var(--shell-bg)',
                    color: 'var(--ink)', fontSize: '0.85rem', resize: 'vertical',
                    fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5,
                  }}
                />
              </div>
              <div style={{ background: 'rgba(224,74,74,0.05)', border: '1px solid rgba(224,74,74,0.15)', borderRadius: 9, padding: '10px 14px', marginBottom: 18, fontSize: '0.78rem', color: '#b85e00' }}>
                ⚠️ This will immediately flag the booking as <strong>No-Show</strong> and notify the admin team for review.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setOpen(false)} disabled={pending} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--shell-bg)', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button type="submit" disabled={pending} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: pending ? 'var(--muted)' : '#E04A4A', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {pending ? '⏳ Submitting…' : '🚨 Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Provider: Report patient absent / access issue ───────────────────────────
export function ProviderReportIssueBtn({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startT] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startT(async () => {
      await reportPatientIssue(fd)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'rgba(181,94,0,0.08)', color: '#b85e00',
          border: '1.5px solid rgba(181,94,0,0.25)',
          padding: '8px 18px', borderRadius: 9, fontSize: '0.82rem',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        ⚠️ Report Issue
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--card)', borderRadius: 16, padding: '28px 28px 24px',
            maxWidth: 500, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(181,94,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>⚠️</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)' }}>Report an Issue</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>Patient absent, access denied, or other problem on arrival</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <input type="hidden" name="booking_id" value={bookingId} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Issue Type
                </label>
                <select
                  name="issue_type"
                  required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 9,
                    border: '1.5px solid var(--border)', background: 'var(--shell-bg)',
                    color: 'var(--ink)', fontSize: '0.85rem', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="patient_absent">🚪 Patient was not present / absent</option>
                  <option value="access_denied">🔒 Access denied / couldn't enter</option>
                  <option value="quality_issue">⚠️ Other on-site issue</option>
                  <option value="other">📝 Other</option>
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Describe what happened
                </label>
                <textarea
                  name="reason"
                  required
                  rows={4}
                  placeholder="e.g. I arrived at the address at the scheduled time but nobody answered the door. Tried calling the contact number with no response…"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 9,
                    border: '1.5px solid var(--border)', background: 'var(--shell-bg)',
                    color: 'var(--ink)', fontSize: '0.85rem', resize: 'vertical',
                    fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5,
                  }}
                />
              </div>
              <div style={{ background: 'rgba(181,94,0,0.05)', border: '1px solid rgba(181,94,0,0.18)', borderRadius: 9, padding: '10px 14px', marginBottom: 18, fontSize: '0.78rem', color: '#b85e00' }}>
                ⚠️ This will flag the booking as <strong>Disputed</strong> and notify the admin team. Your report is protected — you will not be penalised for legitimate issues.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setOpen(false)} disabled={pending} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--shell-bg)', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button type="submit" disabled={pending} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: pending ? 'var(--muted)' : '#b85e00', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {pending ? '⏳ Submitting…' : '⚠️ Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Shared: Dispute status banner (shown after report) ───────────────────────
export function DisputeBanner({
  disputeType,
  disputeReason,
  disputeStatus,
  disputeRaisedAt,
  disputeResolution,
  role,
}: {
  disputeType: string | null
  disputeReason: string | null
  disputeStatus: string
  disputeRaisedAt: string | null
  disputeResolution: string | null
  role: 'patient' | 'provider' | 'admin'
}) {
  if (!disputeType || disputeStatus === 'none') return null

  const TYPE_LABELS: Record<string, string> = {
    provider_no_show: '🚨 Provider No-Show',
    patient_absent:   '🚪 Patient Absent',
    access_denied:    '🔒 Access Denied',
    quality_issue:    '⚠️ Quality Issue',
    other:            '📝 Other Issue',
  }

  const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
    open:         { bg: 'rgba(224,74,74,0.06)',   color: '#E04A4A', label: '🔴 Open — Awaiting Review' },
    under_review: { bg: 'rgba(59,130,246,0.07)',  color: '#3B82F6', label: '🔵 Under Review' },
    resolved:     { bg: 'rgba(26,122,74,0.07)',   color: '#1A7A4A', label: '✅ Resolved' },
    none:         { bg: 'transparent',            color: 'var(--muted)', label: '' },
  }

  const sm = STATUS_META[disputeStatus] ?? STATUS_META.open

  const patientMsg  = 'Your no-show report has been received. Our team will review and get back to you within 24 hours.'
  const providerMsg = 'Your issue report has been received. Admin will review the case. You will not be penalised for reporting legitimate issues.'

  return (
    <div style={{
      background: sm.bg, border: `1.5px solid ${sm.color}30`,
      borderRadius: 12, padding: '16px 20px', marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800, color: sm.color, fontSize: '0.9rem', marginBottom: 4 }}>
            {TYPE_LABELS[disputeType] ?? 'Issue Reported'} — {sm.label}
          </div>
          {disputeRaisedAt && (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6 }}>
              Reported {new Date(disputeRaisedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at {new Date(disputeRaisedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {disputeReason && (
            <div style={{ fontSize: '0.8rem', color: 'var(--ink)', background: 'rgba(0,0,0,0.03)', borderRadius: 7, padding: '8px 12px', marginBottom: 6, borderLeft: `3px solid ${sm.color}50` }}>
              "{disputeReason}"
            </div>
          )}
          {disputeStatus !== 'resolved' && (
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
              {role === 'patient' ? patientMsg : role === 'provider' ? providerMsg : 'Dispute is awaiting admin resolution.'}
            </div>
          )}
          {disputeStatus === 'resolved' && disputeResolution && (
            <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(26,122,74,0.06)', borderRadius: 8, borderLeft: '3px solid #1A7A4A' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1A7A4A', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Admin Resolution</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>{disputeResolution}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
