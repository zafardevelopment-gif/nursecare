'use client'

import { useState, useTransition } from 'react'
import { submitBookingAction } from './actions'

/* ── Types ──────────────────────────────────────────────────── */

export type SMCategory = {
  id: string
  name: string
  icon: string
  description: string | null
}

export type SMService = {
  id: string
  name: string
  description: string | null
  base_price: number
  min_price: number
  max_price: number | null
  duration_minutes: number | null
  requires_equipment: boolean
  category_id: string
}

export type SMNurse = {
  nurseServiceId: string   // nurse_services.id
  nurseUserId:   string    // users.id (for booking)
  nurseDbId:     string    // nurses.id (internal)
  name:          string
  photoUrl:      string | null
  specialization: string
  city:           string
  experienceYears: number
  gender:          string
  nationality:     string
  languages:       string[]
  myPrice:         number   // nurse_services.my_price
  avgRating:       number | null
  isAvailable:     boolean
}

interface Props {
  userId:               string
  userName:             string
  userEmail:            string
  categories:           SMCategory[]
  services:             SMService[]
  nursesByService:      Record<string, SMNurse[]>   // service_id → nurses
  vatRate:              number
  paymentDeadlineHours: number
}

/* ── Constants ──────────────────────────────────────────────── */

const CITIES  = ['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Tabuk','Abha']
const SHIFTS  = [
  { key: 'morning', label: 'Morning', time: '8 AM – 4 PM',  icon: '🌅' },
  { key: 'evening', label: 'Evening', time: '4 PM – 12 AM', icon: '🌆' },
  { key: 'night',   label: 'Night',   time: '12 AM – 8 AM', icon: '🌙' },
]

const nxt = (d: number) => {
  const dt = new Date(); dt.setDate(dt.getDate() + d)
  return dt.toISOString().split('T')[0]
}

/* ── Helpers ────────────────────────────────────────────────── */

const SAR = (n: number) => `SAR ${Number(n).toFixed(0)}`

const cardSt: React.CSSProperties = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  overflow: 'hidden',
}

const btnPrimary: React.CSSProperties = {
  background: 'var(--teal)', color: '#fff', border: 'none',
  padding: '10px 24px', borderRadius: 10, fontSize: '0.88rem',
  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 2px 10px rgba(14,123,140,0.25)',
}

const btnSecondary: React.CSSProperties = {
  background: 'var(--cream)', color: 'var(--muted)',
  border: '1px solid var(--border)',
  padding: '9px 18px', borderRadius: 10, fontSize: '0.85rem',
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}

const inputSt: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 9,
  border: '1px solid var(--border)', fontSize: '0.85rem',
  fontFamily: 'inherit', background: 'var(--cream)',
  width: '100%', boxSizing: 'border-box',
}

/* ── Main Component ─────────────────────────────────────────── */

