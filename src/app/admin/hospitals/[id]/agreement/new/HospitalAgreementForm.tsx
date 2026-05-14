'use client'

import { useState, useTransition } from 'react'
import { createHospitalAgreementAction } from './actions'

type PaymentType = 'advance' | 'daily' | 'weekly' | 'monthly'
type MissedAction = 'pause' | 'cancel'

interface Hospital {
  id: string
  hospital_name: string
  contact_person: string
  email: string
  phone: string
  city: string
  license_cr: string
  address: string
  scope_of_services: string
}

export default function HospitalAgreementForm({
  hospital,
  refNumber,
  hospitalId,
}: {
  hospital: Hospital
  refNumber: string
  hospitalId: string
}) {
  const [paymentType, setPaymentType] = useState<PaymentType>('monthly')
  const [defaultStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [defaultEndDate] = useState(() => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [missedAction, setMissedAction] = useState<MissedAction>('pause')
  const [reminderHrs, setReminderHrs]   = useState<number[]>([48, 24, 6])
  const [newReminder, setNewReminder]   = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [isPending, startTx] = useTransition()

  function addReminder() {
    const v = parseInt(newReminder)
    if (!v || v <= 0 || reminderHrs.includes(v)) return
    setReminderHrs(prev => [...prev, v].sort((a, b) => b - a))
    setNewReminder('')
  }
  function removeReminder(h: number) {
    setReminderHrs(prev => prev.filter(x => x !== h))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('payment_type', paymentType)
    fd.set('missed_action', missedAction)
    fd.set('reminder_hours', JSON.stringify(reminderHrs))
    fd.set('hospital_id', hospitalId)
    fd.set('ref_number', refNumber)
    startTx(async () => {
      const res = await createHospitalAgreementAction(fd)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="auth-error" style={{ marginBottom: '1.2rem' }}>⚠️ {error}</div>
      )}

      {/* ── CARD 1: Agreement Validity ── */}
      <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'rgba(14,123,140,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>📅</div>
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink)' }}>Agreement Validity</span>
        </div>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Start Date <span style={{ color: '#E04A4A' }}>*</span></label>
              <input type="date" name="start_date" required className="form-input"
                defaultValue={defaultStartDate} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date <span style={{ color: '#E04A4A' }}>*</span></label>
              <input type="date" name="end_date" required className="form-input"
                defaultValue={defaultEndDate} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Admin Notes (optional)</label>
            <textarea name="notes" className="form-input" rows={2}
              placeholder="Internal notes about this agreement…" style={{ resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* ── CARD 2: Payment Terms ── */}
      <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: 'rgba(14,123,140,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>💳</div>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink)' }}>Payment Terms</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Amount set per booking — only structure defined here</span>
        </div>
        <div style={{ padding: '1.25rem 1.5rem' }}>

          {/* Payment type selector */}
          <label className="form-label" style={{ display: 'block', marginBottom: 10 }}>Payment Type <span style={{ color: '#E04A4A' }}>*</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {([
              { key: 'advance', icon: '💰', name: 'Advance',  desc: 'Full payment before job', bg: '#EDE9FE' },
              { key: 'daily',   icon: '📅', name: 'Daily',    desc: 'Before each shift day',   bg: 'rgba(14,123,140,0.08)' },
              { key: 'weekly',  icon: '📆', name: 'Weekly',   desc: 'Each week in advance',    bg: '#FEF3C7' },
              { key: 'monthly', icon: '🗓️', name: 'Monthly',  desc: 'Each month in advance',   bg: '#DCFCE7' },
            ] as const).map(pt => (
              <div
                key={pt.key}
                onClick={() => setPaymentType(pt.key)}
                style={{
                  border: `2px solid ${paymentType === pt.key ? 'var(--teal)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '14px 12px', cursor: 'pointer',
                  background: paymentType === pt.key ? 'rgba(14,123,140,0.04)' : '#fff',
                  position: 'relative', transition: 'all 0.15s',
                }}
              >
                {paymentType === pt.key && (
                  <div style={{
                    position: 'absolute', top: 7, right: 8, width: 18, height: 18,
                    background: 'var(--teal)', borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: 800,
                  }}>✓</div>
                )}
                <div style={{ width: 34, height: 34, borderRadius: 8, background: pt.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', marginBottom: 8 }}>{pt.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink)', marginBottom: 2 }}>{pt.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.4 }}>{pt.desc}</div>
              </div>
            ))}
          </div>

          {/* ── Advance rules ── */}
          {paymentType === 'advance' && (
            <div style={{ background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.14)', borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Advance Rules</div>
              <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 12px', fontSize: '0.78rem', color: '#78350F', marginBottom: 14, display: 'flex', gap: 8 }}>
                🔒 Advance has no grace period — missed payment means auto-cancel.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Deadline Before Job</label>
                  <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <input type="number" name="adv_deadline_hrs" defaultValue={6} min={1}
                      style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit' }} />
                    <span style={{ padding: '0 12px', background: 'var(--cream)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--border)' }}>hrs before</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">On Non-Payment</label>
                  <input className="form-input" value="Auto-cancel (locked)" readOnly
                    style={{ background: 'var(--cream)', color: 'var(--muted)', cursor: 'not-allowed' }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Daily rules ── */}
          {paymentType === 'daily' && (
            <div style={{ background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.14)', borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Daily Rules</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <input type="number" name="daily_deadline_hrs" defaultValue={24} min={1} style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit' }} />
                    <span style={suffixStyle}>hrs before</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Grace Period</label>
                  <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <input type="number" name="daily_grace_hrs" defaultValue={2} min={0} style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit' }} />
                    <span style={suffixStyle}>hrs</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cancel After</label>
                  <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <input type="number" name="daily_cancel_misses" defaultValue={2} min={1} style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit' }} />
                    <span style={suffixStyle}>misses</span>
                  </div>
                </div>
              </div>
              <MissedActionSelector value={missedAction} onChange={setMissedAction} />
            </div>
          )}

          {/* ── Weekly rules ── */}
          {paymentType === 'weekly' && (
            <div style={{ background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.14)', borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Weekly Rules</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Payment Day</label>
                  <select name="weekly_payment_day" className="form-input">
                    {['Monday','Tuesday','Wednesday','Thursday','Sunday'].map(d => (
                      <option key={d} value={d.toLowerCase()}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <input type="number" name="weekly_deadline_hrs" defaultValue={72} min={1} style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit' }} />
                    <span style={suffixStyle}>hrs before</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Grace Period</label>
                  <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <input type="number" name="weekly_grace_hrs" defaultValue={6} min={0} style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit' }} />
                    <span style={suffixStyle}>hrs</span>
                  </div>
                </div>
              </div>
              <MissedActionSelector value={missedAction} onChange={setMissedAction} />
            </div>
          )}

          {/* ── Monthly rules ── */}
          {paymentType === 'monthly' && (
            <div style={{ background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.14)', borderRadius: 10, padding: 18 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Monthly Rules</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Billing Date</label>
                  <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <input type="number" name="monthly_billing_day" defaultValue={25} min={1} max={28} style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit' }} />
                    <span style={suffixStyle}>of month</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 3, display: 'block' }}>Day hospital must pay</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Advance Deposit</label>
                  <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <input type="number" name="monthly_advance_days" defaultValue={15} min={0} style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit' }} />
                    <span style={suffixStyle}>days before</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Grace Period</label>
                  <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <input type="number" name="monthly_grace_hrs" defaultValue={24} min={0} style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit' }} />
                    <span style={suffixStyle}>hrs</span>
                  </div>
                </div>
              </div>
              <MissedActionSelector value={missedAction} onChange={setMissedAction} />
            </div>
          )}

          {/* ── Payment Reminders ── */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
              Payment Reminders — send to hospital before deadline
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {reminderHrs.map(h => (
                <span key={h} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                  background: 'rgba(14,123,140,0.1)', color: 'var(--teal)',
                  borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                }} onClick={() => removeReminder(h)}>
                  {h} hrs <span style={{ fontSize: '0.9rem' }}>×</span>
                </span>
              ))}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number" value={newReminder} onChange={e => setNewReminder(e.target.value)}
                  placeholder="hrs"
                  style={{ width: 60, padding: '4px 8px', border: '1.5px dashed var(--teal)', borderRadius: 20, fontSize: '0.78rem', outline: 'none', textAlign: 'center', fontFamily: 'inherit' }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReminder() } }}
                />
                <button type="button" onClick={addReminder}
                  style={{ padding: '4px 10px', border: '1.5px dashed var(--teal)', background: 'transparent', color: 'var(--teal)', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Add
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Push notification + SMS sent at each interval</div>
          </div>

        </div>
      </div>

      {/* ── Action bar ── */}
      <div style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
        padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', bottom: 16, boxShadow: '0 4px 16px rgba(15,23,42,.08)',
      }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          ℹ️ Saving will create a draft. You can preview and send it from the agreement page.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" name="action" value="draft"
            disabled={isPending}
            style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 9, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            {isPending ? '⏳ Saving…' : '💾 Save Draft'}
          </button>
          <button type="submit" name="action" value="approve"
            disabled={isPending}
            style={{ background: 'var(--teal)', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            {isPending ? '⏳ Processing…' : '✓ Approve & Generate →'}
          </button>
        </div>
      </div>
    </form>
  )
}

/* ── Sub-components ── */
function MissedActionSelector({ value, onChange }: { value: string; onChange: (v: 'pause' | 'cancel') => void }) {
  return (
    <div className="form-group" style={{ marginTop: 14 }}>
      <label className="form-label">On Missed Payment</label>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {(['pause', 'cancel'] as const).map(opt => (
          <div key={opt} onClick={() => onChange(opt)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            border: `1.5px solid ${value === opt ? 'var(--teal)' : 'var(--border)'}`,
            borderRadius: 7, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
            color: value === opt ? 'var(--teal)' : 'var(--muted)',
            background: value === opt ? 'rgba(14,123,140,0.05)' : '#fff',
          }}>
            <div style={{
              width: 13, height: 13, borderRadius: '50%',
              border: `2px solid ${value === opt ? 'var(--teal)' : 'var(--border)'}`,
              background: value === opt ? 'var(--teal)' : 'transparent',
              flexShrink: 0,
            }} />
            {opt === 'pause' ? 'Pause Nurse' : 'Cancel Booking'}
          </div>
        ))}
      </div>
    </div>
  )
}

const suffixStyle: React.CSSProperties = {
  padding: '0 10px',
  background: 'var(--cream)',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--muted)',
  display: 'flex',
  alignItems: 'center',
  borderLeft: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}
