'use client'

import { useState, useTransition, useEffect } from 'react'
import { submitHospitalBookingAction } from './actions'
import { getShiftAvailability } from '@/app/provider/availability/actions'
import type { ShiftKey } from '@/app/provider/availability/shiftConstants'
import { validateBookingDate, getBookingDateBounds } from '@/lib/bookingDateValidation'

type Dept = { id: string; name: string; icon: string; color: string; nurses_needed: number; nurses_active: number }
type Hospital = { id: string; name: string; city: string }

type Nurse = {
  id: string; name: string; specialization: string; city: string
  hourlyRate: number; dailyRate: number; gender: string; nationality: string
  experienceYears: number; bio: string; photoUrl: string | null; languages: string[]
  isAvailable: boolean
}

type DeptRow = { deptId: string; deptName: string; deptIcon: string; deptColor: string; morning: number; evening: number; night: number }

// Nurse selected for a dept+shift slot
type NurseSelection = {
  deptId: string; deptName: string; shift: string
  nurseId: string; nurseName: string; nurseSpecialization: string
}

const SHIFTS = [
  { key: 'morning', icon: '☀️', label: 'Morning', time: '07:00–14:00', bg: '#FFF8E8', color: '#b85e00' },
  { key: 'evening', icon: '🌤️', label: 'Evening', time: '14:00–21:00', bg: '#FFF3E0', color: '#DD6B20' },
  { key: 'night',   icon: '🌙', label: 'Night',   time: '21:00–07:00', bg: '#EDE9FE', color: '#7B2FBE' },
] as const

const SPECIALIZATIONS = ['ICU / Critical Care','Emergency','Paediatric','Cardiac','Maternity','Rehabilitation','Oncology','General','Surgery','Orthopaedic','Neurology','Radiology']
const LANGUAGES = ['Arabic','English','Urdu','Hindi','Tagalog','Bengali','French']
const CITIES    = ['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Taif','Tabuk']
const STEP_LABELS = ['Requirements', 'Matched Nurses', 'Confirm & Submit']

const nxt = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0] }

function nurseEmoji(gender: string) { return gender === 'male' ? '👨‍⚕️' : '👩‍⚕️' }

