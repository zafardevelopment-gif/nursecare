'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { onboardingAction } from './actions'

const CITIES = ['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Tabuk','Abha']

const DOC_INPUTS = [
  { name: 'doc_biodata',             label: 'Biodata / Resume',    accept: '.pdf,.doc,.docx' },
  { name: 'doc_national_id',         label: 'National ID / Iqama', accept: '.pdf,.jpg,.jpeg,.png' },
  { name: 'doc_passport',            label: 'Passport',            accept: '.pdf,.jpg,.jpeg,.png' },
  { name: 'doc_photo',               label: 'Passport Size Photo', accept: '.jpg,.jpeg,.png' },
  { name: 'doc_nursing_certificate', label: 'Nursing Certificate', accept: '.pdf,.jpg,.jpeg,.png' },
  { name: 'doc_nursing_license',     label: 'Nursing License',     accept: '.pdf,.jpg,.jpeg,.png' },
]

export default function OnboardingForm({ isPending: isAlreadyPending }: { isPending?: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await onboardingAction(fd)
      if (res?.error) setError(res.error)
    })
  }

  const inp = 'form-input'
  const grp = 'form-group'

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="auth-form" encType="multipart/form-data">

      {error && (
        <div className="auth-error" style={{ marginBottom: '1rem' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Personal Info */}
      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--teal)', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Personal Information
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className={grp}>
          <label className="form-label">Gender</label>
          <select name="gender" required className={inp}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className={grp}>
          <label className="form-label">Nationality</label>
          <input type="text" name="nationality" required className={inp} placeholder="e.g. Saudi, Pakistani" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className={grp}>
          <label className="form-label">Phone Number</label>
          <input type="tel" name="phone" required className={inp} placeholder="+966 5X XXX XXXX" />
        </div>
        <div className={grp}>
          <label className="form-label">City</label>
          <select name="city" required className={inp}>
            <option value="">Select city</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className={grp}>
          <label className="form-label">Years of Experience</label>
          <input type="number" name="experience" required min="0" max="50" className={inp} placeholder="e.g. 5" />
        </div>
        <div className={grp}>
          <label className="form-label">Specialization</label>
          <input type="text" name="specialization" className={inp} placeholder="e.g. ICU Care, Elderly Care" />
        </div>
      </div>

      <div className={grp}>
        <label className="form-label">SCHS License Number</label>
        <input type="text" name="license_no" required className={inp} placeholder="SCHS-1234567" />
      </div>

      <div className={grp}>
        <label className="form-label">Bio</label>
        <textarea name="bio" className={inp} rows={3} placeholder="Tell patients about your experience..." style={{ resize: 'vertical' }} />
      </div>

      {/* Pricing */}
      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--teal)', margin: '1.2rem 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Your Pricing (SAR)
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
        Set your rates. Admin will review and add platform commission before publishing.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className={grp}>
          <label className="form-label">Hourly Rate (SAR)</label>
          <input type="number" name="hourly_rate" min="0" step="0.01" className={inp} placeholder="e.g. 100" />
        </div>
        <div className={grp}>
          <label className="form-label">Daily Rate (SAR)</label>
          <input type="number" name="daily_rate" min="0" step="0.01" className={inp} placeholder="e.g. 700" />
        </div>
      </div>

      {/* Documents */}
      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--teal)', margin: '1.2rem 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Document Uploads
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
        Upload clear copies. Accepted formats: PDF, JPG, PNG (max 5 MB each).
      </p>
      {DOC_INPUTS.map(({ name, label, accept }) => (
        <div key={name} className={grp}>
          <label className="form-label">{label}</label>
          <input type="file" name={name} accept={accept} className={inp}
            style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }} />
        </div>
      ))}

      <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }} disabled={isPending}>
        {isPending ? 'Submitting…' : 'Submit for Review →'}
      </button>
    </form>
  )
}
