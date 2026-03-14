import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
        <h1 className="auth-title">Access Denied</h1>
        <p className="auth-subtitle" style={{ marginBottom: '2rem' }}>
          You don&apos;t have permission to view this page.
        </p>
        <Link href="/auth/login" className="btn-primary" style={{ display: 'inline-block' }}>
          ← Back to Login
        </Link>
      </div>
    </div>
  )
}
