import { requireRole } from '@/lib/auth'
import { headers } from 'next/headers'
import SidebarProfile from '@/components/SidebarProfile'
import SidebarMenu from '@/components/SidebarMenu'
import Link from 'next/link'

const adminMenu = [
  { icon: '🏠', label: 'Dashboard',       href: '/admin/dashboard' },
  { icon: '👩‍⚕️', label: 'Nurse Approvals', href: '/admin/nurses' },
  { icon: '📋', label: 'Bookings',         href: '/admin/bookings' },
  { icon: '👥', label: 'Users',            href: '/admin/users' },
  { icon: '⚙️', label: 'Settings',         href: '/admin/settings' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('admin')
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/admin/dashboard'

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
          <Link href="/admin/dashboard" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
              Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
            </span>
          </Link>
        </div>

        {/* Profile */}
        <SidebarProfile
          name={user.full_name}
          email={user.email}
          role="admin"
          avatarUrl={user.avatar_url}
        />

        {/* Menu */}
        <SidebarMenu items={adminMenu} activePath={pathname} />
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 260, flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
