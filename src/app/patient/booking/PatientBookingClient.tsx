'use client'

import { useState, useTransition } from 'react'
import { submitBookingAction } from './actions'

type Nurse = {
  id: string
  name: string
  specialization: string
  city: string
  hourlyRate: number
  photoUrl: string | null
}

type Mode = 'smart' | 'browse' | 'ai'

const SERVICES = ['Home Nursing','ICU Care','Post-Surgery Care','Elderly Care','Pediatric Care','Wound Care','IV Therapy','Physiotherapy','General Care']
const CITIES = ['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Tabuk','Abha']
const SHIFTS = ['Morning (8AM–4PM)', 'Evening (4PM–12AM)', 'Night (12AM–8AM)', 'Full Day (24hrs)']

const modeConfig = {
  smart: { icon: '🎯', label: 'Smart Match', desc: 'Tell us your needs — we find the best nurse', color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)', steps: ['Requirements', 'Matched Nurses', 'Schedule', 'Confirm'] },
  browse: { icon: '🔍', label: 'Browse & Book', desc: 'Browse nurse profiles and pick your preferred nurse', color: '#7B2FBE', bg: 'rgba(123,47,190,0.08)', steps: ['Browse Nurses', 'Service Details', 'Confirm'] },
  ai: { icon: '🤖', label: 'AI Assistant', desc: 'Chat with our AI to get personalized recommendations', color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)', steps: ['Chat', 'Review', 'Confirm'] },
}

const tomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]
}

