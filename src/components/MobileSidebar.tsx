'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface MobileSidebarProps {
  children: React.ReactNode
  logoHref: string
}

export default function MobileSidebar({ children, logoHref }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Hamburger button */}
      <button
        className={`mobile-menu-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile top bar with logo */}
      <div className="mobile-topbar">
        <a href={logoHref} style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>
            Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
          </span>
        </a>
      </div>

      {/* Backdrop */}
      <div
        className={`sidebar-backdrop${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar — gets open class on mobile */}
      <aside className={`app-sidebar${open ? ' open' : ''}`} style={{
        width: 260,
        background: '#05111A',
        minHeight: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 150,
      }}>
        {children}
      </aside>
    </>
  )
}
