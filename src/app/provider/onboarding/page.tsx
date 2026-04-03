import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import OnboardingForm from './OnboardingForm'
import Link from 'next/link'

export default async function ProviderOnboardingPage() {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

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

        <OnboardingForm />

        <p className="auth-footer">
          <Link href="/provider/dashboard" className="auth-link">Back to Dashboard</Link>
        </p>
      </div>
    </div>
  )
}
