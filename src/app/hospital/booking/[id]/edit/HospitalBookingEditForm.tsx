'use client'

import { useState, useTransition } from 'react'
import { updateHospitalBookingAction } from './actions'
import { getBookingDateBounds } from '@/lib/bookingDateValidation'
import { validateBookingDate } from '@/lib/bookingDateValidation'

type Dept = { id: string; name: string; icon: string; color: string; nurses_needed: number; nurses_active: number }
type Hospital = { id: string; name: string; city: string }

type DeptRow = { deptId: string; deptName: string; deptIcon: string; deptColor: string; morning: number; evening: number; night: number }

const SHIFTS = [
  { key: 'morning', icon: '☀️', label: 'Morning', time: '07:00–14:00', bg: '#FFF8E8', color: '#b85e00' },
  { key: 'evening', icon: '🌤️', label: 'Evening', time: '14:00–21:00', bg: '#FFF3E0', color: '#DD6B20' },
  { key: 'night',   icon: '🌙', label: 'Night',   time: '21:00–07:00', bg: '#EDE9FE', color: '#7B2FBE' },
] as const

const SPECIALIZATIONS = ['ICU / Critical Care','Emergency','Paediatric','Cardiac','Maternity','Rehabilitation','Oncology','General','Surgery','Orthopaedic','Neurology','Radiology']
const LANGUAGES = ['Arabic','English','Urdu','Hindi','Tagalog','Bengali','French']
const CITIES    = ['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Taif','Tabuk']

