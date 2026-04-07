import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import HospitalOnboardingForm from './HospitalOnboardingForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function HospitalOnboardingPage({ searchParams }: Props) {
  const user = await requireRole('hospital')
  const supabase = await createSupabaseServerClient()
  const params = await searchParams

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('status')
    .eq('user_id', user.id)
    .single()

  // Already submitted — redirect based on status
  if (hospital?.status === 'approved' || hospital?.status === 'agreement_pending' || hospital?.status === 'active') {
    redirect('/hospital/dashboard')
  }

  const isPending = hospital?.status === 'pending'

  return (
    <div className="auth-bg" style={{ alignItems: 'flex-start', padding: '2rem 1rem' }}>
      <div className="auth-card" style={{ maxWidth: '700px', width: '100%' }}>

        <div className="auth-logo">
          <div className="auth-logo-icon">🏥</div>
          <div className="auth-logo-text">Nurse<span>Care+</span></div>
        </div>

        <h1 className="auth-title" style={{ fontSize: '1.4rem' }}>Hospital Registration</h1>
        <p className="auth-subtitle">Complete your hospital profile to get approved and start hiring nurses</p>

        {params.error && (
          <div className="auth-error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span> {decodeURIComponent(params.error)}
          </div>
        )}

        {isPending && (
          <div className="auth-success" style={{ marginBottom: '1.2rem' }}>
            ⏳ Your profile is under review. We will notify you once approved.
          </div>
        )}

        {/* Status steps */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: 'var(--cream)', borderRadius: 10, padding: '14px 16px',
          marginBottom: '1.5rem', border: '1px solid var(--border)',
        }}>
          {[
            { num: '1', label: 'Register', done: true },
            { num: '2', label: 'Admin Review', done: isPending },
            { num: '3', label: 'Agreement', done: false },
            { num: '4', label: 'Active', done: false },
          ].map((s, i, arr) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: s.done ? 'var(--teal)' : 'var(--border)',
                  color: s.done ? '#fff' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: 800,
                }}>
                  {s.done ? '✓' : s.num}
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: s.done ? 'var(--teal)' : 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div style={{ flex: 1, height: 2, background: s.done ? 'var(--teal)' : 'var(--border)', margin: '0 6px', marginBottom: 20 }} />
              )}
            </div>
          ))}
        </div>

        {!isPending ? (
          <HospitalOnboardingForm />
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
              Profile Submitted
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              Our admin team is reviewing your details. You&apos;ll receive a notification once approved.
            </div>
          </div>
        )}

        <p className="auth-footer">
          <Link href="/hospital/dashboard" className="auth-link">Back to Dashboard</Link>
        </p>
      </div>
    </div>
  )
}
