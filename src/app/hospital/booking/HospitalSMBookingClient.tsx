'use client'

import { useState, useTransition, useEffect } from 'react'
import { submitHospitalBookingAction } from './actions'
import { getShiftAvailability } from '@/app/provider/availability/actions'
import type { ShiftKey } from '@/app/provider/availability/shiftConstants'
import { validateBookingDate, getBookingDateBounds } from '@/lib/bookingDateValidation'

/* ── Types ─────────────────────────────────────────────────── */

export type SMCategory = { id: string; name: string; icon: string | null; description: string | null }
export type SMService  = { id: string; name: string; description: string | null; base_price: number; min_price: number; max_price: number | null; duration_minutes: number | null; category_id: string }

type Dept   = { id: string; name: string; icon: string; color: string; nurses_needed: number; nurses_active: number }
type Hospital = { id: string; name: string; city: string }
type Nurse  = {
  id: string; name: string; specialization: string; city: string
  hourlyRate: number; dailyRate: number; gender: string; nationality: string
  experienceYears: number; bio: string; photoUrl: string | null; languages: string[]
  isAvailable: boolean
}
type DeptRow = { deptId: string; deptName: string; deptIcon: string; deptColor: string; morning: number; evening: number; night: number }
type NurseSelection = { deptId: string; deptName: string; shift: string; nurseId: string; nurseName: string; nurseSpecialization: string }
type Priority = 'normal' | 'urgent' | 'critical'
type RecurrenceType = 'weekly' | 'monthly' | 'custom'

/* ── Constants ─────────────────────────────────────────────── */

const SHIFTS = [
  { key: 'morning', icon: '☀️', label: 'Morning', time: '07:00–14:00', bg: '#FFF8E8', color: '#b85e00' },
  { key: 'evening', icon: '🌤️', label: 'Evening', time: '14:00–21:00', bg: '#FFF3E0', color: '#DD6B20' },
  { key: 'night',   icon: '🌙', label: 'Night',   time: '21:00–07:00', bg: '#EDE9FE', color: '#7B2FBE' },
] as const

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string; border: string; icon: string }> = {
  normal:   { label: 'Normal',   color: '#0E7B8C', bg: 'rgba(14,123,140,0.07)',  border: 'rgba(14,123,140,0.25)',  icon: '📋' },
  urgent:   { label: 'Urgent',   color: '#b85e00', bg: 'rgba(245,132,42,0.1)',   border: 'rgba(245,132,42,0.35)',  icon: '⚡' },
  critical: { label: 'Critical', color: '#E04A4A', bg: 'rgba(224,74,74,0.09)',   border: 'rgba(224,74,74,0.3)',    icon: '🚨' },
}

const LANGUAGES  = ['Arabic','English','Urdu','Hindi','Tagalog','Bengali','French']
const CITIES     = ['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Taif','Tabuk']
const STEP_LABELS = ['Service', 'Requirements', 'Match Nurses', 'Confirm']

const nxt = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0] }
function nurseEmoji(gender: string) { return gender === 'male' ? '👨‍⚕️' : '👩‍⚕️' }

function allDaySlots() {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
    slots.push(`${String(h).padStart(2,'0')}:00|${label}`)
  }
  slots.push('00:00|12:00 AM (midnight)')
  return slots
}

function calcHoursCustom(s: string, e: string) {
  const [sh, sm] = s.split(':').map(Number)
  const [eh, em] = e.split(':').map(Number)
  let sMins = sh * 60 + sm, eMins = eh * 60 + em
  if (eMins === 0) eMins = 24 * 60
  if (eMins <= sMins) return 0
  return Math.round((eMins - sMins) / 60 * 10) / 10
}

/* ── Sub-components ────────────────────────────────────────── */

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
      <button type="button" onClick={() => !readonly && onChange(Math.max(min, value - 1))} style={mBtn}>−</button>
      <span style={{ padding: '0 16px', fontSize: '1rem', fontWeight: 800, minWidth: 48, textAlign: 'center', color: 'var(--ink)' }}>{value}</span>
      <button type="button" onClick={() => !readonly && onChange(Math.min(max, value + 1))} style={mBtn}>+</button>
    </div>
  )
}