export default function HospitalBookingEditForm({
  booking, hospital, departments, requestedBy, minAdvanceHours = 2, maxAdvanceDays = 30,
}: {
  booking: any
  hospital: Hospital
  departments: Dept[]
  requestedBy: string
  minAdvanceHours?: number
  maxAdvanceDays?: number
}) {
  const [isPending, startTx] = useTransition()
  const [error, setError]    = useState<string | null>(null)

  const { minDate, maxDate } = getBookingDateBounds(minAdvanceHours, maxAdvanceDays)

  // Pre-fill from existing booking
  const [startDate, setStartDate] = useState(booking.start_date ?? '')
  const [endDate, setEndDate]     = useState(booking.end_date ?? '')
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set(booking.shifts ?? ['morning']))
  const [specs, setSpecs]         = useState<Set<string>>(new Set(booking.specializations ?? []))
  const [totalNurses, setTotalNurses] = useState<number>(booking.total_nurses ?? 2)
  const [langPref, setLangPref]   = useState<Set<string>>(new Set(booking.language_preference ?? ['Arabic', 'English']))
  const [genderPref, setGenderPref] = useState<'any'|'female'|'male'>(booking.gender_preference ?? 'any')
  const [specialInstructions, setSpecialInstructions] = useState(booking.special_instructions ?? '')

  // Dept rows — pre-fill from existing dept_breakdown
  const [deptRows, setDeptRows] = useState<DeptRow[]>(() => {
    if (booking.dept_breakdown?.length) {
      return booking.dept_breakdown.map((row: any) => {
        const dept = departments.find(d => d.id === row.deptId)
        return {
          deptId: row.deptId, deptName: row.deptName,
          deptIcon: dept?.icon ?? '🏥', deptColor: dept?.color ?? '#0E7B8C',
          morning: row.morning ?? 0, evening: row.evening ?? 0, night: row.night ?? 0,
        }
      })
    }
    return departments.slice(0, 2).map(d => ({
      deptId: d.id, deptName: d.name, deptIcon: d.icon, deptColor: d.color,
      morning: 1, evening: 0, night: 0,
    }))
  })

  function toggleShift(s: string) { setSelectedShifts(p => { const n = new Set(p); n.has(s) ? n.delete(s) : n.add(s); return n }) }
  function toggleSpec(s: string)  { setSpecs(p => { const n = new Set(p); n.has(s) ? n.delete(s) : n.add(s); return n }) }
  function toggleLang(l: string)  { setLangPref(p => { const n = new Set(p); n.has(l) ? n.delete(l) : n.add(l); return n }) }

  function addDeptRow() {
    const used = new Set(deptRows.map(r => r.deptId))
    const next = departments.find(d => !used.has(d.id))
    if (!next) return
    setDeptRows(p => [...p, { deptId: next.id, deptName: next.name, deptIcon: next.icon, deptColor: next.color, morning: 1, evening: 0, night: 0 }])
  }
  function removeDeptRow(idx: number) { setDeptRows(p => p.filter((_, i) => i !== idx)) }
  function updateDeptRow(idx: number, field: keyof DeptRow, val: any) {
    setDeptRows(p => p.map((r, i) => {
      if (i !== idx) return r
      if (field === 'deptId') {
        const d = departments.find(x => x.id === val)
        return d ? { ...r, deptId: d.id, deptName: d.name, deptIcon: d.icon, deptColor: d.color } : r
      }
      return { ...r, [field]: val }
    }))
  }

  const totalAllocated = deptRows.reduce((s, r) => s + r.morning + r.evening + r.night, 0)

  function handleSave() {
    setError(null)
    if (selectedShifts.size === 0) { setError('Please select at least one shift.'); return }
    const dateErr = validateBookingDate(startDate, undefined, minAdvanceHours, maxAdvanceDays)
    if (dateErr) { setError(dateErr.message); return }

    const fd = new FormData()
    fd.set('booking_id',          booking.id)
    fd.set('start_date',          startDate)
    fd.set('end_date',            endDate)
    fd.set('total_nurses',        String(totalNurses))
    fd.set('shifts',              JSON.stringify([...selectedShifts]))
    fd.set('specializations',     JSON.stringify([...specs]))
    fd.set('language_preference', JSON.stringify([...langPref]))
    fd.set('gender_preference',   genderPref)
    fd.set('special_instructions',specialInstructions)
    fd.set('dept_breakdown',      JSON.stringify(deptRows))

    startTx(async () => {
      await updateHospitalBookingAction(fd)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {error && (
        <div style={{ background: 'rgba(224,74,74,0.07)', border: '1px solid rgba(224,74,74,0.25)', borderRadius: 10, padding: '12px 16px', color: '#E04A4A', fontSize: '0.85rem', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Requirements card */}
      <div className="dash-card">
        <div className="dash-card-header"><span className="dash-card-title">📋 Staffing Requirements</span></div>
        <div className="dash-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <FG label="Hospital">
              <input className="form-input" value={hospital.name} readOnly style={{ background: 'var(--shell-bg)', color: 'var(--muted)', cursor: 'not-allowed' }} />
            </FG>
            <FG label="City">
              <select className="form-input" defaultValue={hospital.city}>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FG>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <FG label="Start Date" hint={`Min ${minAdvanceHours}h advance · up to ${maxAdvanceDays}d ahead`}>
              <input type="date" className="form-input" value={startDate} min={minDate} max={maxDate} onChange={e => { setStartDate(e.target.value); if (e.target.value >= endDate) setEndDate(e.target.value) }} />
            </FG>
            <FG label="End Date">
              <input type="date" className="form-input" value={endDate} min={startDate} max={maxDate} onChange={e => setEndDate(e.target.value)} />
            </FG>
          </div>

          {/* Shifts */}
          <FG label="Shifts Required" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {SHIFTS.map(s => (
                <div key={s.key} onClick={() => toggleShift(s.key)} style={{ border: `2px solid ${selectedShifts.has(s.key) ? '#0E7B8C' : 'var(--border)'}`, borderRadius: 10, padding: '12px 8px', cursor: 'pointer', textAlign: 'center', background: selectedShifts.has(s.key) ? 'rgba(14,123,140,0.05)' : 'var(--shell-bg)', transition: 'all 0.12s', userSelect: 'none' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 3 }}>{s.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--ink)' }}>{s.label}</div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--muted)', marginTop: 1 }}>{s.time}</div>
                </div>
              ))}
            </div>
          </FG>

          {/* Specializations */}
          <FG label="Nurse Specializations" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {SPECIALIZATIONS.map(sp => (
                <span key={sp} onClick={() => toggleSpec(sp)} style={{ padding: '5px 12px', borderRadius: 50, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none', border: `1.5px solid ${specs.has(sp) ? '#0E7B8C' : 'var(--border)'}`, background: specs.has(sp) ? 'rgba(14,123,140,0.08)' : 'var(--shell-bg)', color: specs.has(sp) ? 'var(--teal)' : 'var(--muted)', transition: 'all 0.12s' }}>
                  {sp}
                </span>
              ))}
            </div>
          </FG>

          {/* Total nurses + duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <FG label="Total Nurses Needed">
              <Counter value={totalNurses} min={1} max={200} onChange={setTotalNurses} />
            </FG>
            <FG label="Duration (days)">
              <Counter value={Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))} min={1} max={365} onChange={() => {}} readonly />
            </FG>
          </div>

          {/* Language + gender */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <FG label="Language Preference">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {LANGUAGES.map(l => (
                  <span key={l} onClick={() => toggleLang(l)} style={{ padding: '4px 11px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none', border: `1.5px solid ${langPref.has(l) ? '#0E7B8C' : 'var(--border)'}`, background: langPref.has(l) ? 'rgba(14,123,140,0.08)' : 'var(--shell-bg)', color: langPref.has(l) ? 'var(--teal)' : 'var(--muted)', transition: 'all 0.12s' }}>
                    {l}
                  </span>
                ))}
              </div>
            </FG>
            <FG label="Gender Preference">
              <div style={{ display: 'flex', gap: 8 }}>
                {(['any','female','male'] as const).map(g => (
                  <button key={g} type="button" onClick={() => setGenderPref(g)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${genderPref === g ? '#0E7B8C' : 'var(--border)'}`, background: genderPref === g ? 'rgba(14,123,140,0.08)' : 'var(--shell-bg)', color: genderPref === g ? 'var(--teal)' : 'var(--muted)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all 0.12s' }}>
                    {g === 'any' ? 'Any' : g === 'female' ? '👩 Female' : '👨 Male'}
                  </button>
                ))}
              </div>
            </FG>
          </div>

          {/* Special instructions */}
          <FG label="Special Instructions">
            <textarea className="form-input" value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} rows={3} placeholder="Any special requirements or notes for admin…" style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
          </FG>
        </div>
      </div>

      {/* Department Breakdown card */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">🏢 Department Breakdown</span>
          <span style={{ fontSize: '0.78rem', color: totalAllocated === totalNurses ? '#1A7A4A' : totalAllocated > totalNurses ? '#E04A4A' : '#b85e00', fontWeight: 700 }}>
            {totalAllocated}/{totalNurses} allocated
          </span>
        </div>
        <div className="dash-card-body">
          {deptRows.map((row, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: 'var(--shell-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.1rem' }}>{row.deptIcon}</span>
              <select value={row.deptId} onChange={e => updateDeptRow(idx, 'deptId', e.target.value)}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: '0.82rem', fontFamily: 'inherit' }}>
                {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
              </select>
              {SHIFTS.map(s => selectedShifts.has(s.key) && (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5, background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 7, padding: '4px 8px' }}>
                  <span style={{ fontSize: '0.8rem' }}>{s.icon}</span>
                  <button type="button" onClick={() => updateDeptRow(idx, s.key as any, Math.max(0, row[s.key as 'morning'|'evening'|'night'] - 1))} style={miniBtn}>−</button>
                  <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', color: s.color }}>{row[s.key as 'morning'|'evening'|'night']}</span>
                  <button type="button" onClick={() => updateDeptRow(idx, s.key as any, row[s.key as 'morning'|'evening'|'night'] + 1)} style={miniBtn}>+</button>
                </div>
              ))}
              <button type="button" onClick={() => removeDeptRow(idx)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 6px', lineHeight: 1 }}>✕</button>
            </div>
          ))}
          {departments.length > deptRows.length && (
            <button type="button" onClick={addDeptRow} style={{ width: '100%', padding: '9px', border: '1.5px dashed var(--border)', borderRadius: 10, background: 'none', color: 'var(--teal)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
              + Add Department
            </button>
          )}
        </div>
      </div>

      {/* Save / Cancel */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <a href={`/hospital/booking/${booking.id}`} style={{ padding: '11px 24px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Cancel
        </a>
        <button onClick={handleSave} disabled={isPending} style={{ padding: '11px 28px', borderRadius: 9, background: 'linear-gradient(135deg,#0E7B8C,#0ABFCC)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', border: 'none', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1, fontFamily: 'inherit' }}>
          {isPending ? 'Saving…' : '💾 Save Changes'}
        </button>
      </div>

    </div>
  )
}

/* ── Sub-components ── */
function FG({ label, children, style, hint }: { label: string; children: React.ReactNode; style?: React.CSSProperties; hint?: string }) {
  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
        {hint && <span style={{ fontSize: '0.62rem', color: 'var(--teal)', fontWeight: 600 }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Counter({ value, min, max, onChange, readonly }: { value: number; min: number; max: number; onChange: (v: number) => void; readonly?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden', width: 'fit-content' }}>
      <button type="button" disabled={readonly || value <= min} onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 36, height: 36, background: 'var(--shell-bg)', border: 'none', cursor: readonly ? 'default' : 'pointer', fontSize: '1rem', color: 'var(--ink)', fontWeight: 700 }}>−</button>
      <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: 'var(--ink)', padding: '0 4px' }}>{value}</span>
      <button type="button" disabled={readonly || value >= max} onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: 36, height: 36, background: 'var(--shell-bg)', border: 'none', cursor: readonly ? 'default' : 'pointer', fontSize: '1rem', color: 'var(--ink)', fontWeight: 700 }}>+</button>
    </div>
  )
}

const miniBtn: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4, border: '1px solid rgba(0,0,0,0.12)',
  background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
}
