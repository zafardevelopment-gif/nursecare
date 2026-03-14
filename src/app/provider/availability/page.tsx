'use client'

import { useState, useCallback } from 'react'

// ── Types ───────────────────────────────────────────────
type Slot = { start: string; end: string }
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
type DayState = { available: boolean; slots: Slot[] }
type Mode = 'weekly' | 'flexible' | 'range'

const DAYS: { key: DayKey; label: string; abbr: string }[] = [
  { key: 'mon', label: 'Monday',    abbr: 'MON' },
  { key: 'tue', label: 'Tuesday',   abbr: 'TUE' },
  { key: 'wed', label: 'Wednesday', abbr: 'WED' },
  { key: 'thu', label: 'Thursday',  abbr: 'THU' },
  { key: 'fri', label: 'Friday',    abbr: 'FRI' },
  { key: 'sat', label: 'Saturday',  abbr: 'SAT' },
  { key: 'sun', label: 'Sunday',    abbr: 'SUN' },
]

const INITIAL_DAYS: Record<DayKey, DayState> = {
  mon: { available: true,  slots: [{ start: '08:00', end: '14:00' }] },
  tue: { available: true,  slots: [{ start: '14:00', end: '20:00' }] },
  wed: { available: false, slots: [] },
  thu: { available: true,  slots: [{ start: '08:00', end: '16:00' }] },
  fri: { available: true,  slots: [{ start: '09:00', end: '17:00' }] },
  sat: { available: false, slots: [] },
  sun: { available: false, slots: [] },
}

function calcTotalMins(days: Record<DayKey, DayState>) {
  let total = 0
  for (const d of Object.values(days)) {
    if (!d.available) continue
    for (const s of d.slots) {
      const [sh, sm] = s.start.split(':').map(Number)
      const [eh, em] = s.end.split(':').map(Number)
      const diff = (eh * 60 + em) - (sh * 60 + sm)
      if (diff > 0) total += diff
    }
  }
  return total
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Toast ───────────────────────────────────────────────
function Toast({ msg, icon, show }: { msg: string; icon: string; show: boolean }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 90,
      right: 28,
      background: '#0C1E26',
      color: '#fff',
      padding: '13px 18px',
      borderRadius: 12,
      fontSize: '0.85rem',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      zIndex: 1000,
      transform: show ? 'translateY(0)' : 'translateY(20px)',
      opacity: show ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      pointerEvents: 'none',
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span>{msg}</span>
    </div>
  )
}

// ── Toggle Switch ───────────────────────────────────────
function Toggle({
  checked, onChange,
}: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        border: 'none',
        cursor: 'pointer',
        background: checked ? '#27A869' : '#D1DFE3',
        position: 'relative',
        transition: 'background 0.25s',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: checked ? 23 : 3,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.25s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        display: 'block',
      }} />
    </button>
  )
}