export default function PatientBookingClient({ userId, userName, nurses }: { userId: string; userName: string; nurses: Nurse[] }) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Smart Match form state
  const [smartForm, setSmartForm] = useState({
    service_type: '', patient_condition: '', city: '', shift: '', duration: '8',
    start_date: tomorrow(), end_date: '', booking_type: 'one_time' as 'one_time' | 'weekly' | 'monthly',
    notes: '', address: '',
  })
  const [matchedNurse, setMatchedNurse] = useState<Nurse | null>(null)

  // Browse & Book state
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null)
  const [browseSearch, setBrowseSearch] = useState('')
  const [browseCity, setBrowseCity] = useState('All')
  const [browseService, setBrowseService] = useState('')
  const [browseShift, setBrowseShift] = useState('')
  const [browseDate, setBrowseDate] = useState(tomorrow())
  const [browseAddress, setBrowseAddress] = useState('')
  const [browseNotes, setBrowseNotes] = useState('')

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: `Hello ${userName}! 👋 I'm your NurseCare+ AI assistant. Tell me about your care needs and I'll help find the perfect nurse for you. What kind of care are you looking for?` }
  ])
  const [chatInput, setChatInput] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<Nurse | null>(null)

  const currentMode = mode ? modeConfig[mode] : null
  const steps = currentMode?.steps ?? []

  function resetAll() {
    setMode(null); setStep(0); setError(''); setSuccess(false)
    setMatchedNurse(null); setSelectedNurse(null)
  }

  function handleSmartMatch() {
    // Simulate matching: pick nurse from same city or any
    const cityMatch = nurses.filter(n => n.city === smartForm.city)
    const pool = cityMatch.length > 0 ? cityMatch : nurses
    if (pool.length > 0) {
      setMatchedNurse(pool[Math.floor(Math.random() * pool.length)])
    } else {
      setMatchedNurse({
        id: 'demo', name: 'Reem Al-Ghamdi', specialization: smartForm.service_type || 'General Nursing',
        city: smartForm.city || 'Riyadh', hourlyRate: 85, photoUrl: null,
      })
    }
    setStep(1)
  }

  function handleAiSend() {
    if (!chatInput.trim()) return
    const userMsg = chatInput.trim()
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setChatInput('')

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        'I understand. Based on your needs, I recommend looking for a nurse with experience in home care. What city are you located in?',
        'Great! I found some excellent matches for you. Based on your requirements, I\'ve identified a nurse who specializes in exactly what you need. Would you like to see her profile?',
        'I\'ve prepared a recommendation for you! Nurse Reem Al-Ghamdi has 5 years of experience and excellent reviews. She\'s available in your area. Shall I set up a booking?',
      ]
      const idx = Math.min(chatMessages.filter(m => m.role === 'ai').length, responses.length - 1)
      setChatMessages(prev => [...prev, { role: 'ai', text: responses[idx] }])

      if (idx >= 1 && !aiSuggestion && nurses.length > 0) {
        setAiSuggestion(nurses[0])
      }
    }, 800)
  }

  async function submitBooking(formData: FormData) {
    startTransition(async () => {
      const result = await submitBookingAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <div className="dash-shell">
        <div style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ color: 'var(--ink)', fontWeight: 800, marginBottom: '0.5rem' }}>Booking Submitted!</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Your booking request has been submitted successfully. A nurse will be assigned shortly.
          </p>
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
            <a href="/patient/bookings" style={{
              background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff',
              padding: '11px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem',
              textDecoration: 'none',
            }}>View My Bookings</a>
            <button onClick={resetAll} style={{
              background: 'var(--shell-bg)', color: 'var(--ink)',
              padding: '11px 24px', borderRadius: 10, fontWeight: 600, fontSize: '0.88rem',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}>Book Another</button>
          </div>
        </div>
      </div>
    )
  }

  // Mode selection screen
  if (!mode) {
    return (
      <div className="dash-shell">
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="dash-title">Book a Nurse</h1>
          <p className="dash-sub">Choose how you'd like to find and book your nurse</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.2rem', maxWidth: 900 }}>
          {(Object.entries(modeConfig) as [Mode, typeof modeConfig[Mode]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setMode(key); setStep(0) }}
              style={{
                background: 'var(--card)', border: `2px solid ${cfg.color}25`,
                borderRadius: 16, padding: '1.8rem 1.5rem', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 14, background: cfg.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', marginBottom: '1rem',
              }}>{cfg.icon}</div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: 6 }}>{cfg.label}</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--muted)', lineHeight: 1.5 }}>{cfg.desc}</div>
              <div style={{
                marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: 6,
                color: cfg.color, fontWeight: 700, fontSize: '0.82rem',
              }}>
                Get Started <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── SMART MATCH ─────────────────────────────────────────────────────────────
  if (mode === 'smart') {
    return (
      <div className="dash-shell">
        <StepHeader steps={steps} current={step} color={currentMode!.color} onBack={step > 0 ? () => setStep(s => s - 1) : resetAll} title="Smart Match" />

        {step === 0 && (
          <div style={{ maxWidth: 560 }}>
            <div className="dash-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.2rem', color: 'var(--ink)', fontWeight: 700 }}>Tell us your requirements</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Service Type *</label>
                  <select className="form-input" value={smartForm.service_type} onChange={e => setSmartForm(p => ({ ...p, service_type: e.target.value }))} required>
                    <option value="">Select service</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Patient Condition *</label>
                  <input className="form-input" value={smartForm.patient_condition} onChange={e => setSmartForm(p => ({ ...p, patient_condition: e.target.value }))} placeholder="e.g. Diabetes, post-surgery" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <select className="form-input" value={smartForm.city} onChange={e => setSmartForm(p => ({ ...p, city: e.target.value }))}>
                      <option value="">Select city</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Shift</label>
                    <select className="form-input" value={smartForm.shift} onChange={e => setSmartForm(p => ({ ...p, shift: e.target.value }))}>
                      <option value="">Any shift</option>
                      {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Additional Notes</label>
                  <textarea className="form-input" rows={2} value={smartForm.notes} onChange={e => setSmartForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special requirements..." style={{ resize: 'vertical' }} />
                </div>
              </div>
            </div>
            <BottomBar>
              <button
                onClick={handleSmartMatch}
                disabled={!smartForm.service_type || !smartForm.patient_condition || !smartForm.city}
                style={{
                  background: !smartForm.service_type || !smartForm.patient_condition || !smartForm.city
                    ? 'rgba(14,123,140,0.4)' : 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
                  color: '#fff', padding: '13px 32px', borderRadius: 10, fontWeight: 700,
                  fontSize: '0.9rem', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                Find Matching Nurses →
              </button>
            </BottomBar>
          </div>
        )}

        {step === 1 && (
          <div style={{ maxWidth: 640 }}>
            <div className="dash-card" style={{ marginBottom: '1rem' }}>
              <div className="dash-card-header"><span className="dash-card-title">Best Match Found</span></div>
              <div className="dash-card-body">
                {matchedNurse ? (
                  <NurseCard nurse={matchedNurse} selected={true} onSelect={() => {}} color={currentMode!.color} />
                ) : (
                  <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>No nurses available in your area right now.</p>
                )}
              </div>
            </div>
            <BottomBar>
              <button onClick={() => setStep(2)} disabled={!matchedNurse} style={{
                background: !matchedNurse ? 'rgba(14,123,140,0.4)' : 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
                color: '#fff', padding: '13px 32px', borderRadius: 10, fontWeight: 700,
                fontSize: '0.9rem', border: 'none', cursor: 'pointer',
              }}>
                Book This Nurse →
              </button>
            </BottomBar>
          </div>
        )}

        {step === 2 && (
          <div style={{ maxWidth: 560 }}>
            <div className="dash-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.2rem', color: 'var(--ink)', fontWeight: 700 }}>Schedule Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={smartForm.start_date} min={tomorrow()} onChange={e => setSmartForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Shift *</label>
                    <select className="form-input" value={smartForm.shift} onChange={e => setSmartForm(p => ({ ...p, shift: e.target.value }))}>
                      <option value="">Select shift</option>
                      {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (hrs)</label>
                    <select className="form-input" value={smartForm.duration} onChange={e => setSmartForm(p => ({ ...p, duration: e.target.value }))}>
                      {['4','8','12','24'].map(h => <option key={h} value={h}>{h} Hours</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Full Address *</label>
                  <input className="form-input" value={smartForm.address} onChange={e => setSmartForm(p => ({ ...p, address: e.target.value }))} placeholder="Street, district, building number" />
                </div>
              </div>
            </div>
            <BottomBar>
              <button
                onClick={() => setStep(3)}
                disabled={!smartForm.start_date || !smartForm.shift || !smartForm.address}
                style={{
                  background: !smartForm.start_date || !smartForm.shift || !smartForm.address
                    ? 'rgba(14,123,140,0.4)' : 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
                  color: '#fff', padding: '13px 32px', borderRadius: 10, fontWeight: 700,
                  fontSize: '0.9rem', border: 'none', cursor: 'pointer',
                }}
              >
                Review & Confirm →
              </button>
            </BottomBar>
          </div>
        )}

        {step === 3 && (
          <form action={submitBooking} style={{ maxWidth: 560 }}>
            <input type="hidden" name="service_type" value={smartForm.service_type} />
            <input type="hidden" name="patient_condition" value={smartForm.patient_condition} />
            <input type="hidden" name="city" value={smartForm.city} />
            <input type="hidden" name="shift" value={smartForm.shift} />
            <input type="hidden" name="duration" value={smartForm.duration} />
            <input type="hidden" name="start_date" value={smartForm.start_date} />
            <input type="hidden" name="booking_type" value={smartForm.booking_type} />
            <input type="hidden" name="address" value={smartForm.address} />
            <input type="hidden" name="notes" value={smartForm.notes} />

            <div className="dash-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 1.2rem', color: 'var(--ink)', fontWeight: 700 }}>Booking Summary</h3>
              {error && <div className="auth-error" style={{ marginBottom: '1rem' }}><span>⚠️</span> {error}</div>}
              <SummaryRow label="Nurse" value={matchedNurse?.name ?? '—'} />
              <SummaryRow label="Service" value={smartForm.service_type} />
              <SummaryRow label="Condition" value={smartForm.patient_condition} />
              <SummaryRow label="City" value={smartForm.city} />
              <SummaryRow label="Date" value={smartForm.start_date} />
              <SummaryRow label="Shift" value={smartForm.shift} />
              <SummaryRow label="Duration" value={`${smartForm.duration} hours`} />
              <SummaryRow label="Address" value={smartForm.address} />
              {smartForm.notes && <SummaryRow label="Notes" value={smartForm.notes} />}
              {matchedNurse && (
                <div style={{ marginTop: '1rem', padding: '12px', background: 'rgba(14,123,140,0.06)', borderRadius: 10, border: '1px solid rgba(14,123,140,0.15)' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Estimated Cost</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0E7B8C' }}>SAR {matchedNurse.hourlyRate * parseInt(smartForm.duration)}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>SAR {matchedNurse.hourlyRate}/hr × {smartForm.duration} hrs</div>
                </div>
              )}
            </div>
            <BottomBar>
              <button type="submit" disabled={isPending} style={{
                background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff',
                padding: '13px 32px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem',
                border: 'none', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1,
              }}>
                {isPending ? 'Submitting...' : '✅ Confirm Booking'}
              </button>
            </BottomBar>
          </form>
        )}
      </div>
    )
  }

  // ── BROWSE & BOOK ────────────────────────────────────────────────────────────
  if (mode === 'browse') {
    const filteredNurses = nurses.filter(n =>
      (browseCity === 'All' || n.city === browseCity) &&
      (browseSearch === '' || n.name.toLowerCase().includes(browseSearch.toLowerCase()) || n.specialization.toLowerCase().includes(browseSearch.toLowerCase()))
    )

    return (
      <div className="dash-shell">
        <StepHeader steps={steps} current={step} color={currentMode!.color} onBack={step > 0 ? () => setStep(s => s - 1) : resetAll} title="Browse & Book" />

        {step === 0 && (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by name or specialization..."
                value={browseSearch}
                onChange={e => setBrowseSearch(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: 200, fontSize: '0.88rem' }}
              />
              <select value={browseCity} onChange={e => setBrowseCity(e.target.value)} className="form-input" style={{ width: 'auto', fontSize: '0.88rem' }}>
                <option value="All">All Cities</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {filteredNurses.length === 0 ? (
              <div className="dash-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>No nurses found</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 4 }}>Try adjusting your search or city filter</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredNurses.map(nurse => (
                  <NurseCard
                    key={nurse.id}
                    nurse={nurse}
                    selected={selectedNurse?.id === nurse.id}
                    onSelect={() => setSelectedNurse(nurse)}
                    color={currentMode!.color}
                    showSelect
                  />
                ))}
              </div>
            )}

            <BottomBar>
              <button
                onClick={() => setStep(1)}
                disabled={!selectedNurse}
                style={{
                  background: !selectedNurse ? 'rgba(123,47,190,0.4)' : 'linear-gradient(135deg,#7B2FBE,#9B59F0)',
                  color: '#fff', padding: '13px 32px', borderRadius: 10, fontWeight: 700,
                  fontSize: '0.9rem', border: 'none', cursor: selectedNurse ? 'pointer' : 'not-allowed',
                }}
              >
                {selectedNurse ? `Book ${selectedNurse.name.split(' ')[0]} →` : 'Select a Nurse to Continue'}
              </button>
            </BottomBar>
          </div>
        )}

        {step === 1 && selectedNurse && (
          <div style={{ maxWidth: 560 }}>
            <div className="dash-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.2rem', padding: '12px', background: 'rgba(123,47,190,0.06)', borderRadius: 10 }}>
                <NurseAvatar nurse={selectedNurse} size={44} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{selectedNurse.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{selectedNurse.specialization} · {selectedNurse.city}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Service Type *</label>
                  <select className="form-input" value={browseService} onChange={e => setBrowseService(e.target.value)} required>
                    <option value="">Select service</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={browseDate} min={tomorrow()} onChange={e => setBrowseDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Shift *</label>
                    <select className="form-input" value={browseShift} onChange={e => setBrowseShift(e.target.value)}>
                      <option value="">Select shift</option>
                      {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Full Address *</label>
                  <input className="form-input" value={browseAddress} onChange={e => setBrowseAddress(e.target.value)} placeholder="Street, district, building number" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea className="form-input" rows={2} value={browseNotes} onChange={e => setBrowseNotes(e.target.value)} placeholder="Special requirements..." style={{ resize: 'vertical' }} />
                </div>
              </div>
            </div>
            <BottomBar>
              <button
                onClick={() => setStep(2)}
                disabled={!browseService || !browseDate || !browseShift || !browseAddress}
                style={{
                  background: !browseService || !browseDate || !browseShift || !browseAddress
                    ? 'rgba(123,47,190,0.4)' : 'linear-gradient(135deg,#7B2FBE,#9B59F0)',
                  color: '#fff', padding: '13px 32px', borderRadius: 10, fontWeight: 700,
                  fontSize: '0.9rem', border: 'none', cursor: 'pointer',
                }}
              >
                Review & Confirm →
              </button>
            </BottomBar>
          </div>
        )}

        {step === 2 && selectedNurse && (
          <form action={submitBooking} style={{ maxWidth: 560 }}>
            <input type="hidden" name="service_type" value={browseService} />
            <input type="hidden" name="patient_condition" value="General care" />
            <input type="hidden" name="city" value={selectedNurse.city} />
            <input type="hidden" name="shift" value={browseShift} />
            <input type="hidden" name="duration" value="8" />
            <input type="hidden" name="start_date" value={browseDate} />
            <input type="hidden" name="booking_type" value="one_time" />
            <input type="hidden" name="address" value={browseAddress} />
            <input type="hidden" name="notes" value={browseNotes} />

            <div className="dash-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 1.2rem', color: 'var(--ink)', fontWeight: 700 }}>Booking Summary</h3>
              {error && <div className="auth-error" style={{ marginBottom: '1rem' }}><span>⚠️</span> {error}</div>}
              <SummaryRow label="Nurse" value={selectedNurse.name} />
              <SummaryRow label="Service" value={browseService} />
              <SummaryRow label="Date" value={browseDate} />
              <SummaryRow label="Shift" value={browseShift} />
              <SummaryRow label="Address" value={browseAddress} />
              {browseNotes && <SummaryRow label="Notes" value={browseNotes} />}
              <div style={{ marginTop: '1rem', padding: '12px', background: 'rgba(123,47,190,0.06)', borderRadius: 10 }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Estimated Cost</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7B2FBE' }}>SAR {selectedNurse.hourlyRate * 8}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>SAR {selectedNurse.hourlyRate}/hr × 8 hrs</div>
              </div>
            </div>
            <BottomBar>
              <button type="submit" disabled={isPending} style={{
                background: 'linear-gradient(135deg,#7B2FBE,#9B59F0)', color: '#fff',
                padding: '13px 32px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem',
                border: 'none', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1,
              }}>
                {isPending ? 'Submitting...' : '✅ Confirm Booking'}
              </button>
            </BottomBar>
          </form>
        )}
      </div>
    )
  }

  // ── AI ASSISTANT ─────────────────────────────────────────────────────────────
  if (mode === 'ai') {
    return (
      <div className="dash-shell">
        <StepHeader steps={steps} current={step} color={currentMode!.color} onBack={resetAll} title="AI Assistant" />

        {step === 0 && (
          <div className="ai-chat-layout">
            {/* Chat window */}
            <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', height: 500 }}>
              <div className="dash-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1A7A4A,#0ABFCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🤖</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>NurseCare+ AI</div>
                    <div style={{ fontSize: '0.68rem', color: '#1A7A4A', fontWeight: 600 }}>● Online</div>
                  </div>
                </div>
              </div>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg,#1A7A4A,#0ABFCC)' : 'var(--shell-bg)',
                      color: msg.role === 'user' ? '#fff' : 'var(--ink)',
                      fontSize: '0.85rem', lineHeight: 1.5,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              {/* Input */}
              <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend() } }}
                  placeholder="Describe your care needs..."
                  className="form-input"
                  style={{ flex: 1, fontSize: '0.85rem' }}
                />
                <button onClick={handleAiSend} style={{
                  background: 'linear-gradient(135deg,#1A7A4A,#0ABFCC)', color: '#fff',
                  padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                }}>Send</button>
              </div>
            </div>

            {/* AI Suggestions sidebar */}
            <div>
              <div className="dash-card" style={{ marginBottom: '1rem' }}>
                <div className="dash-card-header"><span className="dash-card-title">AI Recommendation</span></div>
                <div className="dash-card-body">
                  {aiSuggestion ? (
                    <div>
                      <NurseCard nurse={aiSuggestion} selected={false} onSelect={() => {}} color="#1A7A4A" />
                      <button onClick={() => { setSelectedNurse(aiSuggestion); setStep(1) }} style={{
                        width: '100%', marginTop: '0.8rem', background: 'linear-gradient(135deg,#1A7A4A,#0ABFCC)', color: '#fff',
                        padding: '10px', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer',
                      }}>
                        Book This Nurse →
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>💬</div>
                      Chat with the AI to get a recommendation
                    </div>
                  )}
                </div>
              </div>

              <div className="dash-card">
                <div className="dash-card-header"><span className="dash-card-title">Quick Prompts</span></div>
                <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    'I need post-surgery care',
                    'Looking for elderly care in Riyadh',
                    'Need a nurse for ICU home care',
                    'Pediatric nurse needed urgently',
                  ].map(prompt => (
                    <button key={prompt} onClick={() => { setChatInput(prompt); handleAiSend() }} style={{
                      background: 'var(--shell-bg)', color: 'var(--ink)', padding: '8px 12px',
                      borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
                      fontSize: '0.78rem', textAlign: 'left', fontFamily: 'inherit',
                    }}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && selectedNurse && (
          <div style={{ maxWidth: 560 }}>
            <div className="dash-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', color: 'var(--ink)', fontWeight: 700 }}>Review AI Recommendation</h3>
              <NurseCard nurse={selectedNurse} selected={true} onSelect={() => {}} color="#1A7A4A" />
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={browseDate} min={tomorrow()} onChange={e => setBrowseDate(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div className="form-group">
                    <label className="form-label">Shift *</label>
                    <select className="form-input" value={browseShift} onChange={e => setBrowseShift(e.target.value)}>
                      <option value="">Select shift</option>
                      {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service *</label>
                    <select className="form-input" value={browseService} onChange={e => setBrowseService(e.target.value)}>
                      <option value="">Select service</option>
                      {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address *</label>
                  <input className="form-input" value={browseAddress} onChange={e => setBrowseAddress(e.target.value)} placeholder="Street, district, building" />
                </div>
              </div>
            </div>
            <BottomBar>
              <button onClick={() => setStep(2)} disabled={!browseDate || !browseShift || !browseService || !browseAddress} style={{
                background: !browseDate || !browseShift || !browseService || !browseAddress ? 'rgba(26,122,74,0.4)' : 'linear-gradient(135deg,#1A7A4A,#0ABFCC)',
                color: '#fff', padding: '13px 32px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer',
              }}>
                Review & Confirm →
              </button>
            </BottomBar>
          </div>
        )}

        {step === 2 && selectedNurse && (
          <form action={submitBooking} style={{ maxWidth: 560 }}>
            <input type="hidden" name="service_type" value={browseService} />
            <input type="hidden" name="patient_condition" value="General care" />
            <input type="hidden" name="city" value={selectedNurse.city} />
            <input type="hidden" name="shift" value={browseShift} />
            <input type="hidden" name="duration" value="8" />
            <input type="hidden" name="start_date" value={browseDate} />
            <input type="hidden" name="booking_type" value="one_time" />
            <input type="hidden" name="address" value={browseAddress} />
            <input type="hidden" name="notes" value="" />

            <div className="dash-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 1.2rem', color: 'var(--ink)', fontWeight: 700 }}>Confirm Booking</h3>
              {error && <div className="auth-error" style={{ marginBottom: '1rem' }}><span>⚠️</span> {error}</div>}
              <SummaryRow label="Nurse" value={selectedNurse.name} />
              <SummaryRow label="Service" value={browseService} />
              <SummaryRow label="Date" value={browseDate} />
              <SummaryRow label="Shift" value={browseShift} />
              <SummaryRow label="Address" value={browseAddress} />
            </div>
            <BottomBar>
              <button type="submit" disabled={isPending} style={{
                background: 'linear-gradient(135deg,#1A7A4A,#0ABFCC)', color: '#fff',
                padding: '13px 32px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem',
                border: 'none', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1,
              }}>
                {isPending ? 'Submitting...' : '✅ Confirm Booking'}
              </button>
            </BottomBar>
          </form>
        )}
      </div>
    )
  }

  return null
}

// ── Helper Components ─────────────────────────────────────────────────────────

function StepHeader({ steps, current, color, onBack, title }: { steps: string[]; current: number; color: string; onBack: () => void; title: string }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
        fontSize: '0.85rem', fontWeight: 600, padding: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'inherit',
      }}>
        ← Back
      </button>
      <h1 className="dash-title" style={{ marginBottom: '1rem' }}>{title}</h1>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.75rem',
                background: i < current ? color : i === current ? color : 'var(--shell-bg)',
                color: i <= current ? '#fff' : 'var(--muted)',
                border: `2px solid ${i <= current ? color : 'var(--border)'}`,
              }}>
                {i < current ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: i === current ? color : 'var(--muted)', whiteSpace: 'nowrap' }}>{s}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 40, height: 2, background: i < current ? color : 'var(--border)', margin: '0 4px', marginBottom: 18 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, background: 'var(--shell-bg)',
      borderTop: '1px solid var(--border)', padding: '1rem 0',
      marginTop: '1rem', display: 'flex', justifyContent: 'flex-end',
    }}>
      {children}
    </div>
  )
}

function NurseAvatar({ nurse, size = 48 }: { nurse: Nurse; size?: number }) {
  if (nurse.photoUrl) {
    return <img src={nurse.photoUrl} alt={nurse.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  const initials = nurse.name.split(' ').map(w => w[0]).slice(0, 2).join('')
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
      fontWeight: 700, fontSize: size * 0.35, flexShrink: 0,
    }}>{initials}</div>
  )
}

function NurseCard({ nurse, selected, onSelect, color, showSelect }: { nurse: Nurse; selected: boolean; onSelect: () => void; color: string; showSelect?: boolean }) {
  return (
    <div
      onClick={showSelect ? onSelect : undefined}
      style={{
        padding: '1rem', borderRadius: 12, border: `2px solid ${selected ? color : 'var(--border)'}`,
        background: selected ? color + '08' : 'var(--card)', cursor: showSelect ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <NurseAvatar nurse={nurse} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.9rem' }}>{nurse.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{nurse.specialization}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>📍 {nurse.city}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, color: color, fontSize: '0.9rem' }}>SAR {nurse.hourlyRate}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>per hour</div>
          {selected && <div style={{ marginTop: 4, background: color, color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>Selected</div>}
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--muted)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
