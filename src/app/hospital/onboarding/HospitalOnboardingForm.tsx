'use client'

import { useState, useTransition } from 'react'
import { hospitalOnboardingAction } from './actions'

const CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina', 'Khobar', 'Tabuk', 'Abha']

export default function HospitalOnboardingForm() {
  const [error, setError]     = useState<string | null>(null)
  const [isPending, startTx]  = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTx(async () => {
      const res = await hospitalOnboardingAction(fd)
      if (res?.error) setError(res.error)
    })
  }

  const inp = 'form-input'
  const grp = 'form-group'

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && (
        <div className="auth-error" style={{ marginBottom: '1rem' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Section: Hospital Details */}
      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--teal)', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
        🏥 Hospital Information
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className={grp} style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Hospital Name <span style={{ color: '#E04A4A' }}>*</span></label>
          <input type="text" name="hospital_name" required className={inp} placeholder="Al Noor Medical Center" />
        </div>
        <div className={grp}>
          <label className="form-label">License / CR Number</label>
          <input type="text" name="license_cr" className={inp} placeholder="MOH-2024-RYD-0192" />
        </div>
        <div className={grp}>
          <label className="form-label">City <span style={{ color: '#E04A4A' }}>*</span></label>
          <select name="city" required className={inp}>
            <option value="">Select city</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={grp} style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Address</label>
          <input type="text" name="address" className={inp} placeholder="King Fahad Road, Al Olaya District" />
        </div>
      </div>

      {/* Section: Contact */}
      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--teal)', margin: '1.2rem 0 0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
        👤 Contact Person
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className={grp}>
          <label className="form-label">Contact Person <span style={{ color: '#E04A4A' }}>*</span></label>
          <input type="text" name="contact_person" required className={inp} placeholder="Dr. Ahmed Al-Rashidi" />
        </div>
        <div className={grp}>
          <label className="form-label">Designation</label>
          <input type="text" name="designation" className={inp} placeholder="Director of Operations" />
        </div>
        <div className={grp}>
          <label className="form-label">Contact Email <span style={{ color: '#E04A4A' }}>*</span></label>
          <input type="email" name="email" required className={inp} placeholder="operations@hospital.sa" />
        </div>
        <div className={grp}>
          <label className="form-label">Phone Number <span style={{ color: '#E04A4A' }}>*</span></label>
          <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <span style={{ padding: '0 12px', background: 'var(--cream)', color: 'var(--muted)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>+966</span>
            <input type="tel" name="phone" required
              style={{ flex: 1, border: 'none', outline: 'none', padding: '10px 12px', fontSize: '0.88rem', fontFamily: 'inherit', color: 'var(--ink)', background: 'transparent' }}
              placeholder="50 234 5678" />
          </div>
        </div>
      </div>

      {/* Section: Scope */}
      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--teal)', margin: '1.2rem 0 0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
        📋 Scope of Services
      </div>

      <div className={grp}>
        <label className="form-label">Describe what nursing services you need</label>
        <textarea
          name="scope_of_services"
          className={inp}
          rows={3}
          placeholder="e.g. ICU and general ward nursing only. Maximum 10 concurrent nurses at any time."
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Info box */}
      <div style={{
        background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.2)',
        borderRadius: 9, padding: '12px 14px', fontSize: '0.8rem', color: 'var(--teal)',
        marginTop: '0.5rem', marginBottom: '0.5rem', display: 'flex', gap: 8,
      }}>
        <span>ℹ️</span>
        <span>After submission, our admin team will review your profile. You will be notified once approved. Only approved hospitals can receive agreements and hire nurses.</span>
      </div>

      <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }} disabled={isPending}>
        {isPending ? 'Submitting…' : 'Submit for Review →'}
      </button>
    </form>
  )
}
