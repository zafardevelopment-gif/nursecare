'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface MobileSidebarProps {
  children: React.ReactNode
  logoHref: string
  topbarRight?: React.ReactNode
}

export default function MobileSidebar({ children, logoHref, topbarRight }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change
  // eslint-disable-next-line react-hooks/set-state-in-effect -- pathname is external; closing on nav is the desired side-effect
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

      {/* Mobile top bar with logo + optional right slot (notification bell) */}
      <div className="mobile-topbar">
        <a href={logoHref} style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>
            Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
          </span>
        </a>
        {topbarRight && (
          <div style={{ marginLeft: 'auto' }}>
            {topbarRight}
          </div>
        )}
      </div>

      {/* Backdrop */}
      <div
        className={`sidebar-backdrop${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar — gets open class on mobile */}
      <aside className={`app-sidebar${open ? ' open' : ''}`}>
        {children}
      </aside>
    </>
  )
}
