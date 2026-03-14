import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { onboardingAction } from './actions'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function ProviderOnboardingPage({ searchParams }: Props) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const params = await searchParams

  const { data: existing } = await supabase
    .from('nurses')
    .select('status')
    .eq('user_id', user.id)
    .single()

  if (existing?.status === 'approved') {
    redirect('/provider/dashboard')
  }

  return (
    <div className="auth-bg" style={{ alignItems: 'flex-start', padding: '2rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '680px', width: '100%' }}>

        <div className="auth-logo">
          <div className="auth-logo-icon">🏥</div>
          <div className="auth-logo-text">Nurse<span>Care+</span></div>
        </div>

        <h1 className="auth-title" style={{ fontSize: '1.4rem' }}>Complete Your Profile</h1>
        <p className="auth-subtitle">Fill in your details to get approved and start receiving bookings</p>

        {existing?.status === 'pending' && (
          <div className="auth-success" style={{ marginBottom: '1.2rem' }}>
            Your profile is under review. We will notify you once approved.
          </div>
        )}

        {params.error && (
          <div className="auth-error">
            <span>⚠️</span> {decodeURIComponent(params.error)}
          </div>
        )}

        <form action={onboardingAction} className="auth-form" encType="multipart/form-data">

          {/* ── Personal Info ── */}
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--teal)', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Personal Information
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" required className="form-input">
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nationality</label>
              <input type="text" name="nationality" required className="form-input" placeholder="e.g. Saudi, Pakistani" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" name="phone" required className="form-input" placeholder="+966 5X XXX XXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <select name="city" required className="form-input">
                <option value="">Select city</option>
                {['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Tabuk','Abha'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Years of Experience</label>
              <input type="number" name="experience" required min="0" max="50" className="form-input" placeholder="e.g. 5" />
            </div>
            <div className="form-group">
              <label className="form-label">Specialization</label>
              <input type="text" name="specialization" className="form-input" placeholder="e.g. ICU Care, Elderly Care" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">SCHS License Number</label>
            <input type="text" name="license_no" required className="form-input" placeholder="SCHS-1234567" />
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea name="bio" className="form-input" rows={3} placeholder="Tell patients about your experience..." style={{ resize: 'vertical' }} />
          </div>

          {/* ── Pricing ── */}
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--teal)', margin: '1.2rem 0 0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Pricing (SAR)
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
            Set your rates. Admin will review and add platform commission before publishing.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Hourly Rate (SAR)</label>
              <input type="number" name="hourly_rate" min="0" step="0.01" className="form-input" placeholder="e.g. 100" />
            </div>
            <div className="form-group">
              <label className="form-label">Daily Rate (SAR)</label>
              <input type="number" name="daily_rate" min="0" step="0.01" className="form-input" placeholder="e.g. 700" />
            </div>
          </div>

          {/* ── Documents ── */}
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--teal)', margin: '1.2rem 0 0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Document Uploads
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
            Upload clear copies. Accepted formats: PDF, JPG, PNG (max 5 MB each).
          </p>

          {[
            { name: 'doc_biodata',             label: 'Biodata / Resume',     accept: '.pdf,.doc,.docx' },
            { name: 'doc_national_id',         label: 'National ID / Iqama',  accept: '.pdf,.jpg,.jpeg,.png' },
            { name: 'doc_passport',            label: 'Passport',             accept: '.pdf,.jpg,.jpeg,.png' },
            { name: 'doc_photo',               label: 'Passport Size Photo',  accept: '.jpg,.jpeg,.png' },
            { name: 'doc_nursing_certificate', label: 'Nursing Certificate',  accept: '.pdf,.jpg,.jpeg,.png' },
            { name: 'doc_nursing_license',     label: 'Nursing License',      accept: '.pdf,.jpg,.jpeg,.png' },
          ].map(({ name, label, accept }) => (
            <div key={name} className="form-group">
              <label className="form-label">{label}</label>
              <input
                type="file"
                name={name}
                accept={accept}
                className="form-input"
                style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
              />
            </div>
          ))}

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
            Submit for Review →
          </button>
        </form>

        <p className="auth-footer">
          <Link href="/provider/dashboard" className="auth-link">Back to Dashboard</Link>
        </p>
      </div>
    </div>
  )
}
