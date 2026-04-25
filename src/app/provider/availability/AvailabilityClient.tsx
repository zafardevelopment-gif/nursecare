'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  saveWeeklyTimeSchedule, saveFlexibleSchedule, saveDateRangeSchedule,
  checkDayHasBookings, checkRangeHasBookings,
  type SavedSchedule, type WeekSchedule, type DaySchedule, type TimeSlot, type DateRangeEntry,
} from './actions'
import type { DayKey } from './shiftConstants'
import { DEFAULT_WEEK_SCHEDULE } from './shiftConstants'
import CalendarView from './CalendarView'

// ── Constants ─────────────────────────────────────────────
const DAYS: { key: DayKey; label: string; dow: number }[] = [
  { key: 'mon', label: 'Monday',    dow: 1 },
  { key: 'tue', label: 'Tuesday',   dow: 2 },
  { key: 'wed', label: 'Wednesday', dow: 3 },
  { key: 'thu', label: 'Thursday',  dow: 4 },
  { key: 'fri', label: 'Friday',    dow: 5 },
  { key: 'sat', label: 'Saturday',  dow: 6 },
  { key: 'sun', label: 'Sunday',    dow: 0 },
]

type ActiveMode = 'weekly' | 'flexible' | 'date_range'

function newSlot(): TimeSlot { return { from: '08:00', to: '17:00' } }
function newRange(): DateRangeEntry {
  return { id: crypto.randomUUID(), startDate: '', endDate: '', slots: [newSlot()] }
}

// ── Time conflict check ────────────────────────────────────
function findSlotConflicts(slots: TimeSlot[]): number[][] {
  const conflicts: number[][] = []
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i], b = slots[j]
      if (a.from < b.to && a.to > b.from) {
        conflicts.push([i, j])
      }
    }
  }
  return conflicts
}

function slotsHaveConflict(slots: TimeSlot[]): boolean {
  return findSlotConflicts(slots).length > 0
}

function validateSlot(slot: TimeSlot): string | null {
  if (!slot.from || !slot.to) return 'Fill in both times'
  if (slot.from >= slot.to)   return 'Start time must be before end time'
  return null
}

// ── Toast ─────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' | 'warning' }) {
  const bg = type === 'success' ? '#27A869' : type === 'warning' ? '#F5842A' : '#E04A4A'
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: bg, color: '#fff', borderRadius: 10, padding: '12px 20px',
      fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: 8, maxWidth: 420,
    }}>
      {type === 'success' ? '✓' : type === 'warning' ? '⚠' : '✕'} {msg}
    </div>
  )
}

// ── Toggle switch ──────────────────────────────────────────
function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: value ? '#0E7B8C' : '#CBD5E0', position: 'relative',
      transition: 'background 0.2s', flexShrink: 0, opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: value ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </button>
  )
}

// ── Conflict / error badge ─────────────────────────────────
function ErrBadge({ msg }: { msg: string }) {
  return (
    <span style={{
      background: '#FEE2E2', color: '#DC2626', borderRadius: 5,
      padding: '2px 7px', fontSize: '0.68rem', fontWeight: 700,
    }}>{msg}</span>
  )
}