// ── Day Row ─────────────────────────────────────────────
function DayRow({
  day, state, onToggle, onAddSlot, onRemoveSlot, onUpdateSlot,
}: {
  day: typeof DAYS[number]
  state: DayState
  onToggle: (v: boolean) => void
  onAddSlot: () => void
  onRemoveSlot: (idx: number) => void
  onUpdateSlot: (idx: number, field: 'start' | 'end', val: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  const summaryText = state.available
    ? state.slots.map(s => `${s.start}–${s.end}`).join('  ·  ')
    : 'Not available'

  return (
    <div style={{
      background: state.available ? '#fff' : '#F7FAFC',
      border: `1.5px solid ${state.available ? 'rgba(14,123,140,0.2)' : '#E5EDF0'}`,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: state.available ? '0 1px 6px rgba(14,123,140,0.06)' : 'none',
      transition: 'all 0.25s',
    }}>
      {/* Day header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 18px',
          cursor: 'pointer',
        }}
        onClick={() => state.available && setCollapsed(c => !c)}
      >
        {/* Abbr badge */}
        <div style={{
          width: 42, height: 42,
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: state.available ? 'rgba(14,123,140,0.1)' : '#EEF2F3',
          color: state.available ? '#0E7B8C' : '#8A9BAA',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          {day.abbr}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1E2D' }}>
            {day.label}
          </div>
          <div style={{
            fontSize: '0.75rem',
            marginTop: 1,
            color: state.available ? '#27A869' : '#8A9BAA',
            fontFamily: 'monospace',
          }}>
            {summaryText}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          {/* Pill */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: '0.7rem',
            fontWeight: 700,
            background: state.available ? 'rgba(39,168,105,0.1)' : '#EEF2F3',
            color: state.available ? '#27A869' : '#8A9BAA',
          }}>
            {state.available ? '✓ Available' : '✕ Off'}
          </span>

          {/* Toggle */}
          <span onClick={e => e.stopPropagation()}>
            <Toggle checked={state.available} onChange={onToggle} />
          </span>

          {/* Collapse arrow */}
          {state.available && (
            <span style={{
              fontSize: 12,
              color: '#8A9BAA',
              transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>▼</span>
          )}
        </div>
      </div>

      {/* Slots */}
      {state.available && !collapsed && (
        <div style={{
          borderTop: '1px solid #E5EDF0',
          padding: '0 18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {state.slots.map((slot, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(14,123,140,0.04)',
              border: '1px solid rgba(14,123,140,0.12)',
              borderRadius: 10,
              padding: '10px 14px',
              marginTop: idx === 0 ? 12 : 0,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                <label style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#8A9BAA',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>Start Time</label>
                <input
                  type="time"
                  value={slot.start}
                  onChange={e => onUpdateSlot(idx, 'start', e.target.value)}
                  style={{
                    padding: '8px 10px',
                    border: '1.5px solid #E5EDF0',
                    borderRadius: 8,
                    fontSize: '0.88rem',
                    fontFamily: 'monospace',
                    fontWeight: 500,
                    color: '#0B1E2D',
                    background: '#fff',
                    outline: 'none',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                />
              </div>

              <div style={{ fontSize: 16, color: '#8A9BAA', paddingTop: 18, flexShrink: 0 }}>→</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                <label style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#8A9BAA',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>End Time</label>
                <input
                  type="time"
                  value={slot.end}
                  onChange={e => onUpdateSlot(idx, 'end', e.target.value)}
                  style={{
                    padding: '8px 10px',
                    border: '1.5px solid #E5EDF0',
                    borderRadius: 8,
                    fontSize: '0.88rem',
                    fontFamily: 'monospace',
                    fontWeight: 500,
                    color: '#0B1E2D',
                    background: '#fff',
                    outline: 'none',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                />
              </div>

              {state.slots.length > 1 && (
                <button
                  onClick={() => onRemoveSlot(idx)}
                  style={{
                    width: 28, height: 28,
                    borderRadius: 7,
                    background: 'none',
                    border: '1.5px solid #E0E7EA',
                    color: '#8A9BAA',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    marginTop: 16,
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.background = 'rgba(224,74,74,0.08)'
                    el.style.borderColor = '#E04A4A'
                    el.style.color = '#E04A4A'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.background = 'none'
                    el.style.borderColor = '#E0E7EA'
                    el.style.color = '#8A9BAA'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            onClick={onAddSlot}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              border: '1.5px dashed #4DB6C4',
              borderRadius: 9,
              background: 'none',
              color: '#0E7B8C',
              fontSize: '0.82rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.2s',
              alignSelf: 'flex-start',
              marginTop: 4,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(14,123,140,0.06)'
              e.currentTarget.style.borderStyle = 'solid'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.borderStyle = 'dashed'
            }}
          >
            + Add Time Slot
          </button>
        </div>
      )}
    </div>
  )
}

// ── Summary Panel ────────────────────────────────────────
function SummaryPanel({
  mode, days, rangeStart, rangeEnd, rangeTimeStart, rangeTimeEnd,
}: {
  mode: Mode
  days: Record<DayKey, DayState>
  rangeStart: string
  rangeEnd: string
  rangeTimeStart: string
  rangeTimeEnd: string
}) {
  const activeDays = DAYS.filter(d => days[d.key].available).length
  const totalMins = calcTotalMins(days)

  return (
    <div style={{
      background: 'linear-gradient(145deg, #004A54 0%, #006D7A 100%)',
      borderRadius: 16,
      padding: 22,
      color: '#fff',
      position: 'sticky',
      top: 24,
    }}>
      <div style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        📋 Availability Summary
      </div>

      {mode === 'flexible' && (
        <>
          {DAYS.map(day => (
            <div key={day.key} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.82rem',
            }}>
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)', width: 40 }}>{day.abbr}</span>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#4ADE80',
                boxShadow: '0 0 6px rgba(74,222,128,0.5)', flexShrink: 0,
              }} />
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#fff', flex: 1, marginLeft: 10 }}>
                Any time (Flexible)
              </span>
            </div>
          ))}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>7</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Days Active</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>Any</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Weekly Hours</div>
            </div>
          </div>
        </>
      )}

      {mode === 'range' && (
        <>
          {rangeStart && rangeEnd ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem',
              }}>
                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)', width: 40 }}>FROM</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#fff', flex: 1, marginLeft: 10 }}>
                  {fmtDate(rangeStart)}
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem',
              }}>
                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)', width: 40 }}>TO</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#fff', flex: 1, marginLeft: 10 }}>
                  {fmtDate(rangeEnd)}
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', fontSize: '0.82rem',
              }}>
                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)', width: 40 }}>TIME</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#fff', flex: 1, marginLeft: 10 }}>
                  {rangeTimeStart} – {rangeTimeEnd}
                </span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px 0' }}>
              Set a date range above
            </div>
          )}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>—</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Days Active</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>—</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Weekly Hours</div>
            </div>
          </div>
        </>
      )}

      {mode === 'weekly' && (
        <>
          {DAYS.map(day => {
            const d = days[day.key]
            return (
              <div key={day.key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.82rem',
              }}>
                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)', width: 40, flexShrink: 0 }}>{day.abbr}</span>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: d.available ? '#4ADE80' : 'rgba(255,255,255,0.2)',
                  boxShadow: d.available ? '0 0 6px rgba(74,222,128,0.5)' : 'none',
                }} />
                {d.available
                  ? <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#fff', flex: 1 }}>
                      {d.slots.map(s => `${s.start}–${s.end}`).join(', ')}
                    </span>
                  : <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', flex: 1 }}>
                      Not available
                    </span>
                }
              </div>
            )
          })}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{activeDays}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Days Active</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                {totalMins > 0 ? `${Math.round(totalMins / 60)}h` : '0h'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Weekly Hours</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────
export default function AvailabilityPage() {
  const [mode, setMode] = useState<Mode>('weekly')
  const [flexActive, setFlexActive] = useState(false)
  const [days, setDays] = useState<Record<DayKey, DayState>>(INITIAL_DAYS)
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [rangeTimeStart, setRangeTimeStart] = useState('08:00')
  const [rangeTimeEnd, setRangeTimeEnd] = useState('18:00')
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null)
  const [toast, setToast] = useState({ show: false, msg: '', icon: '✓' })
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState('Today at 10:42 AM')

  const showToast = useCallback((msg: string, icon = '✓') => {
    setToast({ show: true, msg, icon })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
  }, [])

  const updateDay = useCallback((key: DayKey, update: Partial<DayState>) => {
    setDays(prev => ({ ...prev, [key]: { ...prev[key], ...update } }))
  }, [])

  const toggleDay = useCallback((key: DayKey, enabled: boolean) => {
    setDays(prev => ({
      ...prev,
      [key]: {
        available: enabled,
        slots: enabled && prev[key].slots.length === 0
          ? [{ start: '08:00', end: '17:00' }]
          : prev[key].slots,
      },
    }))
  }, [])

  const addSlot = useCallback((key: DayKey) => {
    setDays(prev => {
      const slots = prev[key].slots
      const last = slots[slots.length - 1]
      return {
        ...prev,
        [key]: { ...prev[key], slots: [...slots, { start: last?.end ?? '08:00', end: '18:00' }] },
      }
    })
    showToast('Time slot added', '⏰')
  }, [showToast])

  const removeSlot = useCallback((key: DayKey, idx: number) => {
    setDays(prev => {
      const slots = prev[key].slots.filter((_, i) => i !== idx)
      return {
        ...prev,
        [key]: { ...prev[key], slots: slots.length === 0 ? [{ start: '08:00', end: '17:00' }] : slots },
      }
    })
  }, [])

  const updateSlot = useCallback((key: DayKey, idx: number, field: 'start' | 'end', val: string) => {
    setDays(prev => {
      const slots = prev[key].slots.map((s, i) => i === idx ? { ...s, [field]: val } : s)
      return { ...prev, [key]: { ...prev[key], slots } }
    })
  }, [])

  const applyTemplate = (tplKey: string) => {
    const templates: Record<string, Slot> = {
      morning:  { start: '07:00', end: '13:00' },
      evening:  { start: '14:00', end: '20:00' },
      fulltime: { start: '08:00', end: '18:00' },
    }
    if (appliedTemplate === tplKey) {
      setAppliedTemplate(null)
      showToast('Template removed', '↩')
      return
    }
    const tpl = templates[tplKey]
    setDays(prev => {
      const next = { ...prev }
      for (const d of DAYS) {
        if (d.key !== 'sat' && d.key !== 'sun') {
          next[d.key] = { available: true, slots: [{ ...tpl }] }
        }
      }
      return next
    })
    setAppliedTemplate(tplKey)
    showToast(`Template applied: ${tplKey}`, '📋')
  }

  const resetAll = () => {
    if (!confirm('Reset all availability to default? This cannot be undone.')) return
    setDays({
      mon: { available: false, slots: [] },
      tue: { available: false, slots: [] },
      wed: { available: false, slots: [] },
      thu: { available: false, slots: [] },
      fri: { available: false, slots: [] },
      sat: { available: false, slots: [] },
      sun: { available: false, slots: [] },
    })
    setAppliedTemplate(null)
    showToast('Availability has been reset', '↩')
  }

  const saveAvailability = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setLastSaved('Just now')
      showToast('Availability saved successfully!', '✓')
    }, 900)
  }

  return (
    <div style={{ background: '#F0F5F8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #E5EDF0',
        padding: '0 28px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#8A9BAA' }}>
          <a href="/provider/dashboard" style={{ color: '#0E7B8C', textDecoration: 'none' }}>Dashboard</a>
          <span>›</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B1E2D' }}>Availability</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={resetAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              background: 'none', border: '1.5px solid #E5EDF0', color: '#3D5A63',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            ↩ Reset
          </button>
          <button
            onClick={saveAvailability}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              background: '#0E7B8C', color: '#fff', border: 'none',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            {saving ? '⏳ Saving…' : '✓ Save Changes'}
          </button>
        </div>
      </div>

      {/* Page body */}
      <div style={{ padding: 28, flex: 1 }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(14,123,140,0.06)',
            border: '1px solid rgba(14,123,140,0.15)',
            borderRadius: 6, padding: '3px 10px',
            fontSize: '0.72rem', fontFamily: 'monospace', color: '#0E7B8C',
            marginBottom: 10,
          }}>
            📍 /provider/availability
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', fontWeight: 700, color: '#0B1E2D', marginBottom: 4 }}>
            Manage Availability
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#8A9BAA' }}>
            Set your working hours so patients can only book you during your available times.
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 24,
          alignItems: 'start',
        }}>

          {/* Left column */}
          <div>

            {/* Mode Card */}
            <div className="dash-card" style={{ marginBottom: 20 }}>
              <div className="dash-card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: 'rgba(14,123,140,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>⚡</div>
                <div>
                  <div className="dash-card-title">Availability Mode</div>
                  <div style={{ fontSize: '0.78rem', color: '#8A9BAA', marginTop: 1 }}>
                    Choose how you want to set your availability
                  </div>
                </div>
              </div>
              <div className="dash-card-body">

                {/* Mode tabs */}
                <div style={{
                  display: 'flex', gap: 6,
                  background: '#F0F5F8', border: '1px solid #E5EDF0',
                  borderRadius: 12, padding: 5, marginBottom: 22,
                }}>
                  {(['weekly', 'flexible', 'range'] as Mode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 9,
                        fontSize: '0.82rem', fontWeight: 600, textAlign: 'center',
                        cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                        background: mode === m ? '#fff' : 'none',
                        color: mode === m ? '#0E7B8C' : '#8A9BAA',
                        boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      {m === 'weekly' ? '📅 Weekly Schedule'
                        : m === 'flexible' ? '🌐 Fully Flexible'
                        : '📆 Date Range'}
                    </button>
                  ))}
                </div>

                {/* Flexible Panel */}
                {mode === 'flexible' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0B1E2D' }}>Fully Flexible Mode</div>
                        <div style={{ fontSize: '0.78rem', color: '#8A9BAA', marginTop: 2 }}>
                          Available for bookings any day and any time
                        </div>
                      </div>
                      <Toggle checked={flexActive} onChange={v => setFlexActive(v)} />
                    </div>
                    {flexActive && (
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(14,123,140,0.08), rgba(14,123,140,0.04))',
                        border: '1.5px solid rgba(14,123,140,0.2)',
                        borderRadius: 12, padding: '18px 20px',
                        display: 'flex', alignItems: 'center', gap: 14,
                      }}>
                        <div style={{
                          width: 44, height: 44, background: '#0E7B8C',
                          borderRadius: 12, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 20, flexShrink: 0,
                        }}>🌐</div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#004A54' }}>
                            Fully Flexible — You're always available!
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#0E7B8C', marginTop: 2 }}>
                            Patients can book you any day and any time. Your calendar stays open.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Date Range Panel */}
                {mode === 'range' && (
                  <div>
                    <div style={{
                      background: 'rgba(201,168,76,0.08)',
                      border: '1px solid rgba(201,168,76,0.25)',
                      borderRadius: 10, padding: '12px 16px',
                      display: 'flex', gap: 10, fontSize: '0.78rem', color: '#C9A84C',
                      marginBottom: 18,
                    }}>
                      <span>💡</span>
                      <div>
                        Set a specific period when you are available — useful for "available the whole month" or a short project.
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {[
                        { label: '📅 Start Date', type: 'date', value: rangeStart, onChange: setRangeStart },
                        { label: '📅 End Date',   type: 'date', value: rangeEnd,   onChange: setRangeEnd },
                        { label: '🕐 Start Time', type: 'time', value: rangeTimeStart, onChange: setRangeTimeStart },
                        { label: '🕐 End Time',   type: 'time', value: rangeTimeEnd,   onChange: setRangeTimeEnd },
                      ].map(f => (
                        <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{
                            fontSize: '0.68rem', fontWeight: 700, color: '#8A9BAA',
                            textTransform: 'uppercase', letterSpacing: '1px',
                          }}>{f.label}</label>
                          <input
                            type={f.type}
                            value={f.value}
                            onChange={e => f.onChange(e.target.value)}
                            className="form-input"
                            style={{ padding: '10px 12px', fontSize: '0.88rem' }}
                          />
                        </div>
                      ))}
                    </div>

                    {rangeStart && rangeEnd && (
                      <div style={{
                        background: 'rgba(14,123,140,0.06)',
                        border: '1px solid rgba(14,123,140,0.15)',
                        borderRadius: 10, padding: '12px 14px',
                        marginTop: 14, display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <span style={{ fontSize: 18 }}>✅</span>
                        <div style={{ fontSize: '0.82rem', color: '#0E7B8C', fontWeight: 500 }}>
                          Available from <strong style={{ fontFamily: 'monospace' }}>{fmtDate(rangeStart)}</strong>{' '}
                          to <strong style={{ fontFamily: 'monospace' }}>{fmtDate(rangeEnd)}</strong>,{' '}
                          <strong style={{ fontFamily: 'monospace' }}>{rangeTimeStart} – {rangeTimeEnd}</strong> daily.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Schedule Card */}
            {mode === 'weekly' && (
              <div className="dash-card">
                <div className="dash-card-header" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 11,
                      background: 'rgba(39,168,105,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>📅</div>
                    <div>
                      <div className="dash-card-title">Weekly Schedule</div>
                      <div style={{ fontSize: '0.78rem', color: '#8A9BAA', marginTop: 1 }}>
                        Set your regular working hours for each day
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['morning', 'evening', 'fulltime'] as const).map(tpl => (
                      <button
                        key={tpl}
                        onClick={() => applyTemplate(tpl)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 13px', border: '1.5px solid',
                          borderColor: appliedTemplate === tpl ? '#0E7B8C' : '#E5EDF0',
                          borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                          color: appliedTemplate === tpl ? '#004A54' : '#3D5A63',
                          background: appliedTemplate === tpl ? 'rgba(14,123,140,0.08)' : '#fff',
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                        }}
                      >
                        {tpl === 'morning' ? '🌅 Mornings'
                          : tpl === 'evening' ? '🌙 Evenings'
                          : '💼 Full-time'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dash-card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {DAYS.map(day => (
                      <DayRow
                        key={day.key}
                        day={day}
                        state={days[day.key]}
                        onToggle={v => toggleDay(day.key, v)}
                        onAddSlot={() => addSlot(day.key)}
                        onRemoveSlot={idx => removeSlot(day.key, idx)}
                        onUpdateSlot={(idx, field, val) => updateSlot(day.key, idx, field, val)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div>
            <SummaryPanel
              mode={mode}
              days={days}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              rangeTimeStart={rangeTimeStart}
              rangeTimeEnd={rangeTimeEnd}
            />

            {/* Tips card */}
            <div style={{
              background: 'rgba(14,123,140,0.04)',
              border: '1px solid rgba(14,123,140,0.15)',
              borderRadius: 16, marginTop: 16, padding: '18px 20px',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#004A54', marginBottom: 10 }}>
                💡 Tips
              </div>
              <div style={{ fontSize: '0.78rem', color: '#0E7B8C', lineHeight: 1.7 }}>
                <div style={{ marginBottom: 6 }}>• Set multiple time slots per day for split shifts</div>
                <div style={{ marginBottom: 6 }}>• Use templates for quick setup</div>
                <div style={{ marginBottom: 6 }}>• Bookings are auto-blocked once confirmed</div>
                <div>• You can override specific dates from your calendar</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        background: '#fff',
        borderTop: '1px solid #E5EDF0',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        position: 'sticky',
        bottom: 0,
        zIndex: 40,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: '0.82rem', color: '#8A9BAA' }}>
          Last saved: <strong style={{ color: '#27A869' }}>{lastSaved}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={resetAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 10,
              fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
              background: 'none', border: '1.5px solid #E5EDF0', color: '#3D5A63',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            ↩ Reset
          </button>
          <button
            onClick={saveAvailability}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 10,
              fontSize: '0.88rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              background: '#0E7B8C', color: '#fff', border: 'none',
              fontFamily: 'inherit', transition: 'all 0.2s',
              boxShadow: '0 3px 12px rgba(14,123,140,0.25)',
              opacity: saving ? 0.75 : 1,
            }}
          >
            {saving ? '⏳ Saving…' : '✓ Save Availability'}
          </button>
        </div>
      </div>

      <Toast show={toast.show} msg={toast.msg} icon={toast.icon} />
    </div>
  )
}
