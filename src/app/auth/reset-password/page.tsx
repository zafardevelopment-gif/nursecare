'use client'

export const dynamic = 'force-dynamic'

import { useState, useTransition } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form     = new FormData(e.currentTarget)
    const password = form.get('password') as string
    const confirm  = form.get('confirm') as string

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setError(null)
    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/auth/login?message=Password+updated!+Please+sign+in.'), 2000)
      }
    })
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="auth-logo-icon">🏥</div>
          <div className="auth-logo-text">Nurse<span>Care+</span></div>
        </div>

        <h1 className="auth-title">New Password</h1>
        <p className="auth-subtitle">Enter your new password below</p>

        {success ? (
          <div className="auth-success">
            ✅ Password updated! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error"><span>⚠️</span> {error}</div>
            )}

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className="form-input"
                placeholder="Min. 6 characters"
                disabled={isPending}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                name="confirm"
                required
                className="form-input"
                placeholder="Repeat password"
                disabled={isPending}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Updating...' : 'Update Password →'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link href="/auth/login" className="auth-link">Back to Login</Link>
        </p>
      </div>
    </div>
  )
}