// ── Time slot row ──────────────────────────────────────────
function SlotRow({
  slot, index, total, conflict, error,
  onChange, onRemove, accentColor = '#0E7B8C',
}: {
  slot: TimeSlot; index: number; total: number
  conflict?: boolean; error?: string | null
  onChange: (patch: Partial<TimeSlot>) => void
  onRemove: () => void
  accentColor?: string
}) {
  const hrs = (() => {
    if (!slot.from || !slot.to) return null
    const [fh, fm] = slot.from.split(':').map(Number)
    const [th, tm] = slot.to.split(':').map(Number)
    const h = (th * 60 + tm - fh * 60 - fm) / 60
    return h > 0 ? h : null
  })()

  const borderColor = conflict || error ? '#DC2626' : 'var(--border)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {total > 1 && (
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, minWidth: 14 }}>
            {index + 1}.
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, minWidth: 30 }}>From</span>
          <input type="time" value={slot.from} onChange={e => onChange({ from: e.target.value })}
            style={{ padding: '6px 9px', borderRadius: 8, border: `1.5px solid ${borderColor}`, fontSize: '0.84rem', fontFamily: 'inherit', background: '#fff', width: 110 }} />
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>→</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, minWidth: 15 }}>To</span>
          <input type="time" value={slot.to} onChange={e => onChange({ to: e.target.value })}
            style={{ padding: '6px 9px', borderRadius: 8, border: `1.5px solid ${borderColor}`, fontSize: '0.84rem', fontFamily: 'inherit', background: '#fff', width: 110 }} />
        </div>
        {hrs !== null && !conflict && !error && (
          <span style={{ background: `${accentColor}18`, color: accentColor, borderRadius: 20, padding: '2px 9px', fontSize: '0.71rem', fontWeight: 700 }}>
            {hrs % 1 === 0 ? hrs : hrs.toFixed(1)}h
          </span>
        )}
        {total > 1 && (
          <button onClick={onRemove} title="Remove slot" style={{
            width: 22, height: 22, borderRadius: '50%', border: 'none',
            background: '#FEE2E2', color: '#DC2626', cursor: 'pointer',
            fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>✕</button>
        )}
      </div>
      {error   && <div style={{ paddingLeft: total > 1 ? 20 : 0 }}><ErrBadge msg={error} /></div>}
      {conflict && !error && <div style={{ paddingLeft: total > 1 ? 20 : 0 }}><ErrBadge msg="Overlaps with another slot" /></div>}
    </div>
  )
}

function AddSlotBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: '1.5px dashed var(--border)', borderRadius: 8,
      padding: '5px 12px', fontSize: '0.73rem', fontWeight: 700,
      color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 5,
    }}>
      + Add time slot
    </button>
  )
}

