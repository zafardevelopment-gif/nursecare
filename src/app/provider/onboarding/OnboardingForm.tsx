'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { onboardingAction } from './actions'

const CITIES = ['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Tabuk','Abha']

const NATIONALITIES = [
  'Saudi','Pakistani','Indian','Filipino','Egyptian','Jordanian','Sudanese','Yemeni',
  'Syrian','Lebanese','Bangladeshi','Nepali','Sri Lankan','Indonesian','Nigerian',
  'Kenyan','Ethiopian','Ghanaian','British','American','Canadian','Australian','Other',
]

const ID_TYPES = [
  { value: 'iqama',       label: 'Iqama (Resident ID)' },
  { value: 'national_id', label: 'National ID' },
  { value: 'passport',    label: 'Passport' },
]

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
  const [idType, setIdType] = useState('')
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

      <div className="form-grid-2col">
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
          <select name="nationality" required className={inp}>
            <option value="">Select nationality</option>
            {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid-2col">
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

      <div className="form-grid-2col">
        <div className={grp}>
          <label className="form-label">Years of Experience</label>
          <input type="number" name="experience" required min="0" max="50" className={inp} placeholder="e.g. 5" />
        </div>
        <div className={grp}>
          <label className="form-label">Specialization</label>
          <input type="text" name="specialization" className={inp} placeholder="e.g. ICU Care, Elderly Care" />
        </div>
      </div>

      <div className="form-grid-2col">
        <div className={grp}>
          <label className="form-label">SCHS License Number</label>
          <input type="text" name="license_no" required className={inp} placeholder="SCHS-1234567" />
        </div>
        <div className={grp}>
          <label className="form-label">SCHS License Expiry</label>
          <input type="date" name="license_expiry" className={inp} />
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--teal)', margin: '1.2rem 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Identity Document
      </div>

      <div className={grp}>
        <label className="form-label">ID Type</label>
        <select name="id_type" required className={inp} value={idType} onChange={e => setIdType(e.target.value)}>
          <option value="">Select ID type</option>
          {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {idType && (
        <div className="form-grid-2col">
          <div className={grp}>
            <label className="form-label">{ID_TYPES.find(t => t.value === idType)?.label} Number</label>
            <input type="text" name="id_number" required className={inp} placeholder="Enter ID number" />
          </div>
          <div className={grp}>
            <label className="form-label">ID Expiry Date</label>
            <input type="date" name="id_expiry" required className={inp} />
          </div>
        </div>
      )}

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
      <div className="form-grid-2col">
        <div className={grp}>
          <label className="form-label">Hourly Patient Rate (SAR)</label>
          <input type="number" name="hourly_rate" min="0" step="0.01" className={inp} placeholder="e.g. 100" />
        </div>
        <div className={grp}>
          <label className="form-label">Daily Shift Rate (SAR)</label>
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
