import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import SidebarProfile from '@/components/SidebarProfile'
import SidebarMenu from '@/components/SidebarMenu'
import MobileSidebar from '@/components/MobileSidebar'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import Link from 'next/link'

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('hospital')
  const supabase = await createSupabaseServerClient()
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/hospital/dashboard'

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  const hospitalMenu = [
    { icon: '🏠', label: 'Dashboard',       href: '/hospital/dashboard' },
    { icon: '📄', label: 'Agreements',      href: '/hospital/agreements' },
    { icon: '🏢', label: 'Departments',     href: '/hospital/departments' },
    { icon: '👩‍⚕️', label: 'Book Nurses',     href: '/hospital/booking' },
    { icon: '🗓️', label: 'Shift Schedule',  href: '/hospital/schedule' },
    { icon: '💬', label: 'Messages',        href: '/hospital/messages' },
    { icon: '📣', label: 'Complaints',      href: '/hospital/complaints' },
    { icon: '🔔', label: 'Notifications',   href: '/hospital/notifications', badge: unreadCount ?? 0 },
    { icon: '👤', label: 'My Profile',      href: '/hospital/profile' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <MobileSidebar logoHref="/hospital/dashboard" topbarRight={<NotificationBell role="hospital" />}>
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
          <Link href="/hospital/dashboard" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
              Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
            </span>
          </Link>
          <div style={{ marginLeft: 'auto' }}>
            <NotificationBell role="hospital" />
          </div>
        </div>

        <SidebarProfile
          name={user.full_name}
          email={user.email}
          role="hospital"
          avatarUrl={user.avatar_url}
        />

        <SidebarMenu items={hospitalMenu} activePath={pathname} />

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