// ── Main component ─────────────────────────────────────────
export default function AvailabilityClient({ saved }: { saved: SavedSchedule }) {
  const [mode, setMode] = useState<ActiveMode>((saved.mode as ActiveMode) ?? 'weekly')

  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(
    saved.weekSchedule ?? { ...DEFAULT_WEEK_SCHEDULE }
  )
  // Track which day toggles are blocked by bookings
  const [blockedDays, setBlockedDays] = useState<Partial<Record<DayKey, string[]>>>({})

  const [flexible,   setFlexible]  = useState(saved.flexible ?? false)
  const [dateRanges, setDateRanges] = useState<DateRangeEntry[]>(
    saved.dateRanges?.length ? saved.dateRanges : [newRange()]
  )
  // Track which ranges are blocked
  const [blockedRanges, setBlockedRanges] = useState<Record<string, string[]>>({})

  const [toast,   setToast]   = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [, startTransition]   = useTransition()

  function showToast(msg: string, type: 'success' | 'error' | 'warning') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  // ── Weekly helpers ────────────────────────────────────────
  async function handleDayToggle(dayKey: DayKey, dow: number, enabling: boolean) {
    if (enabling) {
      setWeekSchedule(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], enabled: true } }))
      return
    }
    // Disabling: check for bookings first
    const { hasBookings, dates } = await checkDayHasBookings(dow)
    if (hasBookings) {
      setBlockedDays(prev => ({ ...prev, [dayKey]: dates }))
      showToast(`Cannot disable ${DAYS.find(d => d.key === dayKey)?.label} — active bookings on ${dates.slice(0, 2).join(', ')}${dates.length > 2 ? '…' : ''}`, 'warning')
      return
    }
    setWeekSchedule(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], enabled: false } }))
    setBlockedDays(prev => { const n = { ...prev }; delete n[dayKey]; return n })
  }

  function updateSlot(dayKey: DayKey, idx: number, patch: Partial<TimeSlot>) {
    setWeekSchedule(prev => {
      const slots = prev[dayKey].slots.map((s, i) => i === idx ? { ...s, ...patch } : s)
      return { ...prev, [dayKey]: { ...prev[dayKey], slots } }
    })
  }
  function addSlot(dayKey: DayKey) {
    setWeekSchedule(prev => ({
      ...prev, [dayKey]: { ...prev[dayKey], slots: [...prev[dayKey].slots, newSlot()] },
    }))
  }
  function removeSlot(dayKey: DayKey, idx: number) {
    setWeekSchedule(prev => ({
      ...prev, [dayKey]: { ...prev[dayKey], slots: prev[dayKey].slots.filter((_, i) => i !== idx) },
    }))
  }
  function applyToAll(patch: Partial<DaySchedule>) {
    setWeekSchedule(prev => {
      const next = { ...prev }
      for (const d of DAYS) next[d.key] = { ...next[d.key], ...patch }
      return next
    })
  }

  // ── Date range helpers ────────────────────────────────────
  function updateRange(id: string, patch: Partial<Omit<DateRangeEntry, 'slots'>>) {
    setDateRanges(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  function updateRangeSlot(rangeId: string, idx: number, patch: Partial<TimeSlot>) {
    setDateRanges(prev => prev.map(r => {
      if (r.id !== rangeId) return r
      return { ...r, slots: r.slots.map((s, i) => i === idx ? { ...s, ...patch } : s) }
    }))
  }
  function addRangeSlot(rangeId: string) {
    setDateRanges(prev => prev.map(r =>
      r.id === rangeId ? { ...r, slots: [...r.slots, newSlot()] } : r
    ))
  }
  function removeRangeSlot(rangeId: string, idx: number) {
    setDateRanges(prev => prev.map(r =>
      r.id === rangeId ? { ...r, slots: r.slots.filter((_, i) => i !== idx) } : r
    ))
  }
  function addRange() { setDateRanges(prev => [...prev, newRange()]) }

  async function handleRemoveRange(id: string) {
    const range = dateRanges.find(r => r.id === id)
    if (!range || dateRanges.length <= 1) return
    if (range.startDate && range.endDate) {
      const { hasBookings, dates } = await checkRangeHasBookings(range.startDate, range.endDate)
      if (hasBookings) {
        showToast(`Cannot remove — active bookings on ${dates.slice(0, 2).join(', ')}${dates.length > 2 ? '…' : ''}`, 'warning')
        return
      }
    }
    setDateRanges(prev => prev.filter(r => r.id !== id))
    setBlockedRanges(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  // Check range for bookings when dates change
  async function handleRangeDateChange(id: string, patch: { startDate?: string; endDate?: string }) {
    const range = { ...dateRanges.find(r => r.id === id)!, ...patch }
    updateRange(id, patch)
    if (range.startDate && range.endDate && range.startDate <= range.endDate) {
      const { hasBookings, dates } = await checkRangeHasBookings(range.startDate, range.endDate)
      if (hasBookings) {
        setBlockedRanges(prev => ({ ...prev, [id]: dates }))
      } else {
        setBlockedRanges(prev => { const n = { ...prev }; delete n[id]; return n })
      }
    }
  }

  // ── Validate all weekly slots ─────────────────────────────
  function weeklyHasErrors(): boolean {
    for (const ds of Object.values(weekSchedule)) {
      if (!ds.enabled) continue
      for (const slot of ds.slots) {
        if (validateSlot(slot)) return true
      }
      if (slotsHaveConflict(ds.slots)) return true
    }
    return false
  }

  // ── Validate all date ranges ──────────────────────────────
  function rangesHaveErrors(): boolean {
    for (const r of dateRanges) {
      if (!r.startDate || !r.endDate) return true
      if (r.startDate < todayStr)     return true
      if (r.startDate > r.endDate)    return true
      for (const s of r.slots) {
        if (validateSlot(s)) return true
      }
      if (slotsHaveConflict(r.slots)) return true
      if (blockedRanges[r.id])        return true
    }
    return false
  }

  // ── Save ──────────────────────────────────────────────────
  function handleSave() {
    if (mode === 'weekly' && weeklyHasErrors()) {
      showToast('Fix time slot errors before saving', 'error'); return
    }
    if (mode === 'date_range' && rangesHaveErrors()) {
      showToast('Fix date range errors before saving', 'error'); return
    }
    setSaving(true)
    startTransition(async () => {
      let result: { success: boolean; message: string }
      if (mode === 'weekly')        result = await saveWeeklyTimeSchedule(weekSchedule)
      else if (mode === 'flexible') result = await saveFlexibleSchedule()
      else                          result = await saveDateRangeSchedule(dateRanges)
      showToast(result.message, result.success ? 'success' : 'error')
      setSaving(false)
    })
  }

  // ── Stats ─────────────────────────────────────────────────
  const enabledDays = Object.values(weekSchedule).filter(d => d.enabled).length
  const totalWeekHrs = Object.values(weekSchedule)
    .filter(d => d.enabled)
    .reduce((sum, d) => sum + d.slots.reduce((s2, sl) => {
      if (!sl.from || !sl.to) return s2
      const [fh, fm] = sl.from.split(':').map(Number)
      const [th, tm] = sl.to.split(':').map(Number)
      return s2 + Math.max(0, (th * 60 + tm - fh * 60 - fm) / 60)
    }, 0), 0)

  const MODES: { key: ActiveMode; icon: string; title: string; desc: string; color: string }[] = [
    { key: 'weekly',     icon: '📅', title: 'Weekly Schedule', desc: 'Set hours per day of week',       color: '#0E7B8C' },
    { key: 'flexible',   icon: '🌐', title: 'Fully Flexible',  desc: 'Available any day, any time',     color: '#27A869' },
    { key: 'date_range', icon: '📆', title: 'Date Range',      desc: 'Available for a specific period', color: '#7C3AED' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1.5px solid var(--border)', fontSize: '0.88rem',
    fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Mode Selector ─────────────────────────────── */}
      <div className="dash-card">
        <div className="dash-card-body">
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>Availability Mode</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
              Choose one mode — only the selected mode will be active
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
            {MODES.map(m => {
              const active = mode === m.key
              return (
                <button key={m.key} onClick={() => setMode(m.key)} style={{
                  padding: '1rem', borderRadius: 12, cursor: 'pointer',
                  background: active ? m.color : 'var(--cream)',
                  border: active ? `2px solid ${m.color}` : '2px solid transparent',
                  textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s', outline: 'none',
                } as React.CSSProperties}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 5 }}>{m.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: active ? '#fff' : 'var(--ink)' }}>{m.title}</div>
                  <div style={{ fontSize: '0.71rem', marginTop: 2, color: active ? 'rgba(255,255,255,0.8)' : 'var(--muted)' }}>{m.desc}</div>
                  {active && (
                    <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'rgba(255,255,255,0.2)', borderRadius: 20,
                      padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>
                      ✓ Active
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Weekly Schedule ───────────────────────────── */}
      {mode === 'weekly' && (
        <div className="dash-card">
          <div className="dash-card-body">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>📅</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Weekly Schedule</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 3, marginLeft: 28 }}>
                  Toggle each day, set one or more time slots
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => applyToAll({ enabled: true, slots: [{ from: '08:00', to: '17:00' }] })}
                  style={{ background: 'rgba(14,123,140,0.08)', color: '#0E7B8C', border: '1px solid rgba(14,123,140,0.25)', borderRadius: 7, padding: '5px 10px', fontSize: '0.71rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✦ All Days
                </button>
                <button onClick={() => {
                  setWeekSchedule(prev => {
                    const next = { ...prev }
                    for (const d of ['mon','tue','wed','thu','fri'] as DayKey[])
                      next[d] = { ...next[d], enabled: true, slots: [{ from: '08:00', to: '17:00' }] }
                    for (const d of ['sat','sun'] as DayKey[])
                      next[d] = { ...next[d], enabled: false }
                    return next
                  })
                }}
                  style={{ background: '#E8F9F0', color: '#1a7a4a', border: '1px solid rgba(39,168,105,0.3)', borderRadius: 7, padding: '5px 10px', fontSize: '0.71rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Mon–Fri
                </button>
                <button onClick={() => applyToAll({ enabled: false })}
                  style={{ background: 'var(--cream)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '0.71rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✕ Clear
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[
                { val: enabledDays, label: 'Days / Week' },
                { val: `${totalWeekHrs % 1 === 0 ? totalWeekHrs : totalWeekHrs.toFixed(1)}h`, label: 'Total / Week' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0E7B8C' }}>{s.val}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)', marginLeft: 5 }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Day rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {DAYS.map(day => {
                const ds = weekSchedule[day.key]
                const conflicts = findSlotConflicts(ds.slots)
                const conflictIdxs = new Set(conflicts.flat())
                const isBlocked = !!blockedDays[day.key]

                return (
                  <div key={day.key} style={{
                    borderRadius: 12,
                    border: `1.5px solid ${ds.enabled ? (isBlocked ? '#F5842A' : 'rgba(14,123,140,0.35)') : 'var(--border)'}`,
                    background: ds.enabled ? (isBlocked ? 'rgba(245,132,42,0.04)' : 'rgba(14,123,140,0.025)') : 'var(--cream)',
                    padding: '0.75rem 1rem', transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Toggle
                        value={ds.enabled}
                        disabled={isBlocked}
                        onChange={v => handleDayToggle(day.key, day.dow, v)}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: ds.enabled ? 'var(--ink)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {day.label}
                          {isBlocked && (
                            <span style={{ background: '#FEF3C7', color: '#92400e', fontSize: '0.64rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>
                              📋 Has bookings
                            </span>
                          )}
                        </div>
                        {!ds.enabled && <div style={{ fontSize: '0.66rem', color: 'var(--muted)', fontStyle: 'italic' }}>Day off — toggle to add hours</div>}
                      </div>
                    </div>

                    {ds.enabled && (
                      <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingLeft: 54 }}>
                        {ds.slots.map((slot, idx) => (
                          <SlotRow
                            key={idx} slot={slot} index={idx} total={ds.slots.length}
                            conflict={conflictIdxs.has(idx)}
                            error={validateSlot(slot)}
                            onChange={patch => updateSlot(day.key, idx, patch)}
                            onRemove={() => removeSlot(day.key, idx)}
                          />
                        ))}
                        {conflicts.length > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                            ⚠ Time slots overlap — fix before saving
                          </div>
                        )}
                        <AddSlotBtn onClick={() => addSlot(day.key)} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Fully Flexible ────────────────────────────── */}
      {mode === 'flexible' && (
        <div className="dash-card">
          <div className="dash-card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🌐</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Fully Flexible Mode</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>Mark yourself available any day, any time</div>
              </div>
            </div>
            <div style={{ background: 'var(--cream)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Enable Fully Flexible</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>Patients can book you any day and any time</div>
              </div>
              <Toggle value={flexible} onChange={setFlexible} />
            </div>
            {flexible && (
              <div style={{ marginTop: '0.9rem', padding: '1rem 1.2rem', background: 'rgba(39,168,105,0.08)', border: '1.5px solid rgba(39,168,105,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: '#27A869', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1a5c37' }}>All 7 days · All hours</div>
                  <div style={{ fontSize: '0.73rem', color: '#27A869', marginTop: 2 }}>Patients can book you any time</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Date Range ────────────────────────────────── */}
      {mode === 'date_range' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="dash-card">
            <div className="dash-card-body" style={{ paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.2rem' }}>📆</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Date Range Availability</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>Add one or more date ranges with time slots · Past dates not allowed</div>
                  </div>
                </div>
                <button onClick={addRange} style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Add Date Range
                </button>
              </div>
            </div>
          </div>

          {dateRanges.map((range, rangeIdx) => {
            const conflicts   = findSlotConflicts(range.slots)
            const conflictIdx = new Set(conflicts.flat())
            const isBlocked   = !!blockedRanges[range.id]
            const startInPast = range.startDate && range.startDate < todayStr
            const endBeforeStart = range.startDate && range.endDate && range.endDate < range.startDate

            return (
              <div key={range.id} className="dash-card" style={{ borderColor: isBlocked ? '#F5842A' : undefined }}>
                <div className="dash-card-body">
                  {/* Range header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: isBlocked ? '#F5842A' : '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>{rangeIdx + 1}</div>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                        {range.startDate && range.endDate ? `${range.startDate} → ${range.endDate}` : 'Date Range'}
                      </span>
                      {isBlocked && <span style={{ background: '#FEF3C7', color: '#92400e', fontSize: '0.64rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>📋 Has bookings — can't remove</span>}
                    </div>
                    {dateRanges.length > 1 && (
                      <button onClick={() => handleRemoveRange(range.id)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 7, padding: '4px 10px', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Date pickers */}
                  <div className="form-grid-2col" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>📅 Start Date</div>
                      <input type="date" value={range.startDate} min={todayStr}
                        onChange={e => handleRangeDateChange(range.id, { startDate: e.target.value })}
                        style={{ ...inputStyle, borderColor: startInPast ? '#DC2626' : undefined }} />
                      {startInPast && <div style={{ fontSize: '0.68rem', color: '#DC2626', marginTop: 3, fontWeight: 600 }}>⚠ Past dates not allowed</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>📅 End Date</div>
                      <input type="date" value={range.endDate} min={range.startDate || todayStr}
                        onChange={e => handleRangeDateChange(range.id, { endDate: e.target.value })}
                        style={{ ...inputStyle, borderColor: endBeforeStart ? '#DC2626' : undefined }} />
                      {endBeforeStart && <div style={{ fontSize: '0.68rem', color: '#DC2626', marginTop: 3, fontWeight: 600 }}>⚠ End must be after start</div>}
                    </div>
                  </div>

                  {/* Booking warning */}
                  {isBlocked && (
                    <div style={{ background: '#FEF3C7', border: '1px solid rgba(245,132,42,0.4)', borderRadius: 8, padding: '8px 12px', marginBottom: '0.9rem', fontSize: '0.77rem', color: '#92400e', fontWeight: 600 }}>
                      ⚠ Active bookings exist on: {blockedRanges[range.id].slice(0, 3).join(', ')}{blockedRanges[range.id].length > 3 ? ` +${blockedRanges[range.id].length - 3} more` : ''}. Time changes will not affect existing bookings.
                    </div>
                  )}

                  {/* Time slots */}
                  <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    🕐 Time Slots
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {range.slots.map((slot, idx) => (
                      <SlotRow
                        key={idx} slot={slot} index={idx} total={range.slots.length}
                        conflict={conflictIdx.has(idx)}
                        error={validateSlot(slot)}
                        onChange={patch => updateRangeSlot(range.id, idx, patch)}
                        onRemove={() => removeRangeSlot(range.id, idx)}
                        accentColor="#7C3AED"
                      />
                    ))}
                    {conflicts.length > 0 && (
                      <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600 }}>⚠ Time slots overlap — fix before saving</div>
                    )}
                    <AddSlotBtn onClick={() => addRangeSlot(range.id)} />
                  </div>

                  {/* Summary */}
                  {range.startDate && range.endDate && !startInPast && !endBeforeStart && (
                    <div style={{ marginTop: '0.9rem', padding: '8px 12px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, fontSize: '0.77rem', color: '#5b21b6', fontWeight: 600, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span>📅 {range.startDate} → {range.endDate}</span>
                      {range.slots.filter(s => s.from && s.to && s.to > s.from).map((s, i) => (
                        <span key={i} style={{ background: 'rgba(124,58,237,0.1)', borderRadius: 4, padding: '1px 7px' }}>
                          {s.from}–{s.to}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Save button ────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving} style={{
          background: saving ? 'var(--muted)' : '#0E7B8C', color: '#fff',
          border: 'none', borderRadius: 10, padding: '12px 32px',
          fontSize: '0.9rem', fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          boxShadow: saving ? 'none' : '0 2px 12px rgba(14,123,140,0.3)',
          transition: 'all 0.15s',
        }}>
          {saving ? 'Saving…' : 'Save Schedule'}
        </button>
      </div>

      {/* ── Availability Calendar ──────────────────────── */}
      <div className="dash-card" style={{ marginTop: '0.25rem' }}>
        <div className="dash-card-body">
          <CalendarView />
        </div>
      </div>
    </div>
  )
}
