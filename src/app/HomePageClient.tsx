'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

/* ── constants ─────────────────────────────────────────────── */
const NAVY  = '#0B1E2D'
const DARK  = '#071622'
const TEAL  = '#0E7B8C'
const TEAL2 = '#0ABFCC'
const WHITE = '#FFFFFF'
const MUTED = 'rgba(255,255,255,0.55)'

interface Props {
  settings: Record<string, string>
  features: any[]
  howItWorks: any[]
  services: any[]
  testimonials: any[]
  faqs: any[]
  liveNurses: any[]
  featuredNurses: any[]
  stats: { nurses: number; bookings: number; patients: number }
}

export default function HomePageClient({ settings: s, features, howItWorks, services, testimonials, faqs, liveNurses, featuredNurses, stats }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [nurseFilter, setNurseFilter] = useState({ city: '', service: '', gender: '' })
  const [searchCity, setSearchCity] = useState('')
  const [searchService, setSearchService] = useState('')

  // Derived
  const heroEnabled    = s.hero_enabled !== 'false'
  const badgeText      = s.hero_badge         || "Saudi Arabia's #1 Home Healthcare Platform"
  const headingLine1   = s.hero_heading_line1 || 'Trusted Home'
  const headingLine2   = s.hero_heading_line2 || 'Healthcare'
  const headingLine3   = s.hero_heading_line3 || 'On Demand'
  const subheading     = s.hero_subheading    || 'Connect with MOH-licensed nurses and home care professionals. Book verified care in minutes.'
  const cta1Text       = s.hero_cta1_text     || 'Book a Nurse →'
  const cta1Link       = s.hero_cta1_link     || '/auth/login'
  const cta2Text       = s.hero_cta2_text     || 'Join as Nurse ↗'
  const cta2Link       = s.hero_cta2_link     || '/auth/login'
  const stat1Num       = s.hero_stat1_num     || `${stats.nurses.toLocaleString()}+`
  const stat1Label     = s.hero_stat1_label   || 'Verified Nurses'
  const stat2Num       = s.hero_stat2_num     || `${stats.bookings.toLocaleString()}+`
  const stat2Label     = s.hero_stat2_label   || 'Sessions Completed'
  const stat3Num       = s.hero_stat3_num     || '4.9★'
  const stat3Label     = s.hero_stat3_label   || 'Average Rating'
  const footerAbout    = s.footer_about       || "Saudi Arabia's trusted home healthcare marketplace."
  const footerEmail    = s.footer_email       || 'support@nursecare.sa'
  const footerPhone    = s.footer_phone       || ''
  const footerCopy     = s.footer_copyright   || '© 2025 NurseCare+. All rights reserved.'
  const citiesValue    = s.stats_cities_value || '12'

  const heroNurses = liveNurses.slice(0, 3)

  // Filter live nurses section
  const filteredNurses = liveNurses.filter(n => {
    if (nurseFilter.city && !n.city?.toLowerCase().includes(nurseFilter.city.toLowerCase())) return false
    if (nurseFilter.service && !n.specialization?.toLowerCase().includes(nurseFilter.service.toLowerCase())) return false
    return true
  })

  const uniqueCities = Array.from(new Set(liveNurses.map(n => n.city).filter(Boolean))).sort()
  const uniqueSpecs  = Array.from(new Set(liveNurses.map(n => n.specialization).filter(Boolean))).sort()

  function getNursePhoto(nurse: any): string | null {
    const docs = nurse.nurse_documents as any[] | undefined
    return docs?.find(d => d.doc_type === 'photo')?.file_url ?? null
  }

  return (
    <div style={{ background: NAVY, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, Arial, sans-serif" }}>

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(7,22,34,0.96)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏥</div>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.15rem', color: WHITE, fontWeight: 700 }}>
              Nurse<span style={{ color: TEAL2 }}>Care+</span>
            </span>
          </Link>

          <div className="hp-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {[['How It Works', '#how-it-works'], ['Specialties', '#specialties'], ['Providers', '#providers'], ['Features', '#features'], ['FAQ', '#faq']].map(([label, href]) => (
              <a key={label} href={href} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 }}>{label}</a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/auth/login" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)' }}>Log In</Link>
            <Link href="/auth/login" style={{ background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE, textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700, padding: '9px 20px', borderRadius: 8, boxShadow: '0 4px 16px rgba(14,123,140,0.4)' }}>Get Started</Link>
            <button onClick={() => setMobileMenuOpen(v => !v)} className="hp-hamburger"
              style={{ display: 'none', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 40, height: 40, cursor: 'pointer', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              aria-label="Menu">
              <span style={{ display: 'block', width: 18, height: 2, background: WHITE, borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: WHITE, borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: WHITE, borderRadius: 2 }} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div style={{ background: 'rgba(7,22,34,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '1rem 1.5rem 1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.2rem' }}>
              {[['How It Works', '#how-it-works'], ['Specialties', '#specialties'], ['Providers', '#providers'], ['Features', '#features'], ['FAQ', '#faq']].map(([label, href]) => (
                <a key={label} href={href} onClick={() => setMobileMenuOpen(false)} style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}>{label}</a>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Link href="/auth/login" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)' }}>Log In</Link>
              <Link href="/auth/login" style={{ textAlign: 'center', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700, padding: '10px', borderRadius: 8 }}>Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      {heroEnabled && (
        <section style={{ minHeight: '100vh', paddingTop: 68, background: `linear-gradient(135deg, #071622 0%, ${NAVY} 55%, #0a1e2a 100%)`, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', top: '-15%', right: '-8%', width: '60vw', height: '60vw', background: 'radial-gradient(ellipse, rgba(10,191,204,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-15%', left: '-5%', width: '45vw', height: '45vw', background: 'radial-gradient(ellipse, rgba(14,123,140,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '4rem 1.5rem 5rem', width: '100%', position: 'relative', zIndex: 1 }}>
            <div className="hp-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(10,191,204,0.1)', border: '1px solid rgba(10,191,204,0.25)', borderRadius: 50, padding: '6px 14px', fontSize: '0.78rem', color: TEAL2, fontWeight: 600, marginBottom: '1.2rem', letterSpacing: '0.03em' }}>
                  <span>⚕️</span><span>{badgeText}</span>
                </div>
                <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800, color: WHITE, lineHeight: 1.15, margin: '0 0 1.2rem' }}>
                  {headingLine1}<br />
                  <span style={{ background: 'linear-gradient(135deg,#0ABFCC,#0E7B8C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{headingLine2}</span><br />
                  {headingLine3}
                </h1>
                <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.62)', lineHeight: 1.65, marginBottom: '2rem', maxWidth: 480 }}>{subheading}</p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                  <Link href={cta1Link} style={{ background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE, textDecoration: 'none', fontSize: '0.95rem', fontWeight: 700, padding: '14px 28px', borderRadius: 10, boxShadow: '0 8px 30px rgba(14,123,140,0.45)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {cta1Text}
                  </Link>
                  <Link href={cta2Link} style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 600, padding: '14px 28px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {cta2Text}
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  {[[stat1Num, stat1Label], [stat2Num, stat2Label], [stat3Num, stat3Label]].map(([num, label], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                      {i > 0 && <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.1)', marginRight: '2rem' }} />}
                      <div>
                        <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.5rem', fontWeight: 700, color: WHITE, lineHeight: 1 }}>{num}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero right — live nurses */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ position: 'absolute', top: -24, right: 0, zIndex: 10, background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', borderRadius: 12, padding: '10px 16px', boxShadow: '0 8px 30px rgba(14,123,140,0.5)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Available Now</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: WHITE, lineHeight: 1.1 }}>{liveNurses.length}</div>
                </div>

                {(heroNurses.length > 0 ? heroNurses : [
                  { full_name: 'Sarah Al-Harbi', specialization: 'Cardiac Care', city: 'Riyadh', is_available: true },
                  { full_name: 'Mohammed Al-Qahtani', specialization: 'General Nursing', city: 'Jeddah', is_available: true },
                  { full_name: 'Fatima Al-Zahrani', specialization: 'Pediatric Specialist', city: 'Riyadh', is_available: false },
                ]).map((nurse: any, i: number) => {
                  const photo = getNursePhoto(nurse)
                  return (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', overflow: 'hidden' }}>
                        {photo ? <Image src={photo} alt={nurse.full_name} width={46} height={46} style={{ objectFit: 'cover', width: '100%', height: '100%' }} /> : '👩‍⚕️'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: WHITE, fontSize: '0.88rem' }}>{nurse.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: TEAL2, fontWeight: 600 }}>{nurse.specialization}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>📍 {nurse.city}</div>
                      </div>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: nurse.is_available ? '#27A869' : '#E04A4A', boxShadow: nurse.is_available ? '0 0 8px rgba(39,168,105,0.9)' : 'none' }} />
                    </div>
                  )
                })}

                <div style={{ position: 'absolute', bottom: -20, left: -20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 16px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Patient Satisfaction</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: WHITE }}>98%</span>
                    <span style={{ fontSize: '0.8rem', color: '#F59E0B' }}>★★★★★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TRUST BAR ──────────────────────────────────────────── */}
      <div style={{ background: 'rgba(10,191,204,0.05)', borderTop: '1px solid rgba(10,191,204,0.1)', borderBottom: '1px solid rgba(10,191,204,0.1)', padding: '0.9rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
          {[['✅', 'MOH Licensed Nurses'], ['🔒', 'Secure Payments'], ['⚡', 'Same-Day Booking'], ['🌍', 'Nationwide Coverage'], ['📞', '24/7 Support']].map(([icon, text]) => (
            <div key={text as string} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FIND A NURSE (live search) ─────────────────────────── */}
      <section id="find-nurse" style={{ background: DARK, padding: '4.5rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionLabel>🔍 Find Care</SectionLabel>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: WHITE, marginBottom: '0.7rem' }}>
            Find a Nurse Near You
          </h2>
          <p style={{ fontSize: '0.95rem', color: MUTED, marginBottom: '2rem' }}>
            {liveNurses.length} verified nurses available right now. Filter by city or specialty.
          </p>

          {/* Filter bar */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '1.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={filterLabelStyle}>City</label>
              <select value={nurseFilter.city} onChange={e => setNurseFilter(f => ({ ...f, city: e.target.value }))} style={filterInputStyle}>
                <option value="">All Cities</option>
                {uniqueCities.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={filterLabelStyle}>Specialty / Service</label>
              <select value={nurseFilter.service} onChange={e => setNurseFilter(f => ({ ...f, service: e.target.value }))} style={filterInputStyle}>
                <option value="">All Specialties</option>
                {uniqueSpecs.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
              </select>
            </div>
            <button onClick={() => setNurseFilter({ city: '', service: '', gender: '' })} style={{ padding: '10px 16px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              Clear
            </button>
          </div>

          {/* Nurse grid */}
          {filteredNurses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: MUTED }}>No nurses match your filters right now. Try adjusting.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.2rem' }}>
              {filteredNurses.slice(0, 12).map((nurse: any) => {
                const photo = getNursePhoto(nurse)
                return (
                  <div key={nurse.user_id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0, overflow: 'hidden' }}>
                        {photo ? <Image src={photo} alt={nurse.full_name} width={50} height={50} style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }} /> : '👩‍⚕️'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: WHITE, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nurse.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: TEAL2, fontWeight: 600, marginTop: 2 }}>{nurse.specialization}</div>
                      </div>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#27A869', boxShadow: '0 0 6px rgba(39,168,105,0.8)', flexShrink: 0 }} title="Available" />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                      📍 {nurse.city}
                      {nurse.hourly_rate && <span style={{ marginLeft: 8, color: TEAL2, fontWeight: 700 }}>SAR {nurse.hourly_rate}/hr</span>}
                    </div>
                    <Link href="/auth/login" style={{ display: 'block', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE, textDecoration: 'none', textAlign: 'center', padding: '9px', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, marginTop: 'auto' }}>
                      Book Now →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}

          {filteredNurses.length > 12 && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(14,123,140,0.15)', border: '1px solid rgba(14,123,140,0.3)', color: TEAL2, textDecoration: 'none', padding: '11px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem' }}>
                View all {filteredNurses.length} nurses →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      {howItWorks.length > 0 && (
        <section id="how-it-works" style={{ background: '#F0F5F8', padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <SectionLabelDark>📋 Process</SectionLabelDark>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: NAVY, marginBottom: '0.7rem' }}>
                How NurseCare+ Works
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#8A9BAA', maxWidth: 520, margin: '0 auto' }}>
                From search to care — a seamless process designed around you.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.2rem' }}>
              {howItWorks.map((step: any, i: number) => (
                <div key={step.id} style={{ background: WHITE, border: '1px solid #E5EDF0', borderRadius: 16, padding: '1.8rem 1.4rem', textAlign: 'center' }}>
                  <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: WHITE, margin: '0 auto 0.9rem' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.7rem' }}>{step.icon}</div>
                  <div style={{ fontFamily: 'Georgia,serif', fontSize: '0.9rem', fontWeight: 700, color: NAVY, marginBottom: '0.45rem' }}>{step.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#8A9BAA', lineHeight: 1.55 }}>{step.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SPECIALTIES ────────────────────────────────────────── */}
      {services.length > 0 && (
        <section id="specialties" style={{ background: DARK, padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <SectionLabel>🩺 Specialties</SectionLabel>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: WHITE, marginBottom: '0.7rem' }}>
                Browse by Specialty
              </h2>
              <p style={{ fontSize: '0.95rem', color: MUTED }}>Certified professionals across all major healthcare specialties.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
              {services.map((svc: any) => (
                <Link key={svc.id} href="/auth/login" style={{ background: '#0f2133', border: '1.5px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.6rem 1rem', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>{svc.icon}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: WHITE, marginBottom: 3 }}>{svc.name}</div>
                  {svc.description && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{svc.description}</div>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURED PROVIDERS ─────────────────────────────────── */}
      {featuredNurses.length > 0 && (
        <section id="providers" style={{ background: '#F7F4EF', padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
              <div>
                <SectionLabelDark>⭐ Top Rated</SectionLabelDark>
                <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: NAVY, margin: 0 }}>
                  Featured Providers
                </h2>
              </div>
              <Link href="/auth/login" style={{ fontSize: '0.85rem', color: TEAL, fontWeight: 700, textDecoration: 'none' }}>
                View all providers →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {featuredNurses.map((nurse: any) => {
                const photo = getNursePhoto(nurse)
                return (
                  <div key={nurse.user_id} style={{ background: WHITE, border: '1px solid #E5EDF0', borderRadius: 18, padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0, overflow: 'hidden' }}>
                        {photo ? <Image src={photo} alt={nurse.full_name} width={54} height={54} style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }} /> : '👩‍⚕️'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: NAVY, fontSize: '0.95rem' }}>{nurse.full_name}</div>
                        <div style={{ fontSize: '0.78rem', color: TEAL, fontWeight: 600, margin: '2px 0 4px' }}>{nurse.specialization}</div>
                        <div style={{ fontSize: '0.75rem', color: '#8A9BAA' }}>📍 {nurse.city}</div>
                        {nurse.hourly_rate && (
                          <div style={{ fontSize: '0.78rem', color: '#27A869', fontWeight: 700, marginTop: 4 }}>SAR {nurse.hourly_rate}/hr</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(39,168,105,0.1)', border: '1px solid rgba(39,168,105,0.25)', color: '#27A869', fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, marginBottom: '1rem' }}>
                      ✅ Verified & Available
                    </div>
                    <Link href="/auth/login" style={{ display: 'block', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE, textDecoration: 'none', textAlign: 'center', padding: 9, borderRadius: 9, fontSize: '0.83rem', fontWeight: 700 }}>
                      Book Now
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURES ───────────────────────────────────────────── */}
      {features.length > 0 && (
        <section id="features" style={{ background: DARK, padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <SectionLabel>🚀 Why Us</SectionLabel>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: WHITE, marginBottom: '0.7rem' }}>
                Everything You Need for Quality Care
              </h2>
              <p style={{ fontSize: '0.95rem', color: MUTED }}>Built for patients, nurses, and hospitals — one unified platform.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {features.map((f: any) => (
                <div key={f.id} style={{ background: 'rgba(14,123,140,0.06)', border: '1px solid rgba(14,123,140,0.14)', borderRadius: 18, padding: '1.8rem' }}>
                  <div style={{ width: 50, height: 50, background: 'linear-gradient(135deg,rgba(14,123,140,0.2),rgba(10,191,204,0.15))', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginBottom: '1rem' }}>{f.icon}</div>
                  <div style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', fontWeight: 700, color: WHITE, marginBottom: '0.5rem' }}>{f.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.52)', lineHeight: 1.6 }}>{f.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── STATISTICS ─────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,${TEAL},${TEAL2})`, padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', textAlign: 'center' }}>
            {[
              { num: stat1Num, label: s.stats_nurses_label   || 'Verified Nurses' },
              { num: `${stats.patients.toLocaleString()}+`, label: s.stats_patients_label  || 'Happy Patients' },
              { num: `${stats.bookings.toLocaleString()}+`, label: s.stats_bookings_label  || 'Sessions Completed' },
              { num: `${citiesValue}+`, label: s.stats_cities_label   || 'Cities Covered' },
            ].map((stat, i) => (
              <div key={i}>
                <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 800, color: WHITE, lineHeight: 1 }}>{stat.num}</div>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.8)', marginTop: 6, fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section style={{ background: '#F0F5F8', padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <SectionLabelDark>💬 Stories</SectionLabelDark>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: NAVY, marginBottom: '0.7rem' }}>
                What People Say
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#8A9BAA' }}>Trusted by thousands across Saudi Arabia.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {testimonials.map((t: any) => (
                <div key={t.id} style={{ background: WHITE, border: '1px solid #E5EDF0', borderRadius: 18, padding: '1.8rem' }}>
                  <div style={{ fontSize: '0.9rem', color: '#F59E0B', marginBottom: '1rem' }}>{'★'.repeat(t.stars)}</div>
                  <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7, marginBottom: '1.2rem', fontStyle: 'italic' }}>
                    &ldquo;{t.text}&rdquo;
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{t.author_emoji}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: NAVY }}>{t.author_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#8A9BAA' }}>{t.author_role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQs ───────────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section id="faq" style={{ background: DARK, padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <SectionLabel>❓ FAQ</SectionLabel>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: WHITE, marginBottom: '0.7rem' }}>
                Frequently Asked Questions
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {faqs.map((faq: any) => (
                <div key={faq.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.2rem', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: WHITE, fontFamily: 'inherit', fontSize: '0.92rem', fontWeight: 700, gap: 12 }}
                  >
                    <span>{faq.question}</span>
                    <span style={{ color: TEAL2, fontSize: '1.1rem', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === faq.id ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </button>
                  {openFaq === faq.id && (
                    <div style={{ padding: '0 1.2rem 1rem', fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA BANNER ─────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: `linear-gradient(135deg, ${NAVY} 0%, ${DARK} 100%)`, position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(10,191,204,0.07), transparent)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <SectionLabel style={{ margin: '0 auto 1rem', display: 'inline-flex' }}>🌟 Get Started</SectionLabel>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: WHITE, fontWeight: 700, marginBottom: '0.8rem' }}>
            Ready to Experience Better Home Care?
          </h2>
          <p style={{ fontSize: '0.95rem', color: MUTED, marginBottom: '2rem' }}>
            Join thousands of patients receiving quality care at home. Sign up today.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={cta1Link} style={{ background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE, textDecoration: 'none', fontSize: '0.95rem', fontWeight: 700, padding: '14px 28px', borderRadius: 10, boxShadow: '0 8px 30px rgba(14,123,140,0.45)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {cta1Text}
            </Link>
            <Link href={cta2Link} style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 600, padding: '14px 28px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {cta2Text}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer style={{ background: '#050e16', padding: '4rem 1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="hp-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.8rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏥</div>
                <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.05rem', color: WHITE, fontWeight: 700 }}>Nurse<span style={{ color: TEAL2 }}>Care+</span></span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, maxWidth: 260 }}>{footerAbout}</p>
              {footerEmail && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>✉️ {footerEmail}</div>}
              {footerPhone && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>📞 {footerPhone}</div>}
              {(s.footer_twitter || s.footer_instagram || s.footer_linkedin) && (
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  {s.footer_twitter   && <a href={s.footer_twitter}   target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.85rem' }}>𝕏</a>}
                  {s.footer_instagram && <a href={s.footer_instagram} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.85rem' }}>📸</a>}
                  {s.footer_linkedin  && <a href={s.footer_linkedin}  target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.85rem' }}>in</a>}
                </div>
              )}
            </div>

            {[
              { title: 'For Patients', links: [['Book a Nurse', '/auth/login'], ['Browse Specialties', '/auth/login'], ['My Bookings', '/auth/login'], ['Patient Dashboard', '/auth/login']] },
              { title: 'For Nurses',   links: [['Join as Nurse', '/auth/login'], ['Provider Dashboard', '/auth/login'], ['Manage Availability', '/auth/login'], ['View Earnings', '/auth/login']] },
              { title: 'Company',      links: [['About Us', '/auth/login'], ['Hospitals', '/auth/login'], ['Contact', '/auth/login'], ['Admin Login', '/auth/login']] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>{col.title}</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: 0, margin: 0 }}>
                  {col.links.map(([label, href]) => (
                    <li key={label}><Link href={href} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)' }}>{footerCopy}</div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {['Privacy Policy', 'Terms of Service'].map(t => (
                <Link key={t} href="/auth/login" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', textDecoration: 'none' }}>{t}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .hp-hero-grid { grid-template-columns: 1fr !important; text-align: center; }
          .hp-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 2rem !important; }
        }
        @media (max-width: 640px) {
          .hp-desktop-nav { display: none !important; }
          .hp-hamburger { display: flex !important; }
          .hp-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ── Helper components ─────────────────────────────────────────── */
function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(10,191,204,0.1)', border: '1px solid rgba(10,191,204,0.25)', borderRadius: 50, padding: '5px 14px', fontSize: '0.72rem', color: '#0ABFCC', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.9rem', ...style }}>
      {children}
    </div>
  )
}

function SectionLabelDark({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(14,123,140,0.1)', border: '1px solid rgba(14,123,140,0.25)', borderRadius: 50, padding: '5px 14px', fontSize: '0.72rem', color: '#0E7B8C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.9rem' }}>
      {children}
    </div>
  )
}

const filterLabelStyle: React.CSSProperties = { display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }
const filterInputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '10px 12px', fontSize: '0.88rem', color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
