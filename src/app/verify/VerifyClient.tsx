'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VerifyResult } from './page'

const STATUS_CONFIG = {
  active:   { color: '#27A869', bg: '#E8F9F0', border: '#27A86933', icon: '✅', label: 'VERIFIED — Active & Valid' },
  expired:  { color: '#E04A4A', bg: '#FEE8E8', border: '#E04A4A33', icon: '❌', label: 'EXPIRED — No Longer Valid' },
  revoked:  { color: '#E04A4A', bg: '#FEE8E8', border: '#E04A4A33', icon: '🚫', label: 'REVOKED — Card Cancelled' },
  invalid:  { color: '#9AABB8', bg: 'var(--cream)', border: 'var(--border)', icon: '❓', label: 'NOT FOUND — Invalid ID' },
}

export default function VerifyClient({
  initialCode,
  result,
}: {
  initialCode: string
  result: VerifyResult | null
}) {
  const [query, setQuery] = useState(initialCode)
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim().toUpperCase()
    if (trimmed) router.push(`/verify?id=${encodeURIComponent(trimmed)}`)
  }

  const sc = result
    ? STATUS_CONFIG[result.effectiveStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.invalid
    : null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B1E2D 0%, #0E7B8C 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: '"Segoe UI", Arial, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Logo / header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏥</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
            Nurse<span style={{ color: '#0ABFCC' }}>Care+</span>
          </div>
          <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            Healthcare Provider Verification
          </div>
        </div>

        {/* Search form */}
        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B8A9A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Enter Nurse ID Code
          </div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value.toUpperCase())}
              placeholder="e.g. NC-2024-01042"
              style={{
                flex: 1, padding: '11px 14px', borderRadius: 9,
                border: '1.5px solid #D0DDE4', fontSize: '1rem',
                fontFamily: 'monospace', fontWeight: 700, color: '#0B1E2D',
                outline: 'none', letterSpacing: '1px',
              }}
            />
            <button type="submit" style={{
              background: '#0E7B8C', color: '#fff', border: 'none',
              padding: '11px 20px', borderRadius: 9, fontWeight: 700,
              fontSize: '0.88rem', cursor: 'pointer',
            }}>
              Verify
            </button>
          </form>
          <div style={{ fontSize: '0.75rem', color: '#9AABB8', marginTop: 8 }}>
            Or scan the QR code on the back of the ID card with your phone camera
          </div>
        </div>

        {/* Result */}
        {result && sc && (
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

            {/* Status banner */}
            <div style={{ background: sc.bg, borderBottom: `1px solid ${sc.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>{sc.icon}</span>
              <div>
                <div style={{ fontWeight: 800, color: sc.color, fontSize: '0.9rem', letterSpacing: '0.5px' }}>{sc.label}</div>
                <div style={{ fontSize: '0.72rem', color: sc.color, opacity: 0.8, marginTop: 1 }}>NurseCare+ Verification System</div>
              </div>
            </div>

            {/* Nurse details */}
            {result.found && (
              <div style={{ padding: '1.2rem' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: '1rem' }}>
                  {result.photoUrl ? (
                    <img src={result.photoUrl} alt="Nurse" style={{ width: 72, height: 88, borderRadius: 10, objectFit: 'cover', border: '2px solid #E8EFF3', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 72, height: 88, borderRadius: 10, background: '#F0F5F8', border: '2px solid #E8EFF3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>👤</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0B1E2D', marginBottom: 3 }}>{result.nurseName}</div>
                    {result.nurseSpec && <div style={{ fontSize: '0.8rem', color: '#0E7B8C', fontWeight: 700, marginBottom: 2 }}>{result.nurseSpec}</div>}
                    {result.nurseCity && <div style={{ fontSize: '0.8rem', color: '#6B8A9A' }}>📍 {result.nurseCity}</div>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', borderTop: '1px solid #E8EFF3', paddingTop: '1rem' }}>
                  {[
                    { label: 'ID Code',    value: result.uniqueIdCode },
                    { label: 'Status',     value: result.effectiveStatus.toUpperCase(), color: sc.color },
                    { label: 'Issue Date', value: new Date(result.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) },
                    { label: 'Valid Until', value: new Date(result.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), color: result.effectiveStatus === 'expired' ? '#E04A4A' : undefined },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9AABB8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: color ?? '#0B1E2D', fontFamily: label === 'ID Code' ? 'monospace' : 'inherit' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!result.found && (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.88rem', color: '#6B8A9A' }}>
                  No nurse ID card found for <strong style={{ fontFamily: 'monospace' }}>{initialCode}</strong>.
                  Please double-check the ID and try again.
                </p>
              </div>
            )}

            <div style={{ padding: '0.8rem 1.2rem', background: '#F9FBFC', borderTop: '1px solid #E8EFF3', fontSize: '0.72rem', color: '#9AABB8', textAlign: 'center' }}>
              Verified by NurseCare+ Platform · Results are live and authoritative
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
          NurseCare+ · Secure Provider Verification
        </div>
      </div>
    </div>
  )
}
