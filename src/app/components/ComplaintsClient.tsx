'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitComplaint } from '@/app/actions/complaintActions'

const COMPLAINT_TYPES = [
  { value: 'no_show',             label: '🚫 No Show' },
  { value: 'late_arrival',        label: '⏰ Late Arrival' },
  { value: 'misbehavior',         label: '😤 Misbehavior' },
  { value: 'service_quality',     label: '⚠️ Service Quality' },
  { value: 'payment_issue',       label: '💸 Payment Issue' },
  { value: 'wrong_cancellation',  label: '❌ Wrong Cancellation' },
  { value: 'safety_issue',        label: '🚨 Safety Issue' },
  { value: 'other',               label: '📝 Other' },
]

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:     { label: '🔴 Open',     color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
  resolved: { label: '✅ Resolved', color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
  rejected: { label: '❌ Rejected', color: '#8A9BAA', bg: 'rgba(138,155,170,0.08)' },
}

interface ComplaintRow {
  id: string
  complaint_type: string
  description: string
  status: string
  admin_note: string | null
  created_at: string
  booking_id: string | null
}

interface BookingOption {
  id: string
  label: string
}

interface Props {
  complaints: ComplaintRow[]
  reporterRole: 'patient' | 'provider' | 'hospital'
  bookingOptions: BookingOption[]
}

export default function ComplaintsClient({ complaints, reporterRole, bookingOptions }: Props) {
  const [showForm, setShowForm]     = useState(false)
  const [imageUrl, setImageUrl]     = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)
  const [pending, startTransition]  = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('reporter_role', reporterRole)
    fd.set('image_url', imageUrl)
    startTransition(async () => {
      const res = await submitComplaint(fd)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setShowForm(false)
          setSuccess(false)
          setImageUrl('')
          router.refresh()
        }, 1800)
      }
    })
  }

  const roleLabel = reporterRole === 'patient' ? 'Patient' : reporterRole === 'provider' ? 'Nurse' : 'Hospital'

  return (
    <div className="dash-shell">
      {/* Header */}
      <div className="dash-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="dash-title">My Complaints</h1>
          <p className="dash-sub">Submit and track complaints or issues</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(null); setSuccess(false) }}
          style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#E04A4A', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          📣 Submit Complaint
        </button>
      </div>

      {/* Submit modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 520, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(224,74,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>📣</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)' }}>Submit a Complaint</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>{roleLabel} complaint — will be reviewed by admin</div>
              </div>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, color: '#1A7A4A' }}>Complaint submitted successfully!</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 6 }}>Our team will review it shortly.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Booking selector */}
                {bookingOptions.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Related Booking (optional)
                    </label>
                    <select name="booking_id" className="form-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                      <option value="">— Not related to a specific booking —</option>
                      {bookingOptions.map(b => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {bookingOptions.length === 0 && (
                  <input type="hidden" name="booking_id" value="" />
                )}

                {/* Complaint type */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Complaint Type <span style={{ color: '#E04A4A' }}>*</span>
                  </label>
                  <select name="complaint_type" required className="form-input" style={{ width: '100%', boxSizing: 'border-box' }}>
                    <option value="">Select a type…</option>
                    {COMPLAINT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Description <span style={{ color: '#E04A4A' }}>*</span>
                  </label>
                  <textarea
                    name="description"
                    required
                    minLength={20}
                    rows={4}
                    placeholder="Describe the issue in detail (minimum 20 characters)…"
                    className="form-input"
                    style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Optional image URL */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Proof Image URL (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://… (paste image link if available)"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4 }}>
                    Upload your image to any image host (e.g. imgbb.com) and paste the link here.
                  </div>
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
                  <button type="submit" disabled={pending} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: pending ? 'var(--muted)' : '#E04A4A', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {pending ? '⏳ Submitting…' : '📣 Submit Complaint'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Complaints list */}
      <div className="dash-card">
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>📋 My Complaints</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{complaints.length} total</span>
        </div>

        {complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📣</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No complaints yet</div>
            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>Click "Submit Complaint" to report an issue</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {complaints.map((c, i) => {
              const sm = STATUS_META[c.status] ?? STATUS_META.open
              const typeLabel = COMPLAINT_TYPES.find(t => t.value === c.complaint_type)?.label ?? c.complaint_type
              return (
                <div key={c.id} style={{ padding: '14px 20px', borderBottom: i < complaints.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{typeLabel}</span>
                      {c.booking_id && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(14,123,140,0.08)', color: 'var(--teal)', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                          Linked to booking
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{sm.label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--ink)', lineHeight: 1.5 }}>{c.description}</p>
                  {c.admin_note && (
                    <div style={{ background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 7, padding: '8px 12px', fontSize: '0.78rem', color: 'var(--ink)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--teal)' }}>Admin note: </span>{c.admin_note}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
