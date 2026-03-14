import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { onboardingAction } from './actions'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string; }>
}

export default async function ProviderOnboardingPage({ searchParams }: Props) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const params = await searchParams

  // Check if already submitted
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
      <div className="auth-card" style={{ maxWidth: '600px', width: '100%' }}>

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

        <form action={onboardingAction} className="auth-form">

          <div className="form-group">
            <label className="form-label">City</label>
            <select name="city" required className="form-input">
              <option value="">Select your city</option>
              <option value="Riyadh">Riyadh</option>
              <option value="Jeddah">Jeddah</option>
              <option value="Dammam">Dammam</option>
              <option value="Mecca">Mecca</option>
              <option value="Medina">Medina</option>
              <option value="Khobar">Khobar</option>
              <option value="Tabuk">Tabuk</option>
              <option value="Abha">Abha</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              name="phone"
              required
              className="form-input"
              placeholder="+966 5X XXX XXXX"
            />
          </div>

          <div className="form-group">
            <label className="form-label">SCHS License Number</label>
            <input
              type="text"
              name="license_no"
              required
              className="form-input"
              placeholder="SCHS-1234567"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Years of Experience</label>
              <input
                type="number"
                name="experience"
                required
                min="0"
                max="50"
                className="form-input"
                placeholder="e.g. 5"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Shift Rate (SAR)</label>
              <input
                type="number"
                name="shift_rate"
                required
                min="0"
                className="form-input"
                placeholder="e.g. 280"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Specialties</label>
            <input
              type="text"
              name="specialties"
              className="form-input"
              placeholder="e.g. ICU Care, Elderly Care, Post-Surgery"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              name="bio"
              required
              className="form-input"
              rows={4}
              placeholder="Tell patients about your experience and how you can help..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <button type="submit" className="btn-primary">
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