const mBtn: React.CSSProperties = { background: 'var(--shell-bg)', border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, color: 'var(--muted)', padding: '4px 14px', fontFamily: 'inherit' }

/* ── Main component ────────────────────────────────────────── */

export default function HospitalSMBookingClient({
  hospital, departments, requestedBy, nurses,
  categories, services,
  minAdvanceHours = 2, maxAdvanceDays = 30,
}: {
  hospital: Hospital
  departments: Dept[]
  requestedBy: string
  nurses: Nurse[]
  categories: SMCategory[]
  services: SMService[]
  minAdvanceHours?: number
  maxAdvanceDays?: number
}) {
  const [step, setStep]           = useState(1)
  const [isPending, startTx]      = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  /* ── Step 1: Service selection ── */
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedService, setSelectedService]       = useState<SMService | null>(null)

  /* ── Step 2: Requirements ── */
  const { minDate, maxDate } = getBookingDateBounds(minAdvanceHours, maxAdvanceDays)
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate]   = useState(minDate > today ? minDate : nxt(1))
  const [endDate, setEndDate]       = useState(nxt(7))
  const [timeMode, setTimeMode]     = useState<'shift' | 'custom'>('shift')
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set(['morning']))
  const [customStartTime, setCustomStartTime] = useState('08:00')
  const [customEndTime,   setCustomEndTime]   = useState('16:00')
  const [totalNurses, setTotalNurses] = useState(2)
  const [langPref, setLangPref]     = useState<Set<string>>(new Set(['Arabic', 'English']))
  const [genderPref, setGenderPref] = useState<'any' | 'female' | 'male'>('any')
  const [priority, setPriority]     = useState<Priority>('normal')
  const [internalNotes, setInternalNotes]     = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isRecurring, setIsRecurring]         = useState(false)
  const [recurrenceType, setRecurrenceType]   = useState<RecurrenceType>('weekly')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(nxt(30))

  const [deptRows, setDeptRows] = useState<DeptRow[]>(() =>
    departments.slice(0, 2).map(d => ({
      deptId: d.id, deptName: d.name, deptIcon: d.icon, deptColor: d.color,
      morning: 1, evening: 0, night: 0,
    }))
  )

  /* ── Step 3: Nurse matching ── */
  const [nurseSelections, setNurseSelections] = useState<NurseSelection[]>([])
  const [filterSearch, setFilterSearch]   = useState('')
  const [filterGender, setFilterGender]   = useState('Any')
  const [detailNurse, setDetailNurse]     = useState<Nurse | null>(null)
  const [availData, setAvailData]         = useState<Record<string, Record<ShiftKey, any>>>({})
  const [loadingAvail, setLoadingAvail]   = useState(false)

  useEffect(() => {
    if (step !== 3) return
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
  }, [step, startDate, nurses])

  /* ── Helpers ── */
  function toggleShift(s: string) { setSelectedShifts(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n }) }
  function toggleLang(l: string)  { setLangPref(prev => { const n = new Set(prev); n.has(l) ? n.delete(l) : n.add(l); return n }) }

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

  const slotsNeeded: { deptId: string; deptName: string; deptIcon: string; shift: string; count: number }[] = []
  deptRows.forEach(row => {
    SHIFTS.forEach(s => {
      const count = row[s.key as 'morning'|'evening'|'night']
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

  const filteredNurses = nurses.filter(n => {
    if (filterSearch && !n.name.toLowerCase().includes(filterSearch.toLowerCase()) && !n.specialization.toLowerCase().includes(filterSearch.toLowerCase())) return false
    if (filterGender !== 'Any' && n.gender.toLowerCase() !== filterGender.toLowerCase()) return false
    return true
  })

  function getNurseAvailStatus(nurseId: string, shift: string): 'available'|'partial'|'booked'|'off'|'unknown' {
    const d = availData[nurseId]
    if (!d) return 'unknown'
    return (d[shift as ShiftKey]?.status) ?? 'unknown'
  }

  function handleSubmit() {
    setError(null)
    const dateErr = validateBookingDate(startDate, undefined, minAdvanceHours, maxAdvanceDays)
    if (dateErr) { setError(dateErr.message); return }
    const fd = new FormData()
    fd.set('hospital_id',        hospital.id)
    fd.set('start_date',         startDate)
    fd.set('end_date',           endDate)
    fd.set('duration_days',      String(Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))))
    fd.set('shifts',             timeMode === 'custom' ? JSON.stringify(['custom']) : JSON.stringify([...selectedShifts]))
    if (timeMode === 'custom') { fd.set('custom_start_time', customStartTime); fd.set('custom_end_time', customEndTime) }
    fd.set('total_nurses',       String(totalNurses))
    fd.set('language_preference',JSON.stringify([...langPref]))
    fd.set('gender_preference',  genderPref)
    fd.set('special_instructions', specialInstructions)
    fd.set('dept_breakdown',     JSON.stringify(deptRows))
    fd.set('nurse_selections',   JSON.stringify(nurseSelections))
    // SM fields
    fd.set('service_id',         selectedService?.id ?? '')
    fd.set('service_name',       selectedService?.name ?? '')
    fd.set('service_base_price', String(selectedService?.base_price ?? 0))
    // Enhancement fields
    fd.set('priority',           priority)
    fd.set('internal_notes',     internalNotes)
    fd.set('is_recurring',       String(isRecurring))
    if (isRecurring) {
      fd.set('recurrence_type',     recurrenceType)
      fd.set('recurrence_end_date', recurrenceEndDate)
    }

    startTx(async () => {
      const res = await submitHospitalBookingAction(fd)
      if (res?.error) { setError(res.error); return }
      setSubmittedId(res.id ?? null)
      setSubmitted(true)
    })
  }

  /* ── Success ── */
  if (submitted) {
    const pm = PRIORITY_META[priority]
    return (
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
        <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink)', marginBottom: 8 }}>Booking Request Submitted!</div>
        {selectedService && (
          <div style={{ fontSize: '0.9rem', color: 'var(--teal)', fontWeight: 700, marginBottom: 6 }}>{selectedService.name}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
          <span style={{ background: pm.bg, color: pm.color, border: `1px solid ${pm.border}`, padding: '3px 12px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 700 }}>
            {pm.icon} {pm.label} Priority
          </span>
          {isRecurring && (
            <span style={{ background: 'rgba(107,63,160,0.1)', color: '#6B3FA0', border: '1px solid rgba(107,63,160,0.25)', padding: '3px 12px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 700 }}>
              🔁 Recurring
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.88rem', color: 'var(--muted)', maxWidth: 440, marginBottom: 24 }}>
          Your request for <strong>{totalNurses} nurses</strong> has been submitted. You can track the approval status from your dashboard.
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
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

  const filteredServices = selectedCategoryId ? services.filter(s => s.category_id === selectedCategoryId) : services

  return (
    <div style={{ padding: '1.2rem 1.5rem 5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--teal)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>BULK NURSE BOOKING</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '2px 0 0' }}>Select a service and define your staffing requirements</p>
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

      {/* ══ STEP 1: Service Selection ══ */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Category filter chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, border: `1.5px solid ${selectedCategoryId === null ? '#0E7B8C' : 'var(--border)'}`, background: selectedCategoryId === null ? '#0E7B8C' : 'var(--card)', color: selectedCategoryId === null ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}
            >
              All Categories
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategoryId(c.id)}
                style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, border: `1.5px solid ${selectedCategoryId === c.id ? '#0E7B8C' : 'var(--border)'}`, background: selectedCategoryId === c.id ? '#0E7B8C' : 'var(--card)', color: selectedCategoryId === c.id ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}
              >
                {c.icon && <span style={{ marginRight: 4 }}>{c.icon}</span>}{c.name}
              </button>
            ))}
          </div>

          {/* Service grid */}
          {filteredServices.length === 0 ? (
            <div className="dash-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>🩺</div>
              <div style={{ fontWeight: 700, color: 'var(--muted)' }}>No services in this category</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {filteredServices.map(svc => {
                const selected = selectedService?.id === svc.id
                const cat = categories.find(c => c.id === svc.category_id)
                return (
                  <div
                    key={svc.id}
                    onClick={() => setSelectedService(selected ? null : svc)}
                    style={{
                      border: `2px solid ${selected ? '#0E7B8C' : 'var(--border)'}`,
                      borderRadius: 12, padding: '1.1rem', cursor: 'pointer',
                      background: selected ? 'rgba(14,123,140,0.05)' : 'var(--card)',
                      transition: 'all 0.15s', position: 'relative',
                    }}
                  >
                    {selected && (
                      <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, background: '#0E7B8C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#fff', fontWeight: 900 }}>✓</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(14,123,140,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                        {cat?.icon ?? '🩺'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>{svc.name}</div>
                        {cat && <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 1 }}>{cat.name}</div>}
                      </div>
                    </div>
                    {svc.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 10, lineHeight: 1.4 }}>{svc.description}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0E7B8C' }}>
                        SAR {svc.base_price.toFixed(0)}
                        {svc.max_price && <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 500 }}> – {svc.max_price.toFixed(0)}</span>}
                      </div>
                      {svc.duration_minutes && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--muted)', background: 'var(--shell-bg)', padding: '2px 7px', borderRadius: 50 }}>⏱ {svc.duration_minutes}min</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selectedService && (
            <div style={{ background: 'rgba(14,123,140,0.06)', border: '1px solid rgba(14,123,140,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>Selected: {selectedService.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>SAR {selectedService.base_price.toFixed(0)} base price · Continue to set requirements</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ STEP 2: Requirements ══ */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Selected service summary pill */}
          {selectedService && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(14,123,140,0.06)', border: '1px solid rgba(14,123,140,0.18)', borderRadius: 9, padding: '8px 14px' }}>
              <span style={{ fontSize: '0.8rem' }}>🩺</span>
              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--teal)' }}>{selectedService.name}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 4 }}>SAR {selectedService.base_price.toFixed(0)}</span>
              <button type="button" onClick={() => setStep(1)} style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--teal)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Change →</button>
            </div>
          )}

          <Section icon="📋" title="Staffing Requirements" sub="Define your hospital needs">
            {/* Priority */}
            <FG label="PRIORITY" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(Object.entries(PRIORITY_META) as [Priority, typeof PRIORITY_META[Priority]][]).map(([key, meta]) => (
                  <button key={key} type="button" onClick={() => setPriority(key)} style={{ padding: '7px 16px', borderRadius: 9, fontSize: '0.78rem', fontWeight: 700, border: `1.5px solid ${priority === key ? meta.color : 'var(--border)'}`, background: priority === key ? meta.bg : 'var(--card)', color: priority === key ? meta.color : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>
              {priority !== 'normal' && (
                <div style={{ marginTop: 8, fontSize: '0.72rem', color: PRIORITY_META[priority].color, fontWeight: 600 }}>
                  {priority === 'urgent' ? '⚡ This request will be highlighted for faster admin review.' : '🚨 Critical requests are surfaced immediately to admin.'}
                </div>
              )}
            </FG>

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
              <FG label="START DATE" hint={`Min ${minAdvanceHours}h advance`}>
                <input type="date" className="form-input" value={startDate} min={minDate} max={maxDate} onChange={e => { setStartDate(e.target.value); if (e.target.value >= endDate) setEndDate(e.target.value) }} />
              </FG>
              <FG label="END DATE">
                <input type="date" className="form-input" value={endDate} min={startDate} max={maxDate} onChange={e => setEndDate(e.target.value)} />
              </FG>
            </div>

            <FG label="TIME PREFERENCE" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, background: 'var(--shell-bg)', borderRadius: 9, padding: 4, width: 'fit-content' }}>
                {(['shift', 'custom'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setTimeMode(m)} style={{ padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700, background: timeMode === m ? '#0E7B8C' : 'transparent', color: timeMode === m ? '#fff' : 'var(--muted)', transition: 'all 0.15s' }}>
                    {m === 'shift' ? '🕐 Shift-Based' : '⏰ Custom Time'}
                  </button>
                ))}
              </div>
              {timeMode === 'shift' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {SHIFTS.map(s => (
                    <div key={s.key} onClick={() => toggleShift(s.key)} style={{ border: `2px solid ${selectedShifts.has(s.key) ? '#0E7B8C' : 'var(--border)'}`, borderRadius: 10, padding: '12px 8px', cursor: 'pointer', textAlign: 'center', background: selectedShifts.has(s.key) ? 'rgba(14,123,140,0.05)' : 'var(--shell-bg)', transition: 'all 0.12s' }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: 3 }}>{s.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--ink)' }}>{s.label}</div>
                      <div style={{ fontSize: '0.67rem', color: 'var(--muted)', marginTop: 1 }}>{s.time}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#0E7B8C', marginBottom: 4 }}>START TIME</div>
                      <select value={customStartTime} onChange={e => setCustomStartTime(e.target.value)} style={{ width: '100%', padding: '7px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.82rem', fontFamily: 'inherit', background: 'var(--card)', color: 'var(--ink)' }}>
                        {allDaySlots().slice(0,24).map(s => { const [v,l] = s.split('|'); return <option key={v} value={v}>{l}</option> })}
                      </select>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 18 }}>→</span>
                    <div>
                      <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#0E7B8C', marginBottom: 4 }}>END TIME</div>
                      <select value={customEndTime} onChange={e => setCustomEndTime(e.target.value)} style={{ width: '100%', padding: '7px 8px', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.82rem', fontFamily: 'inherit', background: 'var(--card)', color: 'var(--ink)' }}>
                        {allDaySlots().slice(1).map(s => { const [v,l] = s.split('|'); return <option key={v} value={v}>{l}</option> })}
                      </select>
                    </div>
                  </div>
                  {calcHoursCustom(customStartTime, customEndTime) > 0 && (
                    <div style={{ marginTop: 8, fontSize: '0.75rem', fontWeight: 700, color: '#0E7B8C' }}>{calcHoursCustom(customStartTime, customEndTime)}h per shift</div>
                  )}
                </div>
              )}
            </FG>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 14 }}>
              <FG label="TOTAL NURSES NEEDED">
                <Counter value={totalNurses} min={1} max={200} onChange={setTotalNurses} />
              </FG>
              <FG label="DURATION (DAYS)">
                <Counter value={Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))} min={1} max={365} onChange={() => {}} readonly />
              </FG>
            </div>
          </Section>

          {/* Department Breakdown */}
          <Section icon="🏢" title="Department Breakdown" sub="Distribute nurses across departments">
            {deptRows.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: row.deptColor, flexShrink: 0 }} />
                <select value={row.deptId} onChange={e => updateDeptRow(idx, 'deptId', e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '0.82rem', fontWeight: 600, background: 'var(--card)', color: 'var(--ink)', fontFamily: 'inherit', cursor: 'pointer' }}>
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
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', background: 'var(--shell-bg)', borderRadius: 8, padding: '8px 14px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Total allocated</span>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: totalAllocated === totalNurses ? '#1A7A4A' : '#b85e00' }}>{totalAllocated} / {totalNurses}</span>
            </div>
          </Section>

          {/* Additional Requirements */}
          <Section icon="⚙️" title="Additional Requirements">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 14 }}>
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

            <FG label="SPECIAL INSTRUCTIONS" style={{ marginBottom: 14 }}>
              <textarea className="form-input" rows={2} value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="Certifications required (BLS, ACLS), department-specific requirements..." style={{ resize: 'vertical' }} />
            </FG>

            <FG label="INTERNAL NOTES (admin-visible only)" style={{ marginBottom: 14 }}>
              <textarea className="form-input" rows={2} value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Internal reference, cost centre, HR notes — not shown to nurses..." style={{ resize: 'vertical' }} />
            </FG>
          </Section>

          {/* Recurring */}
          <Section icon="🔁" title="Recurring Request" sub="Automatically repeat this booking">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isRecurring ? 14 : 0 }}>
              <div
                onClick={() => setIsRecurring(v => !v)}
                style={{ width: 44, height: 24, borderRadius: 12, background: isRecurring ? '#0E7B8C' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute', top: 2, left: isRecurring ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>Enable recurring request</span>
            </div>
            {isRecurring && (
              <div style={{ background: '#FFF8E6', border: '1.5px solid #F59E0B', borderRadius: 10, padding: '10px 14px', marginBottom: 14, marginTop: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.83rem', color: '#92400E' }}>Manual Processing — Automatic Repetition Not Yet Active</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#92400E', lineHeight: 1.45 }}>Your recurrence preference will be saved and visible to the admin team. An admin will manually coordinate and confirm each recurring session. You will be notified for each occurrence individually.</p>
                </div>
              </div>
            )}
            {isRecurring && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
                <FG label="RECURRENCE PATTERN">
                  <div style={{ display: 'flex', gap: 7 }}>
                    {(['weekly','monthly','custom'] as const).map(rt => (
                      <button key={rt} type="button" onClick={() => setRecurrenceType(rt)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: '0.73rem', fontWeight: 600, border: `1.5px solid ${recurrenceType === rt ? '#6B3FA0' : 'var(--border)'}`, background: recurrenceType === rt ? 'rgba(107,63,160,0.1)' : 'var(--card)', color: recurrenceType === rt ? '#6B3FA0' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{rt}</button>
                    ))}
                  </div>
                </FG>
                <FG label="REPEAT UNTIL">
                  <input type="date" className="form-input" value={recurrenceEndDate} min={endDate} onChange={e => setRecurrenceEndDate(e.target.value)} />
                </FG>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ══ STEP 3: Nurse Matching ══ */}
      {step === 3 && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="form-input" placeholder="Search nurse name or specialization..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} style={{ maxWidth: 260, fontSize: '0.83rem' }} />
            <select className="form-input" value={filterGender} onChange={e => setFilterGender(e.target.value)} style={{ maxWidth: 140 }}>
              <option value="Any">Any Gender</option>
              <option value="female">Female Only</option>
              <option value="male">Male Only</option>
            </select>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginLeft: 'auto' }}>
              {loadingAvail ? '⏳ Loading availability...' : `${filteredNurses.length} nurses found`}
            </span>
          </div>

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
                    const avStatus = getNurseAvailStatus(nurse.id, slot.shift)
                    const sel = isSelected(slot.deptId, slot.shift, nurse.id)
                    const isBooked = avStatus === 'booked' || avStatus === 'off'
                    const statusColor = avStatus === 'available' ? '#1A7A4A' : avStatus === 'partial' ? '#b85e00' : avStatus === 'booked' || avStatus === 'off' ? '#E04A4A' : '#94A3B8'
                    const statusLabel = avStatus === 'available' ? '✓ Available' : avStatus === 'partial' ? '◑ Partial' : avStatus === 'booked' ? '✗ Booked' : avStatus === 'off' ? '✗ Off' : '— Unknown'
                    return (
                      <div key={nurse.id} style={{ border: `2px solid ${sel ? '#0E7B8C' : 'var(--border)'}`, borderRadius: 10, padding: '10px 12px', background: sel ? 'rgba(14,123,140,0.04)' : 'var(--card)', opacity: isBooked && !sel ? 0.5 : 1, position: 'relative' }}>
                        {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, background: '#0E7B8C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: 900 }}>✓</div>}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(14,123,140,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0, overflow: 'hidden' }}>
                            {nurse.photoUrl ? <img src={nurse.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : nurseEmoji(nurse.gender)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nurse.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 1 }}>{nurse.specialization}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 1 }}>📍 {nurse.city} · {nurse.experienceYears}yr exp</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: statusColor, background: statusColor + '18', padding: '2px 8px', borderRadius: 50 }}>{statusLabel}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700 }}>SAR {nurse.dailyRate}/day</span>
                        </div>
                        {nurse.languages.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                            {nurse.languages.slice(0,3).map(l => (
                              <span key={l} style={{ background: 'rgba(14,123,140,0.08)', color: 'var(--teal)', fontSize: '0.62rem', fontWeight: 600, padding: '1px 6px', borderRadius: 50 }}>🗣 {l}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setDetailNurse(nurse)} style={{ flex: 1, background: 'var(--shell-bg)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '5px 0', borderRadius: 7, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>View Profile</button>
                          <button
                            onClick={() => !isBooked && selectNurse(slot.deptId, slot.deptName, slot.shift, nurse)}
                            disabled={isBooked}
                            style={{ flex: 2, background: sel ? '#0E7B8C' : isBooked ? 'var(--shell-bg)' : 'rgba(14,123,140,0.08)', border: `1px solid ${sel ? '#0E7B8C' : 'var(--border)'}`, color: sel ? '#fff' : isBooked ? 'var(--muted)' : 'var(--teal)', padding: '5px 0', borderRadius: 7, fontSize: '0.72rem', fontWeight: 700, cursor: isBooked ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
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

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{nurseSelections.length} nurses selected</span>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: nurseSelections.length > 0 ? 'var(--teal)' : 'var(--muted)' }}>{nurseSelections.length > 0 ? 'Ready to confirm' : 'No selections yet'}</span>
          </div>
        </div>
      )}

      {/* ══ STEP 4: Confirm ══ */}
      {step === 4 && (
        <Section icon="📤" title="Confirm & Submit" sub="Review your request before submitting">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'Service',            value: selectedService?.name ?? '—' },
              { label: 'Hospital',           value: hospital.name },
              { label: 'Period',             value: `${startDate} → ${endDate}` },
              { label: 'Time',               value: timeMode === 'custom' ? `Custom: ${customStartTime} – ${customEndTime} (${calcHoursCustom(customStartTime, customEndTime)}h)` : [...selectedShifts].join(', ') || '—' },
              { label: 'Total Nurses',       value: String(totalNurses) },
              { label: 'Language',           value: [...langPref].join(', ') || 'Any' },
              { label: 'Gender',             value: genderPref },
              { label: 'Priority',           value: `${PRIORITY_META[priority].icon} ${PRIORITY_META[priority].label}`, color: PRIORITY_META[priority].color },
              ...(isRecurring ? [{ label: 'Recurring', value: `${recurrenceType} until ${recurrenceEndDate}`, color: '#6B3FA0' }] : []),
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 180, flexShrink: 0, fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>{r.label}</div>
                <div style={{ fontSize: '0.82rem', color: (r as any).color ?? 'var(--ink)', fontWeight: 600 }}>{r.value}</div>
              </div>
            ))}
          </div>

          {internalNotes && (
            <div style={{ marginTop: 14, background: 'rgba(107,63,160,0.06)', border: '1px solid rgba(107,63,160,0.2)', borderRadius: 9, padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6B3FA0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Internal Notes</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>{internalNotes}</div>
            </div>
          )}

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

          {selectedService && (
            <div style={{ marginTop: 16, background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Service Pricing (Informational)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--ink)', fontWeight: 600 }}>{selectedService.name}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0E7B8C' }}>SAR {selectedService.base_price.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>× {totalNurses} nurse{totalNurses !== 1 ? 's' : ''} — final pricing confirmed by admin</div>
            </div>
          )}

          <div style={{ background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 9, padding: '12px 16px', marginTop: 16, fontSize: '0.8rem', color: 'var(--muted)' }}>
            ℹ️ Submitting creates a booking request with <strong>pending</strong> status. Admin will review and assign nurses. Track progress from your dashboard.
          </div>
        </Section>
      )}

      {/* ── Fixed bottom nav ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 260, right: 0, background: 'var(--card)', borderTop: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>Hospital Booking</span>
          <div style={{ width: 100, height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: '100%', borderRadius: 2, background: '#0E7B8C', width: `${(step / 4) * 100}%`, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Step {step} of 4</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '9px 20px', borderRadius: 9, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
          )}
          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 1 && !selectedService) { setError('Please select a service to continue'); return }
                if (step === 2) {
                  if (timeMode === 'shift' && selectedShifts.size === 0) { setError('Please select at least one shift'); return }
                  if (timeMode === 'custom' && calcHoursCustom(customStartTime, customEndTime) <= 0) { setError('Please select a valid custom time range'); return }
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }} onClick={e => e.target === e.currentTarget && setDetailNurse(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(14,123,140,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', overflow: 'hidden' }}>
                {detailNurse.photoUrl ? <img src={detailNurse.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : nurseEmoji(detailNurse.gender)}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)' }}>{detailNurse.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{detailNurse.specialization}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 700, marginTop: 2 }}>SAR {detailNurse.dailyRate}/day</div>
              </div>
              <button onClick={() => setDetailNurse(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
            </div>
            {[
              { label: 'City',        value: detailNurse.city },
              { label: 'Experience',  value: `${detailNurse.experienceYears} years` },
              { label: 'Gender',      value: detailNurse.gender },
              { label: 'Nationality', value: detailNurse.nationality || '—' },
              { label: 'Languages',   value: detailNurse.languages.join(', ') || '—' },
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
