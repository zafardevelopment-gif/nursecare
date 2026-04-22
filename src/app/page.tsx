'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ── Data ─────────────────────────────────────────────────────── */
const STEPS = [
  { icon: '🔍', num: '01', title: 'Search Providers', desc: 'Browse verified nurses and healthcare professionals by specialty, location, and availability.' },
  { icon: '👤', num: '02', title: 'View Profiles', desc: 'Read reviews, check qualifications, certifications, and service rates before booking.' },
  { icon: '📅', num: '03', title: 'Book a Session', desc: 'Choose your preferred date, time slot, and service type in just a few taps.' },
  { icon: '✅', num: '04', title: 'Nurse Confirms', desc: 'Your assigned nurse reviews and confirms the appointment within minutes.' },
  { icon: '🏥', num: '05', title: 'Receive Care', desc: 'Enjoy professional, compassionate home healthcare at your preferred location.' },
  { icon: '⭐', num: '06', title: 'Rate & Review', desc: 'Share your experience to help others find the best care providers.' },
  { icon: '🔁', num: '07', title: 'Rebook Easily', desc: 'Save your favorite providers and rebook with a single tap for ongoing care.' },
]

const PROFESSIONS = [
  { icon: '🩺', name: 'General Nursing', count: '120+ nurses' },
  { icon: '❤️', name: 'Cardiac Care', count: '45+ nurses' },
  { icon: '🧠', name: 'Neurology', count: '38+ nurses' },
  { icon: '👶', name: 'Pediatric Care', count: '62+ nurses' },
  { icon: '🦴', name: 'Orthopedic', count: '29+ nurses' },
  { icon: '🩻', name: 'Post-Surgery', count: '54+ nurses' },
  { icon: '🩹', name: 'Wound Care', count: '71+ nurses' },
  { icon: '💊', name: 'IV Therapy', count: '33+ nurses' },
]

const PROVIDERS = [
  { emoji: '👩‍⚕️', name: 'Sarah Al-Harbi', spec: 'Cardiac Care Specialist', city: 'Riyadh', exp: '8 yrs', rating: '4.9', reviews: 127 },
  { emoji: '👨‍⚕️', name: 'Mohammed Al-Qahtani', spec: 'General Nursing', city: 'Jeddah', exp: '5 yrs', rating: '4.8', reviews: 89 },
  { emoji: '👩‍⚕️', name: 'Fatima Al-Zahrani', spec: 'Pediatric Specialist', city: 'Riyadh', exp: '10 yrs', rating: '5.0', reviews: 203 },
  { emoji: '👨‍⚕️', name: 'Omar Al-Ghamdi', spec: 'Post-Surgery Care', city: 'Dammam', exp: '6 yrs', rating: '4.7', reviews: 74 },
]

const FEATURES = [
  { icon: '🛡️', title: 'Verified & Licensed', desc: 'Every nurse undergoes rigorous background checks, license verification, and skills assessment before approval.' },
  { icon: '⏱️', title: 'On-Demand Booking', desc: 'Book same-day or schedule in advance. Our smart availability system ensures you always find care when you need it.' },
  { icon: '📍', title: 'Location-Based Matching', desc: 'Get matched with certified nurses in your city. We cover Riyadh, Jeddah, Dammam, and more cities across KSA.' },
  { icon: '💬', title: 'Real-Time Messaging', desc: 'Communicate directly with your care provider through our secure in-app messaging before and after visits.' },
  { icon: '💳', title: 'Transparent Pricing', desc: 'See full pricing upfront with no hidden fees. Compare rates across providers and choose what fits your budget.' },
  { icon: '📋', title: 'Care Documentation', desc: 'Access visit summaries, care plans, and medical notes digitally. Share with your doctor anytime.' },
]

