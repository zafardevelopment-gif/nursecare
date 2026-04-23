import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import SidebarProfile from '@/components/SidebarProfile'
import SidebarMenu from '@/components/SidebarMenu'
import MobileSidebar from '@/components/MobileSidebar'
import NotificationBell from '@/components/NotificationBell'
import AvailabilityToggle from '@/components/AvailabilityToggle'
import ThemeToggle from '@/components/ThemeToggle'
import Link from 'next/link'

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/provider/dashboard'

  const [{ data: nurse }, { count: unreadCount }] = await Promise.all([
    supabase
      .from('nurses')
      .select('specialization, status, city, is_available, nurse_documents(doc_type, file_url)')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  const photoUrl = (nurse?.nurse_documents as any[])?.find(d => d.doc_type === 'photo')?.file_url ?? null

  const { count: pendingBookings } = nurse?.status === 'approved'
    ? await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('city', nurse.city ?? '')
    : { count: 0 }

  const providerMenu = [
    { icon: '🏠', label: 'Dashboard',    href: '/provider/dashboard' },
    { icon: '📝', label: 'My Profile',   href: nurse?.status ? '/provider/profile' : '/provider/onboarding' },
    { icon: '📅', label: 'Bookings',     href: '/provider/bookings', badge: pendingBookings ?? 0 },
    { icon: '🩺', label: 'My Services',  href: '/provider/services' },
    { icon: '🕐', label: 'Availability', href: '/provider/availability' },
    { icon: '🌴', label: 'Leave',        href: '/provider/leave' },
    { icon: '💰', label: 'Earnings',     href: '/provider/earnings' },
    { icon: '📣', label: 'Complaints',   href: '/provider/complaints' },
    { icon: '💬', label: 'Messages',     href: '/provider/messages' },
    { icon: '📄', label: 'Documents',    href: '/provider/documents' },
    { icon: '📋', label: 'Agreements',   href: '/provider/agreements' },
    { icon: '🪪', label: 'ID Card',      href: '/provider/id-card' },
    { icon: '🔔', label: 'Notifications', href: '/provider/notifications', badge: unreadCount ?? 0 },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <MobileSidebar logoHref="/provider/dashboard" topbarRight={<NotificationBell role="provider" />}>
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
          <Link href="/provider/dashboard" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
              Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
            </span>
          </Link>
          <div style={{ marginLeft: 'auto' }}>
            <NotificationBell role="provider" />
          </div>
        </div>

        <SidebarProfile
          name={user.full_name}
          email={user.email}
          role="provider"
          avatarUrl={user.avatar_url}
          nurseData={nurse ? { ...nurse, photoUrl } : null}
        />

        <SidebarMenu items={providerMenu} activePath={pathname} />

        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ padding: '0.5rem 0.75rem 0' }}>
            <AvailabilityToggle initialValue={nurse?.is_available ?? true} />
          </div>
          <div style={{ padding: '0.5rem 0.75rem' }}>
            <ThemeToggle />
          </div>
        </div>
      </MobileSidebar>

      <main className="app-main" style={{ marginLeft: 260, flex: 1, background: 'var(--shell-bg)', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
