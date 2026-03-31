import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import SidebarProfile from '@/components/SidebarProfile'
import SidebarMenu from '@/components/SidebarMenu'
import AvailabilityToggle from '@/components/AvailabilityToggle'
import Link from 'next/link'

const providerMenu = [
  { icon: '🏠', label: 'Dashboard',        href: '/provider/dashboard' },
  { icon: '📝', label: 'My Profile',        href: '/provider/onboarding' },
  { icon: '📅', label: 'Bookings',          href: '/provider/bookings' },
  { icon: '💰', label: 'Earnings',          href: '/provider/earnings' },
  { icon: '💬', label: 'Messages',          href: '/provider/messages' },
  { icon: '📄', label: 'Documents',         href: '/provider/documents' },
]

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/provider/dashboard'

  const { data: nurse } = await supabase
    .from('nurses')
    .select('specialization, status, city, is_available, nurse_documents(doc_type, file_url)')
    .eq('user_id', user.id)
    .single()

  const photoUrl = (nurse?.nurse_documents as any[])?.find(d => d.doc_type === 'photo')?.file_url ?? null

  const { count: pendingBookings } = nurse?.status === 'approved'
    ? await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('city', nurse.city ?? '')
    : { count: 0 }

  const providerMenuWithBadge = [
    { icon: '🏠', label: 'Dashboard',    href: '/provider/dashboard' },
    { icon: '📝', label: 'My Profile',   href: nurse?.status ? '/provider/profile' : '/provider/onboarding' },
    { icon: '📅', label: 'Bookings',     href: '/provider/bookings', badge: pendingBookings ?? 0 },
    { icon: '🕐', label: 'Availability', href: '/provider/availability' },
    { icon: '💰', label: 'Earnings',     href: '/provider/earnings' },
    { icon: '💬', label: 'Messages',     href: '/provider/messages' },
    { icon: '📄', label: 'Documents',    href: '/provider/documents' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 260,
        background: '#05111A',
        minHeight: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          padding: '1.2rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 34,
            height: 34,
            background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}>🏥</div>
          <Link href="/provider/dashboard" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
              Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
            </span>
          </Link>
        </div>

        {/* Profile */}
        <SidebarProfile
          name={user.full_name}
          email={user.email}
          role="provider"
          avatarUrl={user.avatar_url}
          nurseData={nurse ? { ...nurse, photoUrl } : null}
        />

        {/* Menu */}
        <SidebarMenu items={providerMenuWithBadge} activePath={pathname} />

        {/* Available for Bookings toggle */}
        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <AvailabilityToggle initialValue={nurse?.is_available ?? true} />
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 260, flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
