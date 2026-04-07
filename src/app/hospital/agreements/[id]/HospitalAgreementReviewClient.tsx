'use client'

import { useState, useTransition } from 'react'
import { acceptAgreementAction, rejectAgreementAction } from './actions'

type Agreement = {
  id: string
  ref_number: string
  status: string
  payment_type: string
  start_date: string
  end_date: string
  reminder_hours: number[] | null
  monthly_billing_day: number | null
  monthly_advance_days: number | null
  monthly_grace_hrs: number | null
  monthly_missed_action: string | null
  weekly_payment_day: string | null
  weekly_deadline_hrs: number | null
  weekly_grace_hrs: number | null
  weekly_missed_action: string | null
  daily_deadline_hrs: number | null
  daily_grace_hrs: number | null
  daily_cancel_misses: number | null
  daily_missed_action: string | null
  adv_deadline_hrs: number | null
  hospital_rejection_reason: string | null
}
type Hospital = {
  hospital_name: string
  contact_person: string
  designation: string | null
  email: string
  scope_of_services: string | null
  address: string | null
  city: string | null
  license_cr: string | null
}

export default function HospitalAgreementReviewClient({
  agreement, hospital,
}: {
  agreement: Agreement
  hospital: Hospital
}) {
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [checked, setChecked]  = useState(false)
  const [error, setError]      = useState<string | null>(null)
  const [isPending, startTx]   = useTransition()

  const isSent     = agreement.status === 'sent'
  const isAccepted = agreement.status === 'hospital_accepted' || agreement.status === 'active'
  const isRejected = agreement.status === 'hospital_rejected'

  function handleAccept() {
    if (!checked) { setError('Please confirm you have read and agree to the agreement.'); return }
    setError(null)
    startTx(async () => {
      const fd = new FormData()
      fd.set('agreement_id', agreement.id)
      await acceptAgreementAction(fd)
    })
  }

  function handleReject() {
    if (!rejectReason.trim()) { setError('Please provide a reason for rejection.'); return }
    setError(null)
    startTx(async () => {
      const fd = new FormData()
      fd.set('agreement_id', agreement.id)
      fd.set('reason', rejectReason)
      await rejectAgreementAction(fd)
    })
  }

  const payLabel: Record<string, string> = {
    advance: '💰 Advance', daily: '📅 Daily', weekly: '📆 Weekly', monthly: '🗓️ Monthly',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Status banner */}
      {isAccepted && (
        <div style={{ background: 'rgba(26,122,74,0.06)', border: '1px solid rgba(26,122,74,0.25)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.5rem' }}>🎉</span>
          <div>
            <div style={{ fontWeight: 700, color: '#1A7A4A', fontSize: '0.92rem' }}>Agreement Accepted & Active</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 3 }}>You can now hire nurses through NurseCare+.</div>
          </div>
        </div>
      )}
      {isRejected && (
        <div style={{ background: 'rgba(224,74,74,0.04)', border: '1px solid rgba(224,74,74,0.2)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, color: '#E04A4A', fontSize: '0.92rem' }}>✕ You rejected this agreement</div>
          {agreement.hospital_rejection_reason && (
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 6 }}>Your reason: {agreement.hospital_rejection_reason}</div>
          )}
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 6 }}>Admin has been notified and will revise the agreement.</div>
        </div>
      )}
      {isSent && (
        <div style={{ background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.2)', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span>📨</span>
          <span style={{ fontSize: '0.84rem', color: 'var(--teal)', fontWeight: 600 }}>
            Please review the agreement below and accept or reject it.
          </span>
        </div>
      )}

      {/* Agreement document */}
      <div className="dash-card">
        {/* Header */}
        <div style={{ background: '#0F172A', padding: '22px 26px', borderRadius: '10px 10px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: 'serif', fontWeight: 700, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, background: '#14B8A6', borderRadius: '50%', display: 'inline-block' }} />
              NurseCare+
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <a
                href={`/api/hospital-agreements/${agreement.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 14px', borderRadius: 7, fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                ⬇ Download PDF
              </a>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 5, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                {agreement.ref_number}
              </div>
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 3 }}>Hospital Service Agreement</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
            Service agreement between NurseCare+ and {hospital.hospital_name}
          </div>
        </div>
        <div style={{ height: 3, background: '#0D9488' }} />

        <div style={{ padding: '1.5rem' }}>
          {/* Party B */}
          <DocSection title="Hospital Details">
            <DocRow k="Hospital Name"  v={hospital.hospital_name} />
            {hospital.license_cr && <DocRow k="License / CR" v={hospital.license_cr} />}
            {(hospital.address || hospital.city) && <DocRow k="Address" v={[hospital.address, hospital.city].filter(Boolean).join(', ')} />}
            <DocRow k="Representative" v={[hospital.contact_person, hospital.designation].filter(Boolean).join(' — ')} />
            <DocRow k="Email"          v={hospital.email} />
          </DocSection>

          {/* Validity */}
          <DocSection title="Agreement Terms">
            <DocRow k="Effective From" v={agreement.start_date} />
            <DocRow k="Valid Until"    v={agreement.end_date} />
            {hospital.scope_of_services && <DocRow k="Scope" v={hospital.scope_of_services} />}
          </DocSection>

          {/* Payment */}
          <DocSection title="Payment Structure">
            <DocRow k="Payment Type" v={payLabel[agreement.payment_type] ?? agreement.payment_type} />
            {agreement.payment_type === 'monthly' && <>
              {agreement.monthly_billing_day   != null && <DocRow k="Billing Date"    v={`${agreement.monthly_billing_day}th of each month`} />}
              {agreement.monthly_advance_days  != null && <DocRow k="Advance Deposit" v={`${agreement.monthly_advance_days} days before service`} />}
              {agreement.monthly_grace_hrs     != null && <DocRow k="Grace Period"    v={`${agreement.monthly_grace_hrs} hours`} />}
              {agreement.monthly_missed_action          && <DocRow k="Missed Payment" v={agreement.monthly_missed_action === 'pause' ? 'Nurse paused until payment' : 'Booking cancelled'} />}
            </>}
            {agreement.payment_type === 'weekly' && <>
              {agreement.weekly_payment_day  && <DocRow k="Payment Day"  v={agreement.weekly_payment_day} />}
              {agreement.weekly_deadline_hrs != null && <DocRow k="Deadline"      v={`${agreement.weekly_deadline_hrs} hrs before`} />}
              {agreement.weekly_grace_hrs    != null && <DocRow k="Grace Period"  v={`${agreement.weekly_grace_hrs} hours`} />}
              {agreement.weekly_missed_action         && <DocRow k="Missed Payment" v={agreement.weekly_missed_action === 'pause' ? 'Nurse paused' : 'Cancel booking'} />}
            </>}
            {agreement.payment_type === 'daily' && <>
              {agreement.daily_deadline_hrs  != null && <DocRow k="Deadline"      v={`${agreement.daily_deadline_hrs} hrs before`} />}
              {agreement.daily_grace_hrs     != null && <DocRow k="Grace Period"  v={`${agreement.daily_grace_hrs} hours`} />}
              {agreement.daily_cancel_misses != null && <DocRow k="Cancel After"  v={`${agreement.daily_cancel_misses} misses`} />}
              {agreement.daily_missed_action          && <DocRow k="Missed Payment" v={agreement.daily_missed_action === 'pause' ? 'Nurse paused' : 'Cancel booking'} />}
            </>}
            {agreement.payment_type === 'advance' && agreement.adv_deadline_hrs && (
              <DocRow k="Deadline" v={`${agreement.adv_deadline_hrs} hours before job`} />
            )}
            {(agreement.reminder_hours ?? []).length > 0 && (
              <DocRow k="Reminders" v={(agreement.reminder_hours as number[]).map(h => `${h} hrs`).join(' · ') + ' before deadline'} />
            )}
          </DocSection>

          {/* Signatures */}
          <DocSection title="Signatures">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { party: 'Party A — NurseCare+', name: 'Admin', desig: 'NurseCare+ Healthcare Solutions' },
                { party: 'Party B — Hospital',   name: hospital.contact_person, desig: `${hospital.designation ?? ''} — ${hospital.hospital_name}`.replace(/^— /, '') },
              ].map(sig => (
                <div key={sig.party} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--cream)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 7 }}>{sig.party}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--ink)' }}>{sig.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>{sig.desig}</div>
                  <div style={{ height: 1, background: '#CBD5E1', margin: '14px 0 5px' }} />
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Signature & Date</div>
                </div>
              ))}
            </div>
          </DocSection>
        </div>

        <div style={{ background: '#1E293B', padding: '9px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0 0 10px 10px' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>NurseCare+ Healthcare Solutions · Riyadh, Saudi Arabia</span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{agreement.ref_number}</span>
        </div>
      </div>

      {/* Action block */}
      {isSent && (
        <div className="dash-card" style={{ padding: '1.5rem' }}>
          {error && (
            <div className="auth-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>
          )}

          {/* Confirmation checkbox */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: '1.2rem', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--teal)', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 500, lineHeight: 1.5 }}>
              I confirm that I have read and understood the agreement terms above, and I am authorized to accept on behalf of {hospital.hospital_name}.
            </span>
          </label>

          {/* Buttons */}
          {!showReject ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleAccept}
                disabled={isPending}
                style={{ background: '#1A7A4A', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 9, fontWeight: 700, fontSize: '0.88rem', cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isPending ? 0.7 : 1, flex: 1 }}
              >
                {isPending ? '⏳ Processing…' : '✅ Accept & Sign Agreement'}
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={isPending}
                style={{ background: 'rgba(224,74,74,0.08)', color: '#E04A4A', border: '1px solid rgba(224,74,74,0.25)', padding: '11px 20px', borderRadius: 9, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ✕ Reject
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#E04A4A', marginBottom: 8 }}>Reason for Rejection</div>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="form-input"
                rows={3}
                placeholder="Please explain why you are rejecting this agreement…"
                style={{ resize: 'vertical', marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowReject(false)} style={{ padding: '9px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--cream)', color: 'var(--muted)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isPending}
                  style={{ background: '#E04A4A', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isPending ? 0.7 : 1 }}
                >
                  {isPending ? '⏳ Sending…' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#0F5F59', borderLeft: '3px solid #0D9488', paddingLeft: 8, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}
function DocRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
      <div style={{ width: 180, flexShrink: 0, fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>{k}</div>
      <div style={{ fontSize: '0.78rem', color: '#0F172A', fontWeight: 600 }}>{v}</div>
    </div>
  )
}