const TESTIMONIALS = [
  { stars: 5, text: 'NurseCare+ made finding post-surgery home care incredibly easy. The nurse was professional, punctual, and genuinely caring. Highly recommend.', name: 'Abdullah Al-Otaibi', role: 'Patient — Riyadh', emoji: '👨' },
  { stars: 5, text: 'As a hospital administrator, NurseCare+ has transformed how we fill urgent shifts. The platform is fast, reliable, and the nurses are well-vetted.', name: 'Dr. Layla Al-Shehri', role: 'Hospital Admin — Jeddah', emoji: '👩' },
  { stars: 5, text: "I've been a registered nurse for 7 years. This platform gave me flexibility to work on my own schedule while still serving patients who need me.", name: 'Nurse Rania Khalid', role: 'Certified Nurse — Dammam', emoji: '👩‍⚕️' },
]

/* ── Styles (inline, same pattern as rest of project) ─────────── */
const NAVY = '#0B1E2D'
const DARK = '#071622'
const TEAL = '#0E7B8C'
const TEAL2 = '#0ABFCC'
const WHITE = '#FFFFFF'
const MUTED = 'rgba(255,255,255,0.55)'
const BORDER_LIGHT = 'rgba(255,255,255,0.08)'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div style={{ background: NAVY, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, Arial, sans-serif" }}>

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(7,22,34,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem',
          height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>🏥</div>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.15rem', color: WHITE, fontWeight: 700 }}>
              Nurse<span style={{ color: TEAL2 }}>Care+</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}
            className="hp-desktop-nav">
            {[['How It Works', '#how-it-works'], ['Specialties', '#specialties'], ['Providers', '#providers'], ['Features', '#features']].map(([label, href]) => (
              <a key={label} href={href} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500 }}>{label}</a>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/auth/login" style={{
              color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600,
              padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)',
            }}>Log In</Link>
            <Link href="/auth/login" style={{
              background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE,
              textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700,
              padding: '9px 20px', borderRadius: 8, boxShadow: '0 4px 16px rgba(14,123,140,0.4)',
            }}>Get Started</Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              style={{
                display: 'none', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, width: 40, height: 40, cursor: 'pointer', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
              className="hp-hamburger"
              aria-label="Menu"
            >
              <span style={{ display: 'block', width: 18, height: 2, background: WHITE, borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: WHITE, borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: WHITE, borderRadius: 2 }} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div style={{
            background: 'rgba(7,22,34,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '1rem 1.5rem 1.5rem',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.2rem' }}>
              {[['How It Works', '#how-it-works'], ['Specialties', '#specialties'], ['Providers', '#providers'], ['Features', '#features']].map(([label, href]) => (
                <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
                  style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}>
                  {label}
                </a>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Link href="/auth/login" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)' }}>Log In</Link>
              <Link href="/auth/login" style={{ textAlign: 'center', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700, padding: '10px', borderRadius: 8 }}>Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', paddingTop: 68,
        background: `linear-gradient(135deg, #071622 0%, ${NAVY} 55%, #0a1e2a 100%)`,
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center',
      }}>
        {/* glow orbs */}
        <div style={{ position: 'absolute', top: '-15%', right: '-8%', width: '60vw', height: '60vw', background: 'radial-gradient(ellipse, rgba(10,191,204,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-5%', width: '45vw', height: '45vw', background: 'radial-gradient(ellipse, rgba(14,123,140,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '4rem 1.5rem 5rem', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}
            className="hp-hero-grid">

            {/* Left copy */}
            <div>
              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'rgba(10,191,204,0.1)', border: '1px solid rgba(10,191,204,0.25)',
                borderRadius: 50, padding: '6px 14px', fontSize: '0.78rem', color: TEAL2,
                fontWeight: 600, marginBottom: '1.2rem', letterSpacing: '0.03em',
              }}>
                <span>⚕️</span><span>Saudi Arabia&apos;s #1 Home Healthcare Platform</span>
              </div>

              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800, color: WHITE,
                lineHeight: 1.15, margin: '0 0 1.2rem',
              }}>
                Trusted Home<br />
                <span style={{ background: 'linear-gradient(135deg,#0ABFCC,#0E7B8C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Healthcare</span><br />
                On Demand
              </h1>

              <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.62)', lineHeight: 1.65, marginBottom: '2rem', maxWidth: 480 }}>
                Connect with MOH-licensed nurses, post-surgery specialists, and home care professionals. Book verified care for yourself or loved ones — in minutes.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                <Link href="/auth/login" style={{
                  background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE,
                  textDecoration: 'none', fontSize: '0.95rem', fontWeight: 700,
                  padding: '14px 28px', borderRadius: 10, boxShadow: '0 8px 30px rgba(14,123,140,0.45)',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  Book a Nurse →
                </Link>
                <Link href="/auth/login" style={{
                  color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 600,
                  padding: '14px 28px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.2)',
                  display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent',
                }}>
                  Join as Nurse ↗
                </Link>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {[['1,200+', 'Verified Nurses'], ['25,000+', 'Sessions Completed'], ['4.9★', 'Average Rating']].map(([num, label], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: i > 0 ? undefined : undefined }}>
                    {i > 0 && <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.1)', marginRight: '2rem' }} />}
                    <div>
                      <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.5rem', fontWeight: 700, color: WHITE, lineHeight: 1 }}>{num}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — provider cards */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Floating top badge */}
              <div style={{
                position: 'absolute', top: -24, right: 0, zIndex: 10,
                background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
                borderRadius: 12, padding: '10px 16px', boxShadow: '0 8px 30px rgba(14,123,140,0.5)',
              }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Today&apos;s Bookings</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: WHITE, lineHeight: 1.1 }}>47</div>
              </div>

              {[
                { emoji: '👩‍⚕️', name: 'Sarah Al-Harbi', spec: 'Cardiac Care', city: 'Riyadh', available: true },
                { emoji: '👨‍⚕️', name: 'Mohammed Al-Qahtani', spec: 'General Nursing', city: 'Jeddah', available: true },
                { emoji: '👩‍⚕️', name: 'Fatima Al-Zahrani', spec: 'Pediatric Specialist', city: 'Riyadh', available: false },
              ].map((p, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, padding: '1rem 1.2rem',
                  display: 'flex', alignItems: 'center', gap: '0.9rem',
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                  }}>{p.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: WHITE, fontSize: '0.88rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: TEAL2, fontWeight: 600 }}>{p.spec}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>📍 {p.city}</div>
                  </div>
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                    background: p.available ? '#27A869' : '#E04A4A',
                    boxShadow: p.available ? '0 0 8px rgba(39,168,105,0.9)' : 'none',
                  }} />
                </div>
              ))}

              {/* Floating bottom badge */}
              <div style={{
                position: 'absolute', bottom: -20, left: -20,
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '10px 16px',
              }}>
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

      {/* ── TRUST BAR ─────────────────────────────────────────── */}
      <div style={{ background: 'rgba(10,191,204,0.05)', borderTop: '1px solid rgba(10,191,204,0.1)', borderBottom: '1px solid rgba(10,191,204,0.1)', padding: '0.9rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
          {[['✅', 'MOH Licensed Nurses'], ['🔒', 'Secure Payments'], ['⚡', 'Same-Day Booking'], ['🌍', 'Nationwide Coverage'], ['📞', '24/7 Support']].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SEARCH SECTION ────────────────────────────────────── */}
      <section style={{ background: DARK, padding: '4.5rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <SectionLabel>🔍 Find Care</SectionLabel>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: WHITE, marginBottom: '0.7rem' }}>
            Find a Nurse Near You
          </h2>
          <p style={{ fontSize: '0.95rem', color: MUTED, marginBottom: '2rem' }}>
            Search by specialty, city, or service type. Filter by availability and ratings.
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.09)',
            borderRadius: 16, padding: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
            alignItems: 'flex-end', maxWidth: 820, margin: '0 auto',
          }}>
            {[
              { label: 'Specialty / Service', placeholder: 'e.g. Cardiac Care, IV Therapy…', type: 'text' },
              { label: 'City', placeholder: 'e.g. Riyadh, Jeddah…', type: 'text' },
              { label: 'Date', placeholder: '', type: 'date' },
            ].map(f => (
              <div key={f.label} style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '10px 12px', fontSize: '0.88rem', color: WHITE, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <Link href="/auth/login" style={{
              background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE, border: 'none',
              padding: '11px 22px', borderRadius: 9, fontSize: '0.9rem', fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              🔍 Search
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: '#F0F5F8', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <SectionLabelDark>📋 Process</SectionLabelDark>
            <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: NAVY, marginBottom: '0.7rem' }}>
              How NurseCare+ Works
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#8A9BAA', maxWidth: 520, margin: '0 auto' }}>
              From search to care — a seamless 7-step process designed around you.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.2rem' }}>
            {STEPS.map(s => (
              <div key={s.num} style={{ background: WHITE, border: '1px solid #E5EDF0', borderRadius: 16, padding: '1.8rem 1.4rem', textAlign: 'center' }}>
                <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: WHITE, margin: '0 auto 0.9rem' }}>{s.num}</div>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.7rem' }}>{s.icon}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: '0.9rem', fontWeight: 700, color: NAVY, marginBottom: '0.45rem' }}>{s.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#8A9BAA', lineHeight: 1.55 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPECIALTIES ───────────────────────────────────────── */}
      <section id="specialties" style={{ background: DARK, padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <SectionLabel>🩺 Specialties</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: WHITE, marginBottom: '0.7rem' }}>
              Browse by Specialty
            </h2>
            <p style={{ fontSize: '0.95rem', color: MUTED }}>
              Certified professionals across all major healthcare specialties.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
            {PROFESSIONS.map(p => (
              <Link key={p.name} href="/auth/login" style={{
                background: '#0f2133', border: '1.5px solid rgba(255,255,255,0.06)',
                borderRadius: 16, padding: '1.6rem 1rem', textAlign: 'center',
                textDecoration: 'none', display: 'block', transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>{p.icon}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: WHITE, marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{p.count}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PROVIDERS ────────────────────────────────── */}
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
            {PROVIDERS.map(p => (
              <div key={p.name} style={{ background: WHITE, border: '1px solid #E5EDF0', borderRadius: 18, padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{p.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: NAVY, fontSize: '0.95rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.78rem', color: TEAL, fontWeight: 600, margin: '2px 0 6px' }}>{p.spec}</div>
                    <div style={{ fontSize: '0.75rem', color: '#8A9BAA' }}>📍 {p.city} · {p.exp} exp</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                      <span style={{ fontSize: '0.8rem', color: '#F59E0B', fontWeight: 700 }}>★ {p.rating}</span>
                      <span style={{ fontSize: '0.72rem', color: '#8A9BAA' }}>({p.reviews} reviews)</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(39,168,105,0.1)', border: '1px solid rgba(39,168,105,0.25)', color: '#27A869', fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50, marginBottom: '1rem' }}>
                  ✅ Verified
                </div>
                <Link href="/auth/login" style={{ display: 'block', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE, textDecoration: 'none', textAlign: 'center', padding: 9, borderRadius: 9, fontSize: '0.83rem', fontWeight: 700 }}>
                  Book Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" style={{ background: DARK, padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <SectionLabel>🚀 Why Us</SectionLabel>
            <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: WHITE, marginBottom: '0.7rem' }}>
              Everything You Need for Quality Care
            </h2>
            <p style={{ fontSize: '0.95rem', color: MUTED }}>
              Built for patients, nurses, and hospitals — one unified platform.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: 'rgba(14,123,140,0.06)', border: '1px solid rgba(14,123,140,0.14)', borderRadius: 18, padding: '1.8rem' }}>
                <div style={{ width: 50, height: 50, background: 'linear-gradient(135deg,rgba(14,123,140,0.2),rgba(10,191,204,0.15))', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginBottom: '1rem' }}>{f.icon}</div>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', fontWeight: 700, color: WHITE, marginBottom: '0.5rem' }}>{f.title}</div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.52)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section style={{ background: '#F0F5F8', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <SectionLabelDark>💬 Stories</SectionLabelDark>
            <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.7rem,3vw,2.4rem)', fontWeight: 700, color: NAVY, marginBottom: '0.7rem' }}>
              What People Say
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#8A9BAA' }}>
              Trusted by thousands of patients, nurses, and hospitals across Saudi Arabia.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: WHITE, border: '1px solid #E5EDF0', borderRadius: 18, padding: '1.8rem' }}>
                <div style={{ fontSize: '0.9rem', color: '#F59E0B', marginBottom: '1rem' }}>{'★'.repeat(t.stars)}</div>
                <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7, marginBottom: '1.2rem', fontStyle: 'italic' }}>
                  &ldquo;{t.text}&rdquo;
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{t.emoji}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: NAVY }}>{t.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#8A9BAA' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: `linear-gradient(135deg, ${NAVY} 0%, ${DARK} 100%)`, position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(10,191,204,0.07), transparent)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <SectionLabel style={{ margin: '0 auto 1rem', display: 'inline-flex' }}>🌟 Get Started</SectionLabel>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: WHITE, fontWeight: 700, marginBottom: '0.8rem' }}>
            Ready to Experience Better Home Care?
          </h2>
          <p style={{ fontSize: '0.95rem', color: MUTED, marginBottom: '2rem' }}>
            Join thousands of patients receiving quality care at home. Sign up today and book your first session in under 5 minutes.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/login" style={{ background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: WHITE, textDecoration: 'none', fontSize: '0.95rem', fontWeight: 700, padding: '14px 28px', borderRadius: 10, boxShadow: '0 8px 30px rgba(14,123,140,0.45)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Book a Nurse Now →
            </Link>
            <Link href="/auth/login" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 600, padding: '14px 28px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Join as Nurse
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer style={{ background: '#050e16', padding: '4rem 1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}
            className="hp-footer-grid">

            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.8rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏥</div>
                <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.05rem', color: WHITE, fontWeight: 700 }}>Nurse<span style={{ color: TEAL2 }}>Care+</span></span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, maxWidth: 260 }}>
                Saudi Arabia&apos;s trusted home healthcare marketplace. Connecting patients with verified, licensed nursing professionals since 2024.
              </p>
            </div>

            {/* Columns */}
            {[
              { title: 'For Patients', links: ['Book a Nurse', 'Browse Specialties', 'My Bookings', 'Patient Dashboard'] },
              { title: 'For Nurses', links: ['Join as Nurse', 'Provider Dashboard', 'Manage Availability', 'View Earnings'] },
              { title: 'Company', links: ['About Us', 'Hospitals', 'Contact', 'Admin Login'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>{col.title}</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {col.links.map(link => (
                    <li key={link}>
                      <Link href="/auth/login" style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{link}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.28)' }}>© 2024 NurseCare+. All rights reserved.</div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {['Privacy Policy', 'Terms of Service'].map(t => (
                <Link key={t} href="/auth/login" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', textDecoration: 'none' }}>{t}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Responsive styles via style tag */}
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

/* ── Helper Components ──────────────────────────────────────── */
function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(10,191,204,0.1)', border: '1px solid rgba(10,191,204,0.25)',
      borderRadius: 50, padding: '5px 14px', fontSize: '0.72rem', color: '#0ABFCC',
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: '0.9rem', ...style,
    }}>
      {children}
    </div>
  )
}

function SectionLabelDark({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(14,123,140,0.1)', border: '1px solid rgba(14,123,140,0.25)',
      borderRadius: 50, padding: '5px 14px', fontSize: '0.72rem', color: '#0E7B8C',
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: '0.9rem',
    }}>
      {children}
    </div>
  )
}
