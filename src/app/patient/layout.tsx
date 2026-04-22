import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import SidebarProfile from '@/components/SidebarProfile'
import SidebarMenu from '@/components/SidebarMenu'
import MobileSidebar from '@/components/MobileSidebar'
import ThemeToggle from '@/components/ThemeToggle'
import Link from 'next/link'

const patientMenu = [
  { icon: '🏠', label: 'Dashboard',    href: '/patient/dashboard' },
  { icon: '🏥', label: 'Book a Nurse', href: '/patient/booking' },
  { icon: '📅', label: 'My Bookings',  href: '/patient/bookings' },
  { icon: '💬', label: 'Messages',     href: '/patient/messages' },
  { icon: '📣', label: 'Complaints',   href: '/patient/complaints' },
  { icon: '👤', label: 'My Profile',   href: '/patient/profile' },
]

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('patient')
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/patient/dashboard'

  // Onboarding page renders its own full-screen layout — skip sidebar
  if (pathname.startsWith('/patient/onboarding')) {
    return <>{children}</>
  }

  // Block dashboard access until onboarding is complete
  // Gracefully handle if patient_profiles table doesn't exist yet
  try {
    const serviceClient = createSupabaseServiceRoleClient()
    const { data: profile, error } = await serviceClient
      .from('patient_profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single()

    if (!error && profile !== null && !profile.onboarding_completed) {
      redirect('/patient/onboarding')
    }
  } catch {
    // Table may not exist yet — allow access without redirect
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <MobileSidebar logoHref="/patient/dashboard">
        {/* Logo */}
        <div style={{
          padding: '1.2rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 34, height: 34,
            background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🏥</div>
          <Link href="/patient/dashboard" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
              Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
            </span>
          </Link>
        </div>

        <SidebarProfile
          name={user.full_name}
          email={user.email}
          role="patient"
          avatarUrl={user.avatar_url}
        />

        <SidebarMenu items={patientMenu} activePath={pathname} />

        <div style={{ padding: '0.75rem', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <ThemeToggle />
        </div>
      </MobileSidebar>

      <main className="app-main" style={{ marginLeft: 260, flex: 1, background: 'var(--shell-bg)', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
