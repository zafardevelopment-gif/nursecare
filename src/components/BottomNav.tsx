'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  icon: string
  label: string
  matchPrefix?: string
}

const PATIENT_NAV: NavItem[] = [
  { href: '/patient/dashboard',     icon: '🏠', label: 'Home' },
  { href: '/patient/booking',       icon: '➕', label: 'Book' },
  { href: '/patient/bookings',      icon: '📋', label: 'Bookings',      matchPrefix: '/patient/bookings' },
  { href: '/patient/notifications', icon: '🔔', label: 'Alerts' },
  { href: '/patient/reports',       icon: '👤', label: 'Profile' },
]

const PROVIDER_NAV: NavItem[] = [
  { href: '/provider/dashboard',     icon: '🏠', label: 'Home' },
  { href: '/provider/bookings',      icon: '📥', label: 'Jobs',          matchPrefix: '/provider/bookings' },
  { href: '/provider/availability',  icon: '📅', label: 'Schedule' },
  { href: '/provider/notifications', icon: '🔔', label: 'Alerts' },
  { href: '/provider/profile',       icon: '👤', label: 'Profile' },
]

const HOSPITAL_NAV: NavItem[] = [
  { href: '/hospital/dashboard',     icon: '🏠', label: 'Home' },
  { href: '/hospital/departments',   icon: '🏥', label: 'Staff' },
  { href: '/hospital/booking',       icon: '📋', label: 'Bookings',      matchPrefix: '/hospital/booking' },
  { href: '/hospital/notifications', icon: '🔔', label: 'Alerts' },
  { href: '/hospital/profile',       icon: '👤', label: 'Profile' },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard',    icon: '🏠', label: 'Home' },
  { href: '/admin/nurses',       icon: '👩‍⚕️', label: 'Nurses',   matchPrefix: '/admin/nurses' },
  { href: '/admin/bookings',     icon: '📋', label: 'Bookings', matchPrefix: '/admin/bookings' },
  { href: '/admin/analytics',    icon: '📈', label: 'Reports' },
  { href: '/admin/issues',       icon: '⚠️', label: 'Issues' },
]

const NAV_MAP: Record<string, NavItem[]> = {
  patient:  PATIENT_NAV,
  provider: PROVIDER_NAV,
  hospital: HOSPITAL_NAV,
  admin:    ADMIN_NAV,
}

export default function BottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const items = NAV_MAP[role]
  if (!items) return null

  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      {items.map(item => {
        const active = item.matchPrefix
          ? pathname.startsWith(item.matchPrefix)
          : pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
            {active && <span className="bottom-nav-dot" />}
          </Link>
        )
      })}
    </nav>
  )
}
