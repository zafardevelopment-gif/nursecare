'use client'

import { useState } from 'react'

interface NurseCardData {
  nurseId: string
  nurseName: string
  nurseSpecialization?: string
  shift?: string
  deptName?: string
  // extended profile (loaded on open)
  bio?: string | null
  city?: string | null
  nationality?: string | null
  experienceYears?: number | null
  gender?: string | null
  phone?: string | null
  licenseNo?: string | null
  dailyRate?: number | null
  finalDailyPrice?: number | null
  commissionPercent?: number | null
  photoUrl?: string | null
  /** nurse's own response (accepted / rejected) on provider bookings */
  nurseResponse?: string
  /** admin approval status on hospital booking selections (approved / rejected / pending) */
  selectionStatus?: string
}

const SHIFT_COLORS: Record<string, { color: string; bg: string; icon: string }> = {
  morning: { color: '#b85e00', bg: '#FFF8E8', icon: '☀️' },
  evening: { color: '#DD6B20', bg: '#FFF3E0', icon: '🌤️' },
  night:   { color: '#7B2FBE', bg: '#EDE9FE', icon: '🌙' },
}

export function NurseAvatarBtn({
  nurse,
  showPrice = false,
  showCommission = true,
}: {
  nurse: NurseCardData
  showPrice?: boolean
  /** When false, only show base daily rate (hide commission/final price) */
  showCommission?: boolean
}) {
  const [open, setOpen] = useState(false)
  const shift = nurse.shift ? SHIFT_COLORS[nurse.shift] : null

  return (
    <>
      {/* Clickable avatar */}
      <button
        onClick={() => setOpen(true)}
        title={`View ${nurse.nurseName}'s profile`}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(14,123,140,0.1)',
          border: '2px solid rgba(14,123,140,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          padding: 0,
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--teal)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(14,123,140,0.15)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(14,123,140,0.2)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
        }}
      >
        {nurse.photoUrl
          ? <img src={nurse.photoUrl} alt={nurse.nurseName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>👩‍⚕️</span>
        }
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card)', borderRadius: 18, maxWidth: 460, width: '100%',
              boxShadow: '0 24px 70px rgba(0,0,0,0.28)', border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            {/* Card header */}
            <div style={{ background: 'linear-gradient(135deg, rgba(14,123,140,0.12), rgba(10,191,204,0.08))', padding: '24px 24px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(14,123,140,0.1)', border: '3px solid rgba(14,123,140,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0, overflow: 'hidden' }}>
                {nurse.photoUrl
                  ? <img src={nurse.photoUrl} alt={nurse.nurseName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '👩‍⚕️'
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: 4 }}>{nurse.nurseName}</div>
                {nurse.nurseSpecialization && (
                  <span style={{ background: 'rgba(14,123,140,0.1)', color: 'var(--teal)', padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700 }}>
                    {nurse.nurseSpecialization}
                  </span>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {nurse.deptName && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>🏢 {nurse.deptName}</span>
                  )}
                  {nurse.shift && shift && (
                    <span style={{ background: shift.bg, color: shift.color, padding: '2px 8px', borderRadius: 5, fontSize: '0.68rem', fontWeight: 700 }}>
                      {shift.icon} {nurse.shift}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'var(--shell-bg)', border: '1px solid var(--border)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--muted)', flexShrink: 0, padding: 0 }}
              >✕</button>
            </div>

            {/* Card body */}
            <div style={{ padding: '18px 24px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Info rows */}
              {nurse.city && <CardRow icon="📍" label="City" value={nurse.city} />}
              {nurse.nationality && <CardRow icon="🌍" label="Nationality" value={nurse.nationality} />}
              {nurse.gender && <CardRow icon="👤" label="Gender" value={nurse.gender.charAt(0).toUpperCase() + nurse.gender.slice(1)} />}
              {nurse.experienceYears != null && nurse.experienceYears > 0 && (
                <CardRow icon="🏅" label="Experience" value={`${nurse.experienceYears} year${nurse.experienceYears !== 1 ? 's' : ''}`} />
              )}
              {nurse.licenseNo && <CardRow icon="📋" label="License No." value={nurse.licenseNo} />}
              {nurse.phone && <CardRow icon="📞" label="Phone" value={nurse.phone} />}

              {/* Bio */}
              {nurse.bio && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--shell-bg)', borderRadius: 9, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>About</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--ink)', lineHeight: 1.55 }}>{nurse.bio}</div>
                </div>
              )}

              {/* Pricing */}
              {showPrice && nurse.dailyRate && (
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: showCommission && nurse.finalDailyPrice ? '1fr 1fr' : '1fr', gap: 8 }}>
                  <div style={{ background: 'rgba(14,123,140,0.06)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 9, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      {showCommission ? 'Daily Rate' : 'Daily Cost'}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--teal)' }}>
                      SAR {showCommission ? nurse.dailyRate.toFixed(2) : (nurse.finalDailyPrice ?? nurse.dailyRate).toFixed(2)}
                    </div>
                  </div>
                  {showCommission && nurse.finalDailyPrice && (
                    <div style={{ background: 'rgba(26,122,74,0.06)', border: '1px solid rgba(26,122,74,0.15)', borderRadius: 9, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                        Hospital Pays {nurse.commissionPercent ? `(+${nurse.commissionPercent}%)` : ''}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1A7A4A' }}>SAR {nurse.finalDailyPrice.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Status badges */}
              {(nurse.selectionStatus || nurse.nurseResponse) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {nurse.selectionStatus && (
                    <span style={{
                      padding: '4px 12px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700,
                      background: nurse.selectionStatus === 'approved' ? 'rgba(26,122,74,0.08)' : nurse.selectionStatus === 'rejected' ? 'rgba(224,74,74,0.08)' : 'rgba(181,94,0,0.08)',
                      color: nurse.selectionStatus === 'approved' ? '#1A7A4A' : nurse.selectionStatus === 'rejected' ? '#E04A4A' : '#b85e00',
                    }}>
                      {nurse.selectionStatus === 'approved' ? '✅ Admin Approved' : nurse.selectionStatus === 'rejected' ? '✕ Admin Rejected' : '⏳ Awaiting Admin'}
                    </span>
                  )}
                  {nurse.nurseResponse && (
                    <span style={{
                      padding: '4px 12px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700,
                      background: nurse.nurseResponse === 'accepted' ? 'rgba(26,122,74,0.08)' : 'rgba(224,74,74,0.08)',
                      color: nurse.nurseResponse === 'accepted' ? '#1A7A4A' : '#E04A4A',
                    }}>
                      {nurse.nurseResponse === 'accepted' ? '✅ Nurse Accepted' : '✕ Nurse Declined'}
                    </span>
                  )}
                </div>
              )}

              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textAlign: 'center', marginTop: 14 }}>
                ID: {nurse.nurseId.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CardRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{icon} {label}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}
