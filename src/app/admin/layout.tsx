import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import SidebarProfile from '@/components/SidebarProfile'
import SidebarMenu from '@/components/SidebarMenu'
import MobileSidebar from '@/components/MobileSidebar'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import Link from 'next/link'

const adminMenu = [
  { icon: '🏠', label: 'Dashboard',        href: '/admin/dashboard' },
  { icon: '👩‍⚕️', label: 'Nurse Approvals',  href: '/admin/nurses' },
  { icon: '🔄', label: 'Profile Updates',  href: '/admin/nurse-updates' },
  { icon: '📋', label: 'Bookings',          href: '/admin/bookings?type=patient' },
  { icon: '🏥', label: 'Hospitals',          href: '/admin/hospitals' },
  { icon: '👩‍⚕️', label: 'Hospital Bookings', href: '/admin/hospital-bookings' },
  { icon: '🌴', label: 'Leave Requests',      href: '/admin/leave' },
  { icon: '⚠️', label: 'Disputes',           href: '/admin/disputes' },
  { icon: '📣', label: 'Complaints',          href: '/admin/complaints' },
  { icon: '📄', label: 'Agreements',        href: '/admin/agreements' },
  { icon: '🪪', label: 'ID Cards',          href: '/admin/nurses/id-cards' },
  { icon: '👥', label: 'Users',             href: '/admin/users' },
  { icon: '🩺', label: 'Service Master',     href: '/admin/services' },
  { icon: '📊', label: 'Activity Log',      href: '/admin/activity' },
  { icon: '🔔', label: 'Notifications',     href: '/admin/notifications' },
  { icon: '⚙️', label: 'Settings',          href: '/admin/settings' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('admin')
  const supabase = await createSupabaseServerClient()
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/admin/dashboard'

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  const adminMenuWithBadge = adminMenu.map(item =>
    item.href === '/admin/notifications' ? { ...item, badge: unreadCount ?? 0 } : item
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <MobileSidebar logoHref="/admin/dashboard" topbarRight={<NotificationBell role="admin" />}>
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
          <Link href="/admin/dashboard" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
              Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
            </span>
          </Link>
          {/* Desktop bell — shown beside logo in sidebar header on desktop */}
          <div style={{ marginLeft: 'auto' }}>
            <NotificationBell role="admin" />
          </div>
        </div>

        <SidebarProfile
          name={user.full_name}
          email={user.email}
          role="admin"
          avatarUrl={user.avatar_url}
        />

        <SidebarMenu items={adminMenuWithBadge} activePath={pathname} />

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