export default function ServiceMasterBookingClient({
  userId, userName, userEmail,
  categories, services, nursesByService,
  vatRate, paymentDeadlineHours,
}: Props) {

  // Step: 1=category, 2=service, 3=nurse, 4=details, 5=confirm, 6=success
  const [step,            setStep]           = useState(1)
  const [selectedCat,     setSelectedCat]    = useState<SMCategory | null>(null)
  const [selectedSvc,     setSelectedSvc]    = useState<SMService | null>(null)
  const [selectedNurse,   setSelectedNurse]  = useState<SMNurse | null>(null)
  const [catFilter,       setCatFilter]      = useState<string>('all')

  // Booking details
  const [city,       setCity]       = useState(CITIES[0])
  const [address,    setAddress]    = useState('')
  const [shift,      setShift]      = useState('morning')
  const [startDate,  setStartDate]  = useState(nxt(1))
  const [endDate,    setEndDate]    = useState(nxt(1))
  const [bookingType, setBookingType] = useState<'one_time' | 'weekly' | 'monthly'>('one_time')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [notes,      setNotes]      = useState('')

  // UI state
  const [error,      setError]      = useState<string | null>(null)
  const [bookingRef, setBookingRef] = useState('')
  const [sessions,   setSessions]   = useState(0)
  const [isPending,  startTransition] = useTransition()

  const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  function toggleDay(d: number) {
    setSelectedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])
  }

  /* ── Derived ── */

  const catServices = selectedCat
    ? services.filter(s => s.category_id === selectedCat.id)
    : services

  const nursesForSvc: SMNurse[] = selectedSvc
    ? (nursesByService[selectedSvc.id] ?? [])
    : []

  // Sort: available first, then by price ascending
  const sortedNurses = [...nursesForSvc].sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1
    return a.myPrice - b.myPrice
  })

  /* ── Price calc ── */
  function calcTotal(price: number, durationMins: number | null) {
    // Price is per session (not per hour) in Service Master
    const base  = price
    const vat   = Math.round(base * (vatRate / 100))
    const total = base + vat
    return { base, vat, total }
  }

  /* ── Submit ── */
  async function handleSubmit() {
    if (!selectedNurse || !selectedSvc) return
    setError(null)

    const fd = new FormData()
    fd.set('user_id',    userId)
    fd.set('user_name',  userName)
    fd.set('user_email', userEmail)
    // Service fields
    fd.set('service_id',   selectedSvc.id)
    fd.set('service_type', selectedSvc.name)
    fd.set('service_price', String(selectedNurse.myPrice))
    // Booking fields
    fd.set('nurse_id',    selectedNurse.nurseUserId)
    fd.set('nurse_name',  selectedNurse.name)
    fd.set('city',        city)
    fd.set('address',     address)
    fd.set('shift',       shift)
    fd.set('start_date',  startDate)
    fd.set('end_date',    bookingType === 'one_time' ? startDate : endDate)
    fd.set('booking_type', bookingType)
    fd.set('duration',    String(selectedSvc.duration_minutes ? Math.ceil(selectedSvc.duration_minutes / 60) : 2))
    fd.set('notes',       notes)
    fd.set('patient_condition', '')
    // Ledger fields
    fd.set('ledger_service_id',   selectedSvc.id)
    fd.set('ledger_service_name', selectedSvc.name)
    fd.set('ledger_unit_price',   String(selectedNurse.myPrice))
    // Days of week for weekly bookings
    selectedDays.forEach(d => fd.append('days_of_week', String(d)))

    startTransition(async () => {
      const result = await submitBookingAction(fd)
      if (result.error) { setError(result.error); return }
      setBookingRef(result.bookingRef ?? '')
      setSessions(result.sessions ?? 1)
      setStep(6)
    })
  }

  /* ── Step validation ── */
  function canProceedToDetails() {
    return !!selectedNurse
  }
  function canConfirm() {
    if (!city) return false
    if (bookingType === 'weekly' && selectedDays.length === 0) return false
    if ((bookingType === 'weekly' || bookingType === 'monthly') && !endDate) return false
    return true
  }

  /* ── Render helpers ── */
  function StepIndicator() {
    const steps = ['Category','Service','Nurse','Details','Confirm']
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: 4 }}>
        {steps.map((label, i) => {
          const n = i + 1
          const done    = step > n
          const current = step === n
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20,
                background: current ? 'var(--teal)' : done ? 'rgba(14,123,140,0.1)' : 'var(--cream)',
                border: `1px solid ${current ? 'transparent' : done ? 'rgba(14,123,140,0.25)' : 'var(--border)'}`,
                color: current ? '#fff' : done ? 'var(--teal)' : 'var(--muted)',
                fontSize: '0.76rem', fontWeight: 700, whiteSpace: 'nowrap',
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: current ? 'rgba(255,255,255,0.3)' : done ? 'var(--teal)' : 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.68rem', fontWeight: 900, color: done ? '#fff' : current ? '#fff' : 'var(--muted)',
                  flexShrink: 0,
                }}>
                  {done ? '✓' : n}
                </span>
                {label}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 20, height: 1, background: 'var(--border)', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  /* ══ STEP 6: SUCCESS ══ */
  if (step === 6) {
    return (
      <div className="dash-shell">
        <div style={{ ...cardSt, padding: '3rem 2rem', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem' }}>Booking Submitted!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Your booking for <strong>{selectedSvc?.name}</strong> with <strong>{selectedNurse?.name}</strong> has been submitted.
            {sessions > 1 && ` (${sessions} sessions)`}
            {paymentDeadlineHours > 0 && ` Complete payment within ${paymentDeadlineHours} hour${paymentDeadlineHours !== 1 ? 's' : ''} to confirm.`}
          </p>
          {bookingRef && (
            <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: '1.5rem', background: 'var(--cream)', padding: '8px 14px', borderRadius: 8, display: 'inline-block' }}>
              Ref: {bookingRef.slice(0, 8).toUpperCase()}
            </div>
          )}
          <a href="/patient/bookings" style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none' }}>
            View My Bookings →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Book a Service</h1>
          <p className="dash-sub">Choose from our professional care catalog</p>
        </div>
      </div>

      <StepIndicator />

      {error && (
        <div style={{ background: 'rgba(224,74,74,0.08)', border: '1px solid rgba(224,74,74,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: '1rem', color: '#c0392b', fontSize: '0.84rem', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ══ STEP 1: SELECT CATEGORY ══ */}
      {step === 1 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>What type of care do you need?</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.85rem',
          }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setSelectedCat(cat); setSelectedSvc(null); setSelectedNurse(null); setStep(2) }}
                style={{
                  ...cardSt,
                  padding: '1.2rem 1rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: selectedCat?.id === cat.id ? 'rgba(14,123,140,0.07)' : 'var(--card-bg, #fff)',
                  border: selectedCat?.id === cat.id ? '2px solid var(--teal)' : '1px solid var(--border)',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{cat.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{cat.name}</div>
                {cat.description && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                    {cat.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ STEP 2: SELECT SERVICE ══ */}
      {step === 2 && selectedCat && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.2rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setStep(1)} style={btnSecondary}>← Back</button>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                {selectedCat.icon} {selectedCat.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Select the specific service</div>
            </div>
          </div>

          {catServices.length === 0 ? (
            <div style={{ ...cardSt, padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
              No services available in this category yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {catServices.map(svc => {
                const nurseCount = (nursesByService[svc.id] ?? []).length
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => {
                      if (nurseCount === 0) return
                      setSelectedSvc(svc)
                      setSelectedNurse(null)
                      setStep(3)
                    }}
                    disabled={nurseCount === 0}
                    style={{
                      ...cardSt,
                      padding: '1rem 1.2rem',
                      textAlign: 'left',
                      cursor: nurseCount === 0 ? 'not-allowed' : 'pointer',
                      opacity: nurseCount === 0 ? 0.5 : 1,
                      border: selectedSvc?.id === svc.id ? '2px solid var(--teal)' : '1px solid var(--border)',
                      background: selectedSvc?.id === svc.id ? 'rgba(14,123,140,0.05)' : 'var(--card-bg, #fff)',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                      display: 'block', width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4 }}>{svc.name}</div>
                        {svc.description && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.4, marginBottom: 6 }}>
                            {svc.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#27A869', fontWeight: 700 }}>
                            From {SAR(svc.min_price)}
                          </span>
                          {svc.duration_minutes && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                              ⏱ {svc.duration_minutes} min
                            </span>
                          )}
                          {svc.requires_equipment && (
                            <span style={{ fontSize: '0.72rem', color: '#b85e00', background: 'rgba(184,94,0,0.08)', padding: '2px 7px', borderRadius: 20 }}>
                              🔧 Equipment
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {nurseCount > 0 ? (
                          <span style={{ fontSize: '0.76rem', background: 'rgba(14,123,140,0.08)', color: 'var(--teal)', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
                            {nurseCount} nurse{nurseCount !== 1 ? 's' : ''} available →
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                            No nurses yet
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ STEP 3: SELECT NURSE ══ */}
      {step === 3 && selectedSvc && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.2rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setStep(2)} style={btnSecondary}>← Back</button>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedSvc.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                Choose your nurse · {sortedNurses.length} available
              </div>
            </div>
          </div>

          {sortedNurses.length === 0 ? (
            <div style={{ ...cardSt, padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🩺</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>No nurses available for this service</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>Check back later or choose a different service.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {sortedNurses.map(nurse => (
                <NurseCard
                  key={nurse.nurseServiceId}
                  nurse={nurse}
                  service={selectedSvc}
                  isSelected={selectedNurse?.nurseServiceId === nurse.nurseServiceId}
                  onSelect={() => setSelectedNurse(nurse)}
                />
              ))}
            </div>
          )}

          {selectedNurse && (
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setStep(4)}
                style={btnPrimary}
              >
                Continue with {selectedNurse.name.split(' ')[0]} →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ STEP 4: BOOKING DETAILS ══ */}
      {step === 4 && selectedSvc && selectedNurse && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,340px)', gap: '1.5rem', alignItems: 'start' }}>

          {/* Left: form */}
          <div style={{ ...cardSt }}>
            <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Booking Details</div>
              <button type="button" onClick={() => setStep(3)} style={{ ...btnSecondary, padding: '5px 12px', fontSize: '0.78rem' }}>← Change Nurse</button>
            </div>
            <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Booking type */}
              <div>
                <label style={labelSt}>Booking Type</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(['one_time','weekly','monthly'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setBookingType(t)
                        if (t === 'one_time') setEndDate(startDate)
                        else setEndDate(nxt(8))
                      }}
                      style={{
                        padding: '7px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                        border: bookingType === t ? 'none' : '1px solid var(--border)',
                        background: bookingType === t ? 'var(--teal)' : 'var(--cream)',
                        color: bookingType === t ? '#fff' : 'var(--muted)',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {t === 'one_time' ? '1× One-time' : t === 'weekly' ? '📅 Weekly' : '🗓 Monthly'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: bookingType === 'one_time' ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelSt}>{bookingType === 'one_time' ? 'Date' : 'Start Date'}</label>
                  <input
                    type="date"
                    value={startDate}
                    min={nxt(1)}
                    onChange={e => { setStartDate(e.target.value); if (bookingType === 'one_time') setEndDate(e.target.value) }}
                    style={inputSt}
                  />
                </div>
                {bookingType !== 'one_time' && (
                  <div>
                    <label style={labelSt}>End Date</label>
                    <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={inputSt} />
                  </div>
                )}
              </div>

              {/* Days of week for weekly */}
              {bookingType === 'weekly' && (
                <div>
                  <label style={labelSt}>Days of Week *</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {WEEKDAYS.map((day, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                          border: selectedDays.includes(i) ? 'none' : '1px solid var(--border)',
                          background: selectedDays.includes(i) ? 'var(--teal)' : 'var(--cream)',
                          color: selectedDays.includes(i) ? '#fff' : 'var(--muted)',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Shift */}
              <div>
                <label style={labelSt}>Preferred Shift</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {SHIFTS.map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setShift(s.key)}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                        border: shift === s.key ? 'none' : '1px solid var(--border)',
                        background: shift === s.key ? 'var(--teal)' : 'var(--cream)',
                        color: shift === s.key ? '#fff' : 'var(--muted)',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {s.icon} {s.label} · {s.time}
                    </button>
                  ))}
                </div>
              </div>

              {/* City & Address */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelSt}>City *</label>
                  <select value={city} onChange={e => setCity(e.target.value)} style={inputSt}>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Address</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, building..." style={inputSt} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelSt}>Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any special instructions or medical conditions to share..."
                  style={{ ...inputSt, resize: 'vertical' }}
                />
              </div>

            </div>
            <div style={{ padding: '1rem 1.2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setStep(3)} style={btnSecondary}>← Back</button>
              <button
                type="button"
                onClick={() => { if (canConfirm()) setStep(5); else setError('Please fill all required fields and select at least one day for weekly bookings.') }}
                style={btnPrimary}
              >
                Review & Confirm →
              </button>
            </div>
          </div>

          {/* Right: mini price card */}
          <div style={{ ...cardSt, position: 'sticky', top: 20 }}>
            <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>Price Summary</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>per session</div>
            </div>
            <div style={{ padding: '1rem 1.2rem' }}>
              <MiniPriceSummary nurse={selectedNurse} service={selectedSvc} vatRate={vatRate} />
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 5: CONFIRM ══ */}
      {step === 5 && selectedSvc && selectedNurse && (
        <div style={{ maxWidth: 580 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.2rem' }}>
            <button type="button" onClick={() => setStep(4)} style={btnSecondary}>← Back</button>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Confirm Booking</div>
          </div>

          <div style={{ ...cardSt, marginBottom: '1rem' }}>
            <SummaryRow label="Service" value={`${selectedCat?.icon} ${selectedSvc.name}`} />
            <SummaryRow label="Nurse"   value={selectedNurse.name} />
            <SummaryRow label="Date"    value={bookingType === 'one_time' ? startDate : `${startDate} → ${endDate}`} />
            <SummaryRow label="Shift"   value={(SHIFTS.find(s => s.key === shift)?.label ?? shift) + ' · ' + (SHIFTS.find(s => s.key === shift)?.time ?? '')} />
            <SummaryRow label="City"    value={city} />
            {address && <SummaryRow label="Address" value={address} />}
            {bookingType === 'weekly' && <SummaryRow label="Days" value={selectedDays.map(d => WEEKDAYS[d]).join(', ')} />}
            {notes && <SummaryRow label="Notes" value={notes} />}
          </div>

          <div style={{ ...cardSt, marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.2rem' }}>
              <MiniPriceSummary nurse={selectedNurse} service={selectedSvc} vatRate={vatRate} full />
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(224,74,74,0.08)', border: '1px solid rgba(224,74,74,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: '1rem', color: '#c0392b', fontSize: '0.84rem', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            style={{ ...btnPrimary, width: '100%', padding: '12px', fontSize: '0.95rem', opacity: isPending ? 0.7 : 1, cursor: isPending ? 'not-allowed' : 'pointer' }}
          >
            {isPending ? 'Submitting…' : 'Confirm Booking →'}
          </button>

          {paymentDeadlineHours > 0 && (
            <p style={{ fontSize: '0.74rem', color: 'var(--muted)', textAlign: 'center', marginTop: 10 }}>
              Payment required within {paymentDeadlineHours} hour{paymentDeadlineHours !== 1 ? 's' : ''} to confirm your booking.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Nurse Card ─────────────────────────────────────────────── */

function NurseCard({ nurse, service, isSelected, onSelect }: {
  nurse: SMNurse
  service: SMService
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        background: isSelected ? 'rgba(14,123,140,0.05)' : 'var(--card-bg, #fff)',
        border: isSelected ? '2px solid var(--teal)' : '1px solid var(--border)',
        borderRadius: 14, padding: '1rem 1.2rem',
        textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
        width: '100%', transition: 'all 0.15s',
        display: 'block',
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', overflow: 'hidden',
        }}>
          {nurse.photoUrl
            ? <img src={nurse.photoUrl} alt={nurse.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : nurse.gender === 'male' ? '👨‍⚕️' : '👩‍⚕️'
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{nurse.name}</span>
            {!nurse.isAvailable && (
              <span style={{ fontSize: '0.68rem', color: '#b85e00', background: 'rgba(184,94,0,0.08)', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>
                Busy today
              </span>
            )}
            {nurse.isAvailable && (
              <span style={{ fontSize: '0.68rem', color: '#27A869', background: 'rgba(39,168,105,0.08)', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>
                ● Available
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 }}>
            {nurse.specialization} · {nurse.city}
            {nurse.experienceYears > 0 && ` · ${nurse.experienceYears} yrs exp`}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {nurse.avgRating !== null && (
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F5842A' }}>
                ⭐ {nurse.avgRating.toFixed(1)}
              </span>
            )}
            {nurse.languages.length > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                🗣 {nurse.languages.slice(0, 2).join(', ')}
              </span>
            )}
            {nurse.nationality && (
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                {nurse.nationality}
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--teal)' }}>
            SAR {nurse.myPrice}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>
            per session
            {service.duration_minutes && ` · ${service.duration_minutes} min`}
          </div>
          {isSelected && (
            <div style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--teal)', fontWeight: 700 }}>
              ✓ Selected
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

/* ── Mini Price Summary ─────────────────────────────────────── */

function MiniPriceSummary({ nurse, service, vatRate, full = false }: {
  nurse: SMNurse
  service: SMService
  vatRate: number
  full?: boolean
}) {
  const base  = nurse.myPrice
  const vat   = Math.round(base * vatRate / 100)
  const total = base + vat

  return (
    <div style={{ fontSize: '0.84rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: 'var(--muted)' }}>{service.name}</span>
        <span style={{ fontWeight: 600 }}>{SAR(base)}</span>
      </div>
      {full && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--muted)' }}>VAT ({vatRate}%)</span>
          <span>{SAR(vat)}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
        <span style={{ fontWeight: 700 }}>Total per session</span>
        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--teal)' }}>{SAR(total)}</span>
      </div>
      {!full && (
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>
          + {vatRate}% VAT · per session
        </div>
      )}
    </div>
  )
}

/* ── Summary Row ────────────────────────────────────────────── */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '0.75rem 1.2rem', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const labelSt: React.CSSProperties = {
  display: 'block', fontSize: '0.74rem', fontWeight: 700,
  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
}
