'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function HomepageNavClient() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav className="hp-nav">
        <div className="hp-nav-inner">
          <Link href="/" className="hp-nav-logo">
            <div className="hp-nav-logo-icon">🏥</div>
            <span className="hp-nav-logo-text">Nurse<span>Care+</span></span>
          </Link>

          <ul className="hp-nav-links">
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#specialties">Specialties</a></li>
            <li><a href="#providers">Providers</a></li>
            <li><a href="#features">Features</a></li>
          </ul>

          <div className="hp-nav-cta">
            <Link href="/auth/login" className="hp-btn-ghost">Log In</Link>
            <Link href="/auth/login" className="hp-btn-teal">Get Started</Link>
          </div>

          <button
            className="hp-nav-mobile-btn"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div style={{
            background: 'rgba(7,22,34,0.98)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '1rem 1.5rem 1.5rem',
          }}>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.2rem' }}>
              {[
                ['How It Works', '#how-it-works'],
                ['Specialties', '#specialties'],
                ['Providers', '#providers'],
                ['Features', '#features'],
              ].map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Link href="/auth/login" className="hp-btn-ghost" style={{ textAlign: 'center' }}>Log In</Link>
              <Link href="/auth/login" className="hp-btn-teal" style={{ textAlign: 'center' }}>Get Started</Link>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
