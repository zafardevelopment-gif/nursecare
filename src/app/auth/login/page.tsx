import Link from 'next/link'
import { loginAction } from './actions'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; redirect?: string; message?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const errorMsg   = params.error
  const message    = params.message
  const redirectTo = params.redirect ?? ''

  return (
    <div className="auth-bg">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🏥</div>
          <div className="auth-logo-text">
            Nurse<span>Care+</span>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {message && (
          <div className="auth-success">
            {decodeURIComponent(message)}
          </div>
        )}
        {errorMsg && (
          <div className="auth-error">
            <span>⚠️</span> {decodeURIComponent(errorMsg)}
          </div>
        )}

        {/* Form */}
        <form action={loginAction} className="auth-form">
          <input type="hidden" name="redirect" value={redirectTo} />

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

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="form-input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary">
            Sign In →
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="auth-link">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
