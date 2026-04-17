'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveAgreementAsNurse, rejectAgreementAsNurse } from '../actions'

type Agreement = {
  id: string
  title: string
  status: string
  rendered_html: string
  generated_at: string
  nurse_approved_at: string | null
  hospital_approved_at: string | null
  rejection_reason?: string | null
}

export default function NurseAgreementApproveClient({ agreement }: { agreement: Agreement }) {
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const router = useRouter()

  const alreadyApproved = !!agreement.nurse_approved_at
  const alreadyRejected = agreement.status === 'rejected'

  function handleApprove() {
    const fd = new FormData()
    fd.set('agreement_id', agreement.id)
    startTransition(async () => {
      const res = await approveAgreementAsNurse(fd)
      if (res?.error) { setErr(res.error); return }
      router.refresh()
    })
  }

  function handleReject() {
    const fd = new FormData()
    fd.set('agreement_id', agreement.id)
    fd.set('reason', rejectReason)
    startTransition(async () => {
      const res = await rejectAgreementAsNurse(fd)
      if (res?.error) { setErr(res.error); return }
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>

      {/* Left: HTML preview */}
      <div className="dash-card" style={{ overflow: 'hidden' }}>
        <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="dash-card-title">Agreement Document</span>
          <a
            href={`/api/agreements/${agreement.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)',
              padding: '6px 14px', borderRadius: 8, fontWeight: 600,
              fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'none',
            }}
          >
            ⬇ Download PDF
          </a>
        </div>
        <div className="dash-card-body" style={{ padding: 0 }}>
          <iframe
            srcDoc={agreement.rendered_html}
            style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
            title="Agreement Preview"
          />
        </div>
      </div>

      {/* Right: Approval panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Your approval status */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Your Approval</span></div>
          <div className="dash-card-body">
            {alreadyApproved ? (
              <div style={{ background: '#E8F9F0', border: '1px solid #27A86933', borderRadius: 9, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✅</div>
                <div style={{ fontWeight: 700, color: '#1A7A4A', fontSize: '0.9rem' }}>You have approved</div>
                <div style={{ fontSize: '0.75rem', color: '#27A869', marginTop: 4 }}>
                  {new Date(agreement.nurse_approved_at!).toLocaleString()}
                </div>
              </div>
            ) : alreadyRejected ? (
              <div style={{ background: '#FEE8E8', border: '1px solid rgba(224,74,74,0.25)', borderRadius: 9, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✕</div>
                <div style={{ fontWeight: 700, color: '#C0392B', fontSize: '0.9rem' }}>You have rejected this agreement</div>
                {agreement.rejection_reason && (
                  <div style={{ fontSize: '0.75rem', color: '#C0392B', marginTop: 4 }}>Reason: {agreement.rejection_reason}</div>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.83rem', color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                  Please read the agreement carefully before approving. Your digital approval is legally binding.
                </p>
                {err && (
                  <div style={{ background: '#FEE8E8', color: '#C0392B', padding: '8px 12px', borderRadius: 7, marginBottom: 12, fontSize: '0.82rem' }}>
                    {err}
                  </div>
                )}
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 14, cursor: 'pointer' }}>
                  <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: 3 }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>I have read and agree to the terms of this agreement</span>
                </label>
                <button
                  onClick={handleApprove}
                  disabled={!confirmed || isPending}
                  style={{
                    width: '100%', background: confirmed ? '#0E7B8C' : 'var(--border)',
                    color: confirmed ? '#fff' : 'var(--muted)', border: 'none',
                    padding: '11px 16px', borderRadius: 9, fontWeight: 700,
                    fontSize: '0.88rem', cursor: confirmed ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s', marginBottom: 10,
                  }}
                >
                  {isPending ? 'Approving…' : '✓ Digitally Approve'}
                </button>

                {!showReject ? (
                  <button
                    onClick={() => setShowReject(true)}
                    style={{
                      width: '100%', background: 'transparent', color: '#E04A4A',
                      border: '1px solid rgba(224,74,74,0.35)', padding: '9px 16px',
                      borderRadius: 9, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer',
                    }}
                  >
                    ✕ Reject Agreement
                  </button>
                ) : (
                  <div style={{ background: '#FEF2F2', border: '1px solid rgba(224,74,74,0.25)', borderRadius: 9, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C0392B', marginBottom: 8 }}>Reason for rejection (optional)</div>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      rows={3}
                      placeholder="e.g. Terms not acceptable, incorrect details..."
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(224,74,74,0.3)', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        onClick={handleReject}
                        disabled={isPending}
                        style={{ flex: 1, background: '#E04A4A', color: '#fff', border: 'none', padding: '9px', borderRadius: 8, fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer' }}
                      >
                        {isPending ? 'Rejecting…' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => setShowReject(false)}
                        style={{ flex: 1, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '9px', borderRadius: 8, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hospital approval status */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">Hospital Approval</span></div>
          <div className="dash-card-body">
            {agreement.hospital_approved_at ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ color: '#27A869', fontSize: '1.2rem' }}>✓</div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1A7A4A' }}>Hospital Approved</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{new Date(agreement.hospital_approved_at).toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ color: '#F5842A', fontSize: '1.2rem' }}>⏳</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Awaiting hospital approval</div>
              </div>
            )}
          </div>
        </div>

        {/* Overall status */}
        {agreement.status === 'fully_approved' && (
          <div className="dash-card" style={{ background: '#E8F9F0', borderColor: '#27A86933' }}>
            <div className="dash-card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🎉</div>
              <div style={{ fontWeight: 700, color: '#1A7A4A', fontSize: '0.95rem' }}>Agreement Fully Executed</div>
              <div style={{ fontSize: '0.78rem', color: '#27A869', marginTop: 4 }}>Both parties have approved</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