export default function HospitalBookingClient({
  hospital, departments, requestedBy, nurses,
  minAdvanceHours = 2, maxAdvanceDays = 30,
}: {
  hospital: Hospital
  departments: Dept[]
  requestedBy: string
  nurses: Nurse[]
  minAdvanceHours?: number
  maxAdvanceDays?: number
}) {
  const [step, setStep]           = useState(1)
  const [isPending, startTx]      = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  // Date bounds from admin settings
  const { minDate: dateMin, maxDate: dateMax } = getBookingDateBounds(minAdvanceHours, maxAdvanceDays)

  // ── Step 1: Requirements ──────────────────────────────────────────────
  const today    = new Date().toISOString().split('T')[0]
  const nextWeek = nxt(7)
  // Default start: use minDate if it's later than today
  const [startDate, setStartDate]   = useState(dateMin > today ? dateMin : nxt(1))
  const [endDate, setEndDate]       = useState(nxt(7))
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set(['morning']))
  const [specs, setSpecs]           = useState<Set<string>>(new Set())
  const [totalNurses, setTotalNurses] = useState(2)
  const [langPref, setLangPref]     = useState<Set<string>>(new Set(['Arabic', 'English']))
  const [genderPref, setGenderPref] = useState<'any' | 'female' | 'male'>('any')
  const [specialInstructions, setSpecialInstructions] = useState('')

  // Dept breakdown (on step 1)
  const [deptRows, setDeptRows] = useState<DeptRow[]>(() =>
    departments.slice(0, 2).map(d => ({
      deptId: d.id, deptName: d.name, deptIcon: d.icon, deptColor: d.color,
      morning: 1, evening: 0, night: 0,
    }))
  )

  // ── Step 2: Nurse matching ────────────────────────────────────────────
  const [nurseSelections, setNurseSelections] = useState<NurseSelection[]>([])
  const [filterSpecialization, setFilterSpecialization] = useState('All')
  const [filterGender, setFilterGender]     = useState('Any')
  const [filterSearch, setFilterSearch]     = useState('')
  const [detailNurse, setDetailNurse]       = useState<Nurse | null>(null)
  const [availData, setAvailData]           = useState<Record<string, Record<ShiftKey, any>>>({})
  const [loadingAvail, setLoadingAvail]     = useState(false)

  // Load availability for all nurses when entering step 2
  useEffect(() => {
    if (step !== 2) return
    async function loadAll() {
      setLoadingAvail(true)
      const result: Record<string, Record<ShiftKey, any>> = {}
      await Promise.all(nurses.map(async n => {
        try {
          const data = await getShiftAvailability(n.id, startDate, startDate)
          result[n.id] = data[startDate] ?? {}
        } catch {}
      }))
      setAvailData(result)
      setLoadingAvail(false)
    }
    loadAll()
  }, [step, startDate])

  function toggleShift(s: string) {
    setSelectedShifts(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }
  function toggleSpec(s: string) {
    setSpecs(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }
  function toggleLang(l: string) {
    setLangPref(prev => { const n = new Set(prev); n.has(l) ? n.delete(l) : n.add(l); return n })
  }

  function addDeptRow() {
    const used = new Set(deptRows.map(r => r.deptId))
    const next = departments.find(d => !used.has(d.id))
    if (!next) return
    setDeptRows(prev => [...prev, { deptId: next.id, deptName: next.name, deptIcon: next.icon, deptColor: next.color, morning: 1, evening: 0, night: 0 }])
  }
  function removeDeptRow(idx: number) { setDeptRows(prev => prev.filter((_, i) => i !== idx)) }
  function updateDeptRow(idx: number, field: keyof DeptRow, val: any) {
    setDeptRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      if (field === 'deptId') {
        const d = departments.find(x => x.id === val)
        return d ? { ...r, deptId: d.id, deptName: d.name, deptIcon: d.icon, deptColor: d.color } : r
      }
      return { ...r, [field]: val }
    }))
  }

  const totalAllocated = deptRows.reduce((s, r) => s + r.morning + r.evening + r.night, 0)

  // Build slots needed: one entry per (dept, shift, nurse slot)
  const slotsNeeded: { deptId: string; deptName: string; deptIcon: string; shift: string; count: number }[] = []
  deptRows.forEach(row => {
    SHIFTS.forEach(s => {
      const count = row[s.key as 'morning' | 'evening' | 'night']
      if (selectedShifts.has(s.key) && count > 0) {
        slotsNeeded.push({ deptId: row.deptId, deptName: row.deptName, deptIcon: row.deptIcon, shift: s.key, count })
      }
    })
  })

  function selectNurse(deptId: string, deptName: string, shift: string, nurse: Nurse) {
    setNurseSelections(prev => {
      const existing = prev.filter(s => !(s.deptId === deptId && s.shift === shift))
      return [...existing, { deptId, deptName, shift, nurseId: nurse.id, nurseName: nurse.name, nurseSpecialization: nurse.specialization }]
    })
  }

  function isSelected(deptId: string, shift: string, nurseId: string) {
    return nurseSelections.some(s => s.deptId === deptId && s.shift === shift && s.nurseId === nurseId)
  }

  // Filtered nurses
  const filteredNurses = nurses.filter(n => {
    if (filterSearch && !n.name.toLowerCase().includes(filterSearch.toLowerCase()) && !n.specialization.toLowerCase().includes(filterSearch.toLowerCase())) return false
    if (filterSpecialization !== 'All' && !n.specialization.toLowerCase().includes(filterSpecialization.toLowerCase())) return false
    if (filterGender !== 'Any' && n.gender.toLowerCase() !== filterGender.toLowerCase()) return false
    return true
  })

  function getNurseAvailStatus(nurseId: string, shift: string): 'available' | 'partial' | 'booked' | 'off' | 'unknown' {
    const d = availData[nurseId]
    if (!d) return 'unknown'
    return (d[shift as ShiftKey]?.status) ?? 'unknown'
  }

  function handleSubmit() {
    setError(null)
    // Validate advance booking window
    const dateErr = validateBookingDate(startDate, undefined, minAdvanceHours, maxAdvanceDays)
    if (dateErr) { setError(dateErr.message); return }
    const fd = new FormData()
    fd.set('hospital_id', hospital.id)
    fd.set('start_date', startDate)
    fd.set('end_date', endDate)
    fd.set('duration_days', String(Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))))
    fd.set('shifts', JSON.stringify([...selectedShifts]))
    fd.set('specializations', JSON.stringify([...specs]))
    fd.set('total_nurses', String(totalNurses))
    fd.set('language_preference', JSON.stringify([...langPref]))
    fd.set('gender_preference', genderPref)
    fd.set('special_instructions', specialInstructions)
    fd.set('dept_breakdown', JSON.stringify(deptRows))
    fd.set('nurse_selections', JSON.stringify(nurseSelections))
    startTx(async () => {
      const res = await submitHospitalBookingAction(fd)
      if (res?.error) { setError(res.error); return }
      setSubmittedId(res.id ?? null)
      setSubmitted(true)
    })
  }

  // ── Success Screen ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
        <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', marginBottom: 8 }}>Booking Request Submitted!</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--muted)', maxWidth: 440, marginBottom: 24 }}>
          Your request for <strong>{totalNurses} nurses</strong> has been submitted. You can track the approval status from your dashboard.
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {submittedId && (
            <a href={`/hospital/booking/${submittedId}`} style={{ background: 'var(--teal)', color: '#fff', padding: '10px 22px', borderRadius: 9, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>
              View Booking →
            </a>
          )}
          <a href="/hospital/booking" style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '10px 22px', borderRadius: 9, fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
            + New Booking
          </a>
          <a href="/hospital/dashboard" style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '10px 22px', borderRadius: 9, fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
            Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.2rem 1.5rem 5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--teal)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>BULK NURSE BOOKING</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '2px 0 0' }}>Request multiple nurses for your departments</p>
      </div>

      {/* Step progress */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', marginBottom: '1.2rem' }}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1; const done = step > n; const active = step === n
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, background: done ? '#0E7B8C' : active ? '#fff' : 'var(--shell-bg)', color: done ? '#fff' : active ? '#0E7B8C' : 'var(--muted)', border: (active || done) ? '2px solid #0E7B8C' : '2px solid var(--border)' }}>
                  {done ? '✓' : n}
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: active || done ? 700 : 500, color: active || done ? 'var(--ink)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{label}</div>
              </div>
              {i < STEP_LABELS.length - 1 && <div style={{ flex: 1, height: 2, background: done ? '#0E7B8C' : 'var(--border)', margin: '0 8px', marginBottom: 18 }} />}
            </div>
          )
        })}
      </div>

      {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

      {/* ══ STEP 1: Requirements + Department Breakdown ══ */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Staffing Requirements */}
          <Section icon="📋" title="Staffing Requirements" sub="Tell us your hospital needs">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <FG label="HOSPITAL NAME">
                <input className="form-input" value={hospital.name} readOnly style={{ background: 'var(--shell-bg)', color: 'var(--muted)', cursor: 'not-allowed' }} />
              </FG>
              <FG label="CITY">
                <select className="form-input" defaultValue={hospital.city}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </FG>
              <FG label="REQUESTED BY (HR)">
                <input className="form-input" defaultValue={requestedBy} />
              </FG>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <FG label="START DATE" hint={`Min ${minAdvanceHours}h advance · up to ${maxAdvanceDays}d ahead`}>
                <input type="date" className="form-input" value={startDate} min={dateMin} max={dateMax} onChange={e => { setStartDate(e.target.value); if (e.target.value >= endDate) setEndDate(e.target.value) }} />
              </FG>
              <FG label="END DATE">
                <input type="date" className="form-input" value={endDate} min={startDate} max={dateMax} onChange={e => setEndDate(e.target.value)} />
              </FG>
            </div>

            <FG label="SHIFTS REQUIRED">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {SHIFTS.map(s => (
                  <div key={s.key} onClick={() => toggleShift(s.key)} style={{ border: `2px solid ${selectedShifts.has(s.key) ? '#0E7B8C' : 'var(--border)'}`, borderRadius: 10, padding: '12px 8px', cursor: 'pointer', textAlign: 'center', background: selectedShifts.has(s.key) ? 'rgba(14,123,140,0.05)' : 'var(--shell-bg)', transition: 'all 0.12s' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 3 }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--ink)' }}>{s.label}</div>
                    <div style={{ fontSize: '0.67rem', color: 'var(--muted)', marginTop: 1 }}>{s.time}</div>
                  </div>
                ))}
              </div>
            </FG>

            <FG label="NURSE SPECIALISATIONS NEEDED" style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {SPECIALIZATIONS.map(s => (
                  <button key={s} type="button" onClick={() => toggleSpec(s)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, border: `1.5px solid ${specs.has(s) ? '#0E7B8C' : 'var(--border)'}`, background: specs.has(s) ? '#0E7B8C' : 'var(--card)', color: specs.has(s) ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>{s}</button>
                ))}
              </div>
            </FG>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 14 }}>
              <FG label="TOTAL NURSES NEEDED">
                <Counter value={totalNurses} min={1} max={200} onChange={setTotalNurses} />
              </FG>
              <FG label="DURATION (DAYS)">
                <Counter value={Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))} min={1} max={365} onChange={() => {}} readonly />
              </FG>
            </div>
          </Section>

          {/* Department Breakdown — on step 1 */}
          <Section icon="🏢" title="Department Breakdown" sub="Distribute nurses across departments">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {deptRows.map((row, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: row.deptColor, flexShrink: 0 }} />
                  <select value={row.deptId} onChange={e => updateDeptRow(idx, 'deptId', e.target.value)}
                    style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '0.82rem', fontWeight: 600, background: 'var(--card)', color: 'var(--ink)', fontFamily: 'inherit', cursor: 'pointer' }}>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                    {SHIFTS.map(s => selectedShifts.has(s.key) && (
                      <div key={s.key} style={{ display: 'flex', alignItems: 'center', background: s.bg, border: `1px solid ${s.color}44`, borderRadius: 8, overflow: 'hidden' }}>
                        <span style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700, color: s.color }}>{s.icon} {s.label}</span>
                        <button onClick={() => updateDeptRow(idx, s.key as any, Math.max(0, row[s.key as 'morning'|'evening'|'night'] - 1))} style={mBtn}>−</button>
                        <span style={{ padding: '0 8px', fontSize: '0.82rem', fontWeight: 800, minWidth: 24, textAlign: 'center' }}>{row[s.key as 'morning'|'evening'|'night']}</span>
                        <button onClick={() => updateDeptRow(idx, s.key as any, row[s.key as 'morning'|'evening'|'night'] + 1)} style={mBtn}>+</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => removeDeptRow(idx)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px' }}>✕</button>
                </div>
              ))}
              {departments.length > deptRows.length && (
                <button onClick={addDeptRow} style={{ width: '100%', marginTop: 10, padding: '9px', border: '2px dashed var(--teal)', borderRadius: 9, background: 'rgba(14,123,140,0.03)', color: 'var(--teal)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Add Department
                </button>
              )}
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', background: 'var(--shell-bg)', borderRadius: 8, padding: '8px 14px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Total allocated</span>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: totalAllocated === totalNurses ? '#1A7A4A' : '#b85e00' }}>{totalAllocated} / {totalNurses}</span>
            </div>
          </Section>

          {/* Additional Requirements */}
          <Section icon="⚙️" title="Additional Requirements">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <FG label="LANGUAGE PREFERENCE">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {LANGUAGES.map(l => (
                    <button key={l} type="button" onClick={() => toggleLang(l)} style={{ padding: '4px 11px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 600, border: `1.5px solid ${langPref.has(l) ? '#0E7B8C' : 'var(--border)'}`, background: langPref.has(l) ? '#0E7B8C' : 'var(--card)', color: langPref.has(l) ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
                  ))}
                </div>
              </FG>
              <FG label="GENDER PREFERENCE">
                <div style={{ display: 'flex', gap: 7 }}>
                  {(['any','female','male'] as const).map(g => (
                    <button key={g} type="button" onClick={() => setGenderPref(g)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 600, border: `1.5px solid ${genderPref === g ? '#0E7B8C' : 'var(--border)'}`, background: genderPref === g ? '#0E7B8C' : 'var(--card)', color: genderPref === g ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                      {g === 'any' ? 'Any' : g === 'female' ? 'Female Only' : 'Male Only'}
                    </button>
                  ))}
                </div>
              </FG>
            </div>
            <FG label="SPECIAL INSTRUCTIONS" style={{ marginTop: 14 }}>
              <textarea className="form-input" rows={3} value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="Any special requirements, certifications (BLS, ACLS), department-specific instructions..." style={{ resize: 'vertical' }} />
            </FG>
          </Section>
        </div>
      )}

      {/* ══ STEP 2: Matched Nurses ══ */}
      {step === 2 && (
        <div>
          {/* Filters row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="form-input" placeholder="Search nurse name or specialization..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} style={{ maxWidth: 260, fontSize: '0.83rem' }} />
            <select className="form-input" value={filterSpecialization} onChange={e => setFilterSpecialization(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="All">All Specializations</option>
              {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="form-input" value={filterGender} onChange={e => setFilterGender(e.target.value)} style={{ maxWidth: 140 }}>
              <option value="Any">Any Gender</option>
              <option value="female">Female Only</option>
              <option value="male">Male Only</option>
            </select>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginLeft: 'auto' }}>
              {loadingAvail ? '⏳ Loading availability...' : `${filteredNurses.length} nurses found`}
            </span>
          </div>

          {/* Slots needed — assign nurses per dept+shift */}
          {slotsNeeded.map((slot, si) => {
            const shiftMeta = SHIFTS.find(s => s.key === slot.shift)!
            const assigned  = nurseSelections.filter(s => s.deptId === slot.deptId && s.shift === slot.shift)
            return (
              <div key={si} className="dash-card" style={{ marginBottom: '1rem' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.9rem' }}>{slot.deptIcon}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{slot.deptName}</span>
                  <span style={{ background: shiftMeta.bg, color: shiftMeta.color, padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700 }}>{shiftMeta.icon} {shiftMeta.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {assigned.length}/{slot.count} assigned
                    {assigned.length >= slot.count && <span style={{ color: '#1A7A4A', fontWeight: 700, marginLeft: 6 }}>✓ Full</span>}
                  </span>
                </div>
                <div style={{ padding: '0.8rem 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {filteredNurses.map(nurse => {
                    const avStatus  = getNurseAvailStatus(nurse.id, slot.shift)
                    const sel       = isSelected(slot.deptId, slot.shift, nurse.id)
                    const isBooked  = avStatus === 'booked' || avStatus === 'off'
                    const statusColor = avStatus === 'available' ? '#1A7A4A' : avStatus === 'partial' ? '#b85e00' : avStatus === 'booked' || avStatus === 'off' ? '#E04A4A' : '#94A3B8'
                    const statusLabel = avStatus === 'available' ? '✓ Available' : avStatus === 'partial' ? '◑ Partial' : avStatus === 'booked' ? '✗ Booked' : avStatus === 'off' ? '✗ Off' : '— Unknown'

                    return (
                      <div key={nurse.id} style={{ border: `2px solid ${sel ? '#0E7B8C' : isBooked ? 'var(--border)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 12px', background: sel ? 'rgba(14,123,140,0.04)' : 'var(--card)', opacity: isBooked && !sel ? 0.5 : 1, position: 'relative' }}>
                        {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, background: '#0E7B8C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: 900 }}>✓</div>}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(14,123,140,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                            {nurse.photoUrl ? <img src={nurse.photoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : nurseEmoji(nurse.gender)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nurse.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 1 }}>{nurse.specialization}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 1 }}>📍 {nurse.city} · {nurse.experienceYears}yr exp</div>
                          </div>
                        </div>

                        {/* Availability badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: statusColor, background: statusColor + '18', padding: '2px 8px', borderRadius: 50 }}>{statusLabel}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700 }}>SAR {nurse.dailyRate}/day</span>
                        </div>

                        {/* Languages */}
                        {nurse.languages.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                            {nurse.languages.slice(0, 3).map(l => (
                              <span key={l} style={{ background: 'rgba(14,123,140,0.08)', color: 'var(--teal)', fontSize: '0.62rem', fontWeight: 600, padding: '1px 6px', borderRadius: 50 }}>🗣 {l}</span>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setDetailNurse(nurse)} style={{ flex: 1, background: 'var(--shell-bg)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '5px 0', borderRadius: 7, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            View Profile
                          </button>
                          <button
                            onClick={() => !isBooked && selectNurse(slot.deptId, slot.deptName, slot.shift, nurse)}
                            disabled={isBooked}
                            style={{ flex: 2, background: sel ? '#0E7B8C' : isBooked ? 'var(--shell-bg)' : 'rgba(14,123,140,0.08)', border: `1px solid ${sel ? '#0E7B8C' : 'var(--border)'}`, color: sel ? '#fff' : isBooked ? 'var(--muted)' : 'var(--teal)', padding: '5px 0', borderRadius: 7, fontSize: '0.72rem', fontWeight: 700, cursor: isBooked ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                          >
                            {sel ? '✓ Selected' : isBooked ? 'Unavailable' : 'Select →'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Selection summary */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{nurseSelections.length} nurses selected</span>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: nurseSelections.length > 0 ? 'var(--teal)' : 'var(--muted)' }}>
              {nurseSelections.length > 0 ? `Ready to submit` : 'No selections yet'}
            </span>
          </div>
        </div>
      )}

      {/* ══ STEP 3: Confirm & Submit ══ */}
      {step === 3 && (
        <Section icon="📤" title="Confirm & Submit" sub="Review your booking before submission">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'Hospital', value: hospital.name },
              { label: 'Period', value: `${startDate} → ${endDate}` },
              { label: 'Shifts', value: [...selectedShifts].join(', ') || '—' },
              { label: 'Total Nurses', value: String(totalNurses) },
              { label: 'Specializations', value: specs.size > 0 ? [...specs].join(', ') : 'Any' },
              { label: 'Language Preference', value: [...langPref].join(', ') || 'Any' },
              { label: 'Gender Preference', value: genderPref },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 180, flexShrink: 0, fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>{r.label}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--ink)', fontWeight: 600 }}>{r.value}</div>
              </div>
            ))}
          </div>

          {/* Selected nurses summary */}
          {nurseSelections.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Selected Nurses ({nurseSelections.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {nurseSelections.map((s, i) => {
                  const shiftMeta = SHIFTS.find(sh => sh.key === s.shift)!
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--shell-bg)', borderRadius: 8 }}>
                      <span style={{ background: shiftMeta.bg, color: shiftMeta.color, fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>{shiftMeta.icon} {shiftMeta.label}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>{s.deptName}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)', marginLeft: 'auto' }}>{s.nurseName}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{s.nurseSpecialization}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 9, padding: '12px 16px', marginTop: 16, fontSize: '0.8rem', color: 'var(--muted)' }}>
            ℹ️ Submitting will create a booking request with <strong>pending</strong> status. Admin will review and approve individual nurses. You can track status from your dashboard.
          </div>
        </Section>
      )}

      {/* ── Fixed bottom nav ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 260, right: 0, background: 'var(--card)', borderTop: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>Bulk Booking</span>
          <div style={{ width: 100, height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: '100%', borderRadius: 2, background: '#0E7B8C', width: `${(step / 3) * 100}%`, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Step {step} of 3</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '9px 20px', borderRadius: 9, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
          )}
          {step < 3 ? (
            <button onClick={() => {
              if (step === 1) {
                if (selectedShifts.size === 0) { setError('Please select at least one shift'); return }
                const dateErr = validateBookingDate(startDate, undefined, minAdvanceHours, maxAdvanceDays)
                if (dateErr) { setError(dateErr.message); return }
              }
              setError(null); setStep(s => s + 1)
            }}
              style={{ background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff', border: 'none', padding: '9px 24px', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isPending}
              style={{ background: 'linear-gradient(135deg,#1A7A4A,#27A869)', color: '#fff', border: 'none', padding: '9px 24px', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isPending ? 0.7 : 1 }}>
              {isPending ? '⏳ Submitting…' : '✓ Submit Booking →'}
            </button>
          )}
        </div>
      </div>

      {/* Nurse detail modal */}
      {detailNurse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setDetailNurse(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(14,123,140,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
                {detailNurse.photoUrl ? <img src={detailNurse.photoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : nurseEmoji(detailNurse.gender)}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)' }}>{detailNurse.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{detailNurse.specialization}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700, marginTop: 2 }}>SAR {detailNurse.hourlyRate}/hr · SAR {detailNurse.dailyRate}/day</div>
              </div>
              <button onClick={() => setDetailNurse(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
            </div>
            {[
              { label: 'City', value: detailNurse.city },
              { label: 'Experience', value: `${detailNurse.experienceYears} years` },
              { label: 'Gender', value: detailNurse.gender },
              { label: 'Nationality', value: detailNurse.nationality || '—' },
              { label: 'Languages', value: detailNurse.languages.join(', ') || '—' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 120, flexShrink: 0, fontSize: '0.78rem', color: 'var(--muted)' }}>{r.label}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--ink)', fontWeight: 600 }}>{r.value}</div>
              </div>
            ))}
            {detailNurse.bio && <p style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>{detailNurse.bio}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ icon, title, sub, children }: { icon: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="dash-card" style={{ marginBottom: '1rem' }}>
      <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{title}</div>
          {sub && <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ padding: '1.1rem 1.4rem' }}>{children}</div>
    </div>
  )
}

function FG({ label, children, style, hint }: { label: string; children: React.ReactNode; style?: React.CSSProperties; hint?: string }) {
  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#0E7B8C', letterSpacing: '0.08em' }}>{label}</div>
        {hint && <div style={{ fontSize: '0.6rem', color: 'var(--teal)', fontWeight: 600, opacity: 0.85 }}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function Counter({ value, min, max, onChange, readonly }: { value: number; min: number; max: number; onChange: (v: number) => void; readonly?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
      <button type="button" onClick={() => !readonly && onChange(Math.max(min, value - 1))} style={{ ...mBtn, fontSize: '1rem', padding: '4px 14px', opacity: readonly ? 0.4 : 1 }}>−</button>
      <span style={{ padding: '0 16px', fontSize: '1rem', fontWeight: 800, minWidth: 48, textAlign: 'center', color: 'var(--ink)' }}>{value}</span>
      <button type="button" onClick={() => !readonly && onChange(Math.min(max, value + 1))} style={{ ...mBtn, fontSize: '1rem', padding: '4px 14px', opacity: readonly ? 0.4 : 1 }}>+</button>
    </div>
  )
}

const mBtn: React.CSSProperties = { background: 'var(--shell-bg)', border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, color: 'var(--muted)', padding: '4px 10px', fontFamily: 'inherit' }
