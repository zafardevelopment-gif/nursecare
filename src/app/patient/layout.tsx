import { requireRole } from '@/lib/auth'
import { headers } from 'next/headers'
import SidebarProfile from '@/components/SidebarProfile'
import SidebarMenu from '@/components/SidebarMenu'
import Link from 'next/link'

const patientMenu = [
  { icon: '🏠', label: 'Dashboard',   href: '/patient/dashboard' },
  { icon: '🏥', label: 'Book a Nurse', href: '/patient/request' },
  { icon: '📅', label: 'My Bookings',  href: '/patient/bookings' },
  { icon: '💬', label: 'Messages',     href: '/patient/messages' },
  { icon: '👤', label: 'My Profile',   href: '/patient/profile' },
]

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('patient')
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/patient/dashboard'

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
          <Link href="/patient/dashboard" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
              Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
            </span>
          </Link>
        </div>

        {/* Profile */}
        <SidebarProfile
          name={user.full_name}
          email={user.email}
          role="patient"
          avatarUrl={user.avatar_url}
        />

        {/* Menu */}
        <SidebarMenu items={patientMenu} activePath={pathname} />
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 260, flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
