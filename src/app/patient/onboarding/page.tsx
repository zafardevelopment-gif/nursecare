import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AddressOnboardingClient from './AddressOnboardingClient'

export const dynamic = 'force-dynamic'

export default async function PatientOnboardingPage() {
  const user = await requireRole('patient')
  const serviceClient = createSupabaseServiceRoleClient()

  // If already completed, skip to dashboard
  const { data: profile } = await serviceClient
    .from('patient_profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()

  if (profile?.onboarding_completed) {
    redirect('/patient/dashboard')
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--shell-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15,
          }}>🏥</div>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)' }}>
            Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Welcome, <strong style={{ color: 'var(--ink)' }}>{user.full_name}</strong>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '2rem 1.5rem', overflowY: 'auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(14,123,140,0.08)', border: '1px solid rgba(14,123,140,0.2)',
            color: '#0E7B8C', padding: '6px 16px', borderRadius: 50,
            fontSize: '0.78rem', fontWeight: 700, marginBottom: 14,
          }}>
            🏥 One-time setup · Takes 2 minutes
          </div>
          <h1 style={{
            fontFamily: 'Georgia,serif',
            fontSize: 'clamp(1.4rem, 3vw, 2rem)',
            fontWeight: 800, color: 'var(--ink)',
            margin: '0 0 8px',
            lineHeight: 1.25,
          }}>
            Set Up Your Service Address
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem', margin: 0, maxWidth: 480, marginInline: 'auto' }}>
            Tell us where you'd like nurses to visit. You can add more addresses anytime from your profile.
          </p>
        </div>

        {/* Onboarding form */}
        <AddressOnboardingClient userName={user.full_name} apiKey={apiKey} />

        {/* Spinner keyframe */}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  )
}
