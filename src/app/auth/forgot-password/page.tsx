import Link from 'next/link'
import { forgotPasswordAction } from './actions'

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const params  = await searchParams
  const error   = params.error
  const message = params.message

  return (
    <div className="auth-bg">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="auth-logo-icon">🏥</div>
          <div className="auth-logo-text">Nurse<span>Care+</span></div>
        </div>

        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>

        {message && (
          <div className="auth-success">{decodeURIComponent(message)}</div>
        )}
        {error && (
          <div className="auth-error"><span>⚠️</span> {decodeURIComponent(error)}</div>
        )}

        {!message && (
          <form action={forgotPasswordAction} className="auth-form">
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

            <button type="submit" className="btn-primary">
              Send Reset Link →
            </button>
          </form>
        )}

        <p className="auth-footer">
          Remember your password?{' '}
          <Link href="/auth/login" className="auth-link">Back to Login</Link>
        </p>
      </div>
    </div>
  )
}
