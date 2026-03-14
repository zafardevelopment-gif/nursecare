import Link from 'next/link'
import { signupAction } from './actions'

interface SignupPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const errorMsg = params.error

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ maxWidth: '480px' }}>

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🏥</div>
          <div className="auth-logo-text">
            Nurse<span>Care+</span>
          </div>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join Saudi Arabia's home healthcare platform</p>

        {/* Error */}
        {errorMsg && (
          <div className="auth-error">
            <span>⚠️</span> {decodeURIComponent(errorMsg)}
          </div>
        )}

        {/* Role selector — shown first for clarity */}
        <form action={signupAction} className="auth-form">

          {/* Role */}
          <div className="form-group">
            <label className="form-label">I am a</label>
            <div className="role-grid">
              <label className="role-option">
                <input type="radio" name="role" value="patient" defaultChecked required />
                <div className="role-card">
                  <span className="role-icon">🤲</span>
                  <span className="role-name">Patient / Family</span>
                  <span className="role-desc">I need home care for myself or a family member</span>
                </div>
              </label>
              <label className="role-option">
                <input type="radio" name="role" value="provider" required />
                <div className="role-card">
                  <span className="role-icon">👩‍⚕️</span>
                  <span className="role-name">Healthcare Provider</span>
                  <span className="role-desc">I am a nurse, doctor, or caregiver</span>
                </div>
              </label>
            </div>
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="full_name"
              required
              autoComplete="name"
              className="form-input"
              placeholder="Abdullah Al-Harbi"
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="form-input"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="new-password"
              className="form-input"
              placeholder="Minimum 8 characters"
              minLength={8}
            />
          </div>

          <button type="submit" className="btn-primary">
            Create Account →
          </button>

          <p className="auth-terms">
            By registering, you agree to our{' '}
            <Link href="/terms" className="auth-link">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="auth-link">Privacy Policy</Link>.
          </p>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/auth/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
