'use client'

import { useState, useCallback, useRef } from 'react'
import { saveAvailability as saveAvailability_action } from './actions'
import CalendarView from './CalendarView'

// ── Types ────────────────────────────────────────────────
type Slot     = { start: string; end: string }
type DayKey   = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
type DayState = { available: boolean; slots: Slot[] }
type Mode     = 'weekly' | 'flexible' | 'range'

export type SavedAvailability = {
  mode: 'weekly' | 'flexible' | 'date_range' | null
  rows: {
    availability_type: string
    day_of_week: number | null
    start_time: string | null
    end_time: string | null
    start_date: string | null
    end_date: string | null
  }[]
}

const DAYS: { key: DayKey; label: string; abbr: string; dow: number }[] = [
  { key: 'mon', label: 'Monday',    abbr: 'MON', dow: 1 },
  { key: 'tue', label: 'Tuesday',   abbr: 'TUE', dow: 2 },
  { key: 'wed', label: 'Wednesday', abbr: 'WED', dow: 3 },
  { key: 'thu', label: 'Thursday',  abbr: 'THU', dow: 4 },
  { key: 'fri', label: 'Friday',    abbr: 'FRI', dow: 5 },
  { key: 'sat', label: 'Saturday',  abbr: 'SAT', dow: 6 },
  { key: 'sun', label: 'Sunday',    abbr: 'SUN', dow: 0 },
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

// ── Helpers ──────────────────────────────────────────────
function toMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function durHrs(start: string, end: string) {
  return Math.round((toMins(end) - toMins(start)) / 60)
}

function calcTotalMins(days: Record<DayKey, DayState>) {
  let total = 0
  for (const d of Object.values(days)) {
    if (!d.available) continue
    for (const s of d.slots) {
      const diff = toMins(s.end) - toMins(s.start)
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

function fmtDateLong(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Build initial editor state from saved DB rows
function buildEditorState(saved: SavedAvailability): {
  mode: Mode
  days: Record<DayKey, DayState>
  flexActive: boolean
  rangeStart: string
  rangeEnd: string
  rangeTimeStart: string
  rangeTimeEnd: string
} {
  if (!saved.mode) {
    return { mode: 'weekly', days: INITIAL_DAYS, flexActive: false, rangeStart: '', rangeEnd: '', rangeTimeStart: '08:00', rangeTimeEnd: '18:00' }
  }

  if (saved.mode === 'flexible') {
    return { mode: 'flexible', days: INITIAL_DAYS, flexActive: true, rangeStart: '', rangeEnd: '', rangeTimeStart: '08:00', rangeTimeEnd: '18:00' }
  }

  if (saved.mode === 'date_range') {
    const r = saved.rows[0]
    return {
      mode: 'range',
      days: INITIAL_DAYS,
      flexActive: false,
      rangeStart: r.start_date ?? '',
      rangeEnd: r.end_date ?? '',
      rangeTimeStart: r.start_time?.slice(0, 5) ?? '08:00',
      rangeTimeEnd: r.end_time?.slice(0, 5) ?? '18:00',
    }
  }

  // weekly
  const days = { ...INITIAL_DAYS }
  for (const key of Object.keys(days) as DayKey[]) {
    days[key] = { available: false, slots: [] }
  }
  for (const row of saved.rows) {
    const dayDef = DAYS.find(d => d.dow === row.day_of_week)
    if (!dayDef) continue
    const key = dayDef.key
    if (!days[key].available) days[key] = { available: true, slots: [] }
    days[key].slots.push({
      start: row.start_time?.slice(0, 5) ?? '08:00',
      end: row.end_time?.slice(0, 5) ?? '17:00',
    })
  }
  return { mode: 'weekly', days, flexActive: false, rangeStart: '', rangeEnd: '', rangeTimeStart: '08:00', rangeTimeEnd: '18:00' }
}

// ── Toast ────────────────────────────────────────────────
function Toast({ msg, icon, show }: { msg: string; icon: string; show: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, right: 28,
      background: '#0C1E26', color: '#fff',
      padding: '13px 18px', borderRadius: 12,
      fontSize: '0.85rem', fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 30px rgba(0,0,0,0.2)', zIndex: 1000,
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

// ── Toggle Switch ─────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      style={{
        width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
        background: checked ? '#27A869' : '#D1DFE3', position: 'relative',
        transition: 'background 0.25s', flexShrink: 0, padding: 0,
      }}>
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', display: 'block',
      }} />
    </button>
  )
}

// ── Day Row (editor) ──────────────────────────────────────
function DayRow({ day, state, onToggle, onAddSlot, onRemoveSlot, onUpdateSlot }: {
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
      borderRadius: 12, overflow: 'hidden',
      boxShadow: state.available ? '0 1px 6px rgba(14,123,140,0.06)' : 'none',
      transition: 'all 0.25s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
        onClick={() => state.available && setCollapsed(c => !c)}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: state.available ? 'rgba(14,123,140,0.1)' : '#EEF2F3',
          color: state.available ? '#0E7B8C' : '#8A9BAA',
          fontWeight: 700, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>{day.abbr}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1E2D' }}>{day.label}</div>
          <div style={{ fontSize: '0.75rem', marginTop: 1, color: state.available ? '#27A869' : '#8A9BAA', fontFamily: 'monospace' }}>
            {summaryText}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
            borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
            background: state.available ? 'rgba(39,168,105,0.1)' : '#EEF2F3',
            color: state.available ? '#27A869' : '#8A9BAA',
          }}>{state.available ? '✓ Available' : '✕ Off'}</span>
          <span onClick={e => e.stopPropagation()}>
            <Toggle checked={state.available} onChange={onToggle} />
          </span>
          {state.available && (
            <span style={{ fontSize: 12, color: '#8A9BAA', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
          )}
        </div>
      </div>
      {state.available && !collapsed && (
        <div style={{ borderTop: '1px solid #E5EDF0', padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {state.slots.map((slot, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.12)',
              borderRadius: 10, padding: '10px 14px', marginTop: idx === 0 ? 12 : 0,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8A9BAA', textTransform: 'uppercase', letterSpacing: '1px' }}>Start Time</label>
                <input type="time" value={slot.start} onChange={e => onUpdateSlot(idx, 'start', e.target.value)}
                  style={{ padding: '8px 10px', border: '1.5px solid #E5EDF0', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'monospace', fontWeight: 500, color: '#0B1E2D', background: '#fff', outline: 'none', cursor: 'pointer', width: '100%' }} />
              </div>
              <div style={{ fontSize: 16, color: '#8A9BAA', paddingTop: 18, flexShrink: 0 }}>→</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8A9BAA', textTransform: 'uppercase', letterSpacing: '1px' }}>End Time</label>
                <input type="time" value={slot.end} onChange={e => onUpdateSlot(idx, 'end', e.target.value)}
                  style={{ padding: '8px 10px', border: '1.5px solid #E5EDF0', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'monospace', fontWeight: 500, color: '#0B1E2D', background: '#fff', outline: 'none', cursor: 'pointer', width: '100%' }} />
              </div>
              {state.slots.length > 1 && (
                <button onClick={() => onRemoveSlot(idx)}
                  style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: '1.5px solid #E0E7EA', color: '#8A9BAA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginTop: 16, flexShrink: 0, transition: 'all 0.2s' }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={onAddSlot}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: '1.5px dashed #4DB6C4', borderRadius: 9, background: 'none', color: '#0E7B8C', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', alignSelf: 'flex-start', marginTop: 4 }}>
            + Add Time Slot
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ── VIEW MODE COMPONENTS ──────────────────────────────────
// ══════════════════════════════════════════════════════════

function StatBox({ value, label, accent }: { value: string | number; label: string; accent: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5EDF0', borderRadius: 14, padding: '18px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden', flex: 1 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '3px 3px 0 0' }} />
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: accent, fontFamily: 'monospace', lineHeight: 1, marginBottom: 5 }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: '#8A9BAA', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function ViewWeekly({ days }: { days: Record<DayKey, DayState> }) {
  const activeDays  = DAYS.filter(d => days[d.key].available).length
  const totalMins   = calcTotalMins(days)
  const totalHrs    = Math.round(totalMins / 60)
  const totalSlots  = Object.values(days).reduce((a, d) => a + (d.available ? d.slots.length : 0), 0)

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        <StatBox value={activeDays}           label="Active Days"   accent="#0E7B8C" />
        <StatBox value={totalHrs + 'h'}       label="Weekly Hours"  accent="#C9A84C" />
        <StatBox value={totalSlots}           label="Time Slots"    accent="#27A869" />
        <StatBox value="Weekly"               label="Current Mode"  accent="#8A9BAA" />
      </div>

      {/* Mode banner */}
      <div style={{ background: 'rgba(14,123,140,0.05)', border: '1.5px solid rgba(14,123,140,0.15)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, background: '#0E7B8C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📅</div>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#004A54' }}>Weekly Schedule Active</div>
          <div style={{ fontSize: '0.78rem', color: '#8A9BAA', marginTop: 3, lineHeight: 1.5 }}>Your working hours repeat every week. Patients can book you on the days and times shown below.</div>
        </div>
      </div>

      {/* Day rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DAYS.map(day => {
          const d = days[day.key]
          const isOn = d.available
          let totalDayMins = 0
          if (isOn) d.slots.forEach(s => { const diff = toMins(s.end) - toMins(s.start); if (diff > 0) totalDayMins += diff })
          const hrs = totalDayMins > 0 ? (totalDayMins / 60).toFixed(1).replace('.0', '') + 'h' : null

          return (
            <div key={day.key} style={{
              background: isOn ? '#fff' : '#F7FAFC',
              border: `1.5px solid ${isOn ? 'rgba(14,123,140,0.2)' : '#E5EDF0'}`,
              borderRadius: 13, overflow: 'hidden',
              boxShadow: isOn ? '0 2px 10px rgba(14,123,140,0.07)' : 'none',
              transition: 'all 0.25s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: 16 }}>
                {/* Day chip */}
                <div style={{
                  width: 52, height: 52, borderRadius: 12, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 1, flexShrink: 0,
                  background: isOn ? '#0E7B8C' : '#E8EDEF',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: isOn ? 'rgba(255,255,255,0.75)' : '#8A9BAA' }}>{day.abbr}</span>
                </div>

                {/* Day name */}
                <div style={{ flex: '0 0 110px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isOn ? '#0B1E2D' : '#8A9BAA' }}>{day.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#8A9BAA', marginTop: 2 }}>
                    {isOn ? `${d.slots.length} slot${d.slots.length > 1 ? 's' : ''}` : 'Day off'}
                  </div>
                </div>

                {/* Slot pills */}
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {isOn && d.slots.length > 0 ? d.slots.map((s, i) => (
                    <div key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'rgba(14,123,140,0.07)', border: '1px solid rgba(14,123,140,0.15)',
                      borderRadius: 8, padding: '6px 12px', fontFamily: 'monospace',
                      fontSize: '0.82rem', fontWeight: 500, color: '#004A54',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0E7B8C', flexShrink: 0, display: 'inline-block' }} />
                      {s.start} – {s.end}
                      <span style={{ fontSize: '0.68rem', color: '#8A9BAA', background: 'rgba(0,0,0,0.04)', borderRadius: 4, padding: '1px 5px', marginLeft: 4 }}>
                        {durHrs(s.start, s.end)}h
                      </span>
                    </div>
                  )) : (
                    <span style={{ fontSize: '0.8rem', color: '#B0BEC5', fontStyle: 'italic' }}>✕ Not available this day</span>
                  )}
                </div>

                {/* Right: hours + indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {hrs && (
                    <div style={{ background: 'rgba(14,123,140,0.08)', borderRadius: 7, padding: '4px 10px', fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 600, color: '#0E7B8C' }}>
                      {hrs}
                    </div>
                  )}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: isOn ? '#27A869' : '#C8D6DA', boxShadow: isOn ? '0 0 0 3px rgba(39,168,105,0.15)' : 'none' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ViewFlexible() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        <StatBox value={7}         label="Active Days"  accent="#0E7B8C" />
        <StatBox value="Any"       label="Weekly Hours" accent="#C9A84C" />
        <StatBox value="∞"         label="Time Slots"   accent="#27A869" />
        <StatBox value="Flexible"  label="Current Mode" accent="#8A9BAA" />
      </div>
      <div style={{ background: 'rgba(201,168,76,0.06)', border: '1.5px solid rgba(201,168,76,0.2)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🌐</div>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#7A5800' }}>Fully Flexible Mode Active</div>
          <div style={{ fontSize: '0.78rem', color: '#8A9BAA', marginTop: 3, lineHeight: 1.5 }}>You are available any day and any time. Patients can book you whenever they need.</div>
        </div>
      </div>
      <div style={{ background: 'linear-gradient(135deg, rgba(14,123,140,0.08), rgba(14,123,140,0.03))', border: '1.5px solid rgba(14,123,140,0.18)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, background: '#0E7B8C', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 18px', boxShadow: '0 6px 20px rgba(14,123,140,0.25)' }}>🌐</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#004A54', marginBottom: 8 }}>Always Available</div>
        <div style={{ fontSize: '0.85rem', color: '#0E7B8C', lineHeight: 1.7, maxWidth: 360, margin: '0 auto 20px' }}>
          You have set yourself as fully flexible. Patients can book you any day of the week, at any time.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {DAYS.map((day, i) => (
            <div key={day.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0E7B8C', color: '#fff', borderRadius: 10, padding: '8px 10px', minWidth: 46 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', opacity: 0.7 }}>{day.abbr}</span>
              <span style={{ fontSize: 16, marginTop: 3 }}>✓</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ViewDateRange({ startDate, endDate, startTime, endTime }: { startDate: string; endDate: string; startTime: string; endTime: string }) {
  const hrs = startTime && endTime ? durHrs(startTime, endTime) : 0

  // Days count
  let dayCount = 0
  if (startDate && endDate) {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime()
    dayCount = Math.round(ms / 86400000) + 1
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        <StatBox value={dayCount || '—'}       label="Total Days"   accent="#0E7B8C" />
        <StatBox value={hrs ? hrs + 'h/d' : '—'} label="Daily Hours"  accent="#C9A84C" />
        <StatBox value={dayCount || '—'}       label="Days Active"  accent="#27A869" />
        <StatBox value="Range"                 label="Current Mode" accent="#8A9BAA" />
      </div>
      <div style={{ background: 'rgba(39,168,105,0.05)', border: '1.5px solid rgba(39,168,105,0.18)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, background: '#27A869', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📆</div>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0D4A2B' }}>Date Range Availability Active</div>
          <div style={{ fontSize: '0.78rem', color: '#8A9BAA', marginTop: 3, lineHeight: 1.5 }}>You are available during a specific period. Bookings are only accepted within this date range.</div>
        </div>
      </div>
      <div style={{ background: 'rgba(39,168,105,0.05)', border: '1.5px solid rgba(39,168,105,0.15)', borderRadius: 16, padding: 24 }}>
        {/* Date row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(39,168,105,0.18)', borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#27A869', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 5 }}>Start Date</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0B1E2D', fontFamily: 'monospace' }}>{fmtDate(startDate)}</div>
            <div style={{ fontSize: '0.72rem', color: '#8A9BAA', marginTop: 2 }}>{startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' }) : '—'}</div>
          </div>
          <div style={{ fontSize: 22, color: '#27A869', flexShrink: 0 }}>→</div>
          <div style={{ background: '#fff', border: '1px solid rgba(39,168,105,0.18)', borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#27A869', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 5 }}>End Date</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0B1E2D', fontFamily: 'monospace' }}>{fmtDate(endDate)}</div>
            <div style={{ fontSize: '0.72rem', color: '#8A9BAA', marginTop: 2 }}>{endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' }) : '—'}</div>
          </div>
        </div>
        {/* Time row */}
        <div style={{ background: '#fff', border: '1px solid rgba(39,168,105,0.15)', borderRadius: 11, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#27A869', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Working Hours</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0B1E2D', fontFamily: 'monospace' }}>{startTime}</span>
              <span style={{ fontSize: '1.1rem', color: '#8A9BAA' }}>→</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0B1E2D', fontFamily: 'monospace' }}>{endTime}</span>
              {hrs > 0 && <span style={{ fontSize: '0.78rem', color: '#8A9BAA', marginLeft: 8 }}>Daily · {hrs} hrs / day</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ViewNotConfigured({ modeLabel, onEdit }: { modeLabel: string; onEdit: () => void }) {
  return (
    <div style={{ background: '#F7FAFC', border: '1.5px dashed #C8D6DA', borderRadius: 16, padding: 40, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, background: '#E8EDEF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>📋</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3D5A63', marginBottom: 8 }}>{modeLabel} Not Configured</div>
      <div style={{ fontSize: '0.85rem', color: '#8A9BAA', lineHeight: 1.7, maxWidth: 320, margin: '0 auto 20px' }}>
        You haven't set up this availability mode yet. Click edit to configure it.
      </div>
      <button onClick={onEdit}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', background: '#0E7B8C', color: '#fff', border: 'none', fontFamily: 'inherit' }}>
        ✏️ Set Up {modeLabel}
      </button>
    </div>
  )
}

// Summary panel (right column) — shared by both modes
function SummaryPanel({ mode, days, rangeStart, rangeEnd, rangeTimeStart, rangeTimeEnd }: {
  mode: Mode
  days: Record<DayKey, DayState>
  rangeStart: string; rangeEnd: string; rangeTimeStart: string; rangeTimeEnd: string
}) {
  const activeDays = DAYS.filter(d => days[d.key].available).length
  const totalMins  = calcTotalMins(days)

  return (
    <div style={{ background: 'linear-gradient(145deg, #004A54 0%, #006D7A 100%)', borderRadius: 16, padding: 22, color: '#fff', position: 'sticky', top: 24 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        📋 Availability Summary
      </div>

      {mode === 'flexible' && DAYS.map(day => (
        <div key={day.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem' }}>
          <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)', width: 40 }}>{day.abbr}</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px rgba(74,222,128,0.5)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#fff', flex: 1, marginLeft: 10 }}>Any time</span>
        </div>
      ))}

      {mode === 'range' && (
        <>
          {[{ lbl: 'FROM', val: fmtDate(rangeStart) }, { lbl: 'TO', val: fmtDate(rangeEnd) }, { lbl: 'TIME', val: `${rangeTimeStart}–${rangeTimeEnd}` }].map(r => (
            <div key={r.lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem' }}>
              <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)', width: 40 }}>{r.lbl}</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', flexShrink: 0 }} />
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#fff', flex: 1, marginLeft: 10 }}>{r.val}</span>
            </div>
          ))}
        </>
      )}

      {mode === 'weekly' && DAYS.map(day => {
        const d = days[day.key]
        return (
          <div key={day.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem' }}>
            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)', width: 40, flexShrink: 0 }}>{day.abbr}</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: d.available ? '#4ADE80' : 'rgba(255,255,255,0.2)', boxShadow: d.available ? '0 0 6px rgba(74,222,128,0.5)' : 'none' }} />
            {d.available
              ? <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#fff', flex: 1 }}>{d.slots.map(s => `${s.start}–${s.end}`).join(', ')}</span>
              : <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', flex: 1 }}>Not available</span>
            }
          </div>
        )
      })}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{mode === 'flexible' ? 7 : mode === 'weekly' ? activeDays : '—'}</div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Days Active</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{mode === 'flexible' ? 'Any' : mode === 'weekly' ? (totalMins > 0 ? `${Math.round(totalMins / 60)}h` : '0h') : '—'}</div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Weekly Hours</div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ── MAIN CLIENT COMPONENT ─────────────────────────────────
// ══════════════════════════════════════════════════════════
export default function AvailabilityClient({ saved }: { saved: SavedAvailability }) {
  const init = buildEditorState(saved)

  // Editor state
  const [mode, setMode]               = useState<Mode>(init.mode)
  const [flexActive, setFlexActive]   = useState(init.flexActive)
  const [days, setDays]               = useState<Record<DayKey, DayState>>(init.days)
  const [rangeStart, setRangeStart]   = useState(init.rangeStart)
  const [rangeEnd, setRangeEnd]       = useState(init.rangeEnd)
  const [rangeTimeStart, setRangeTimeStart] = useState(init.rangeTimeStart)
  const [rangeTimeEnd, setRangeTimeEnd]     = useState(init.rangeTimeEnd)
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null)

  // Per-mode stashed state — preserves each mode's inputs when switching away
  const stash = useRef<{
    weekly: Record<DayKey, DayState>
    range: { start: string; end: string; timeStart: string; timeEnd: string }
  }>({
    weekly: init.days,
    range: { start: init.rangeStart, end: init.rangeEnd, timeStart: init.rangeTimeStart, timeEnd: init.rangeTimeEnd },
  })

  // UI state
  const [screen, setScreen]     = useState<'view' | 'edit'>(saved.mode ? 'view' : 'edit')
  const [toast, setToast]       = useState({ show: false, msg: '', icon: '✓' })
  const [saving, setSaving]     = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(saved.mode ? 'Previously saved' : null)

  // View-mode's active pill — tracks saved mode (what's actually in DB)
  const [viewPill, setViewPill] = useState<Mode>(init.mode)
  // savedMode tracks what mode is actually saved in DB (updated after each save)
  const [savedMode, setSavedMode] = useState<Mode | null>(saved.mode === 'date_range' ? 'range' : saved.mode ?? null)

  // Switch mode while stashing/restoring per-mode state
  const switchMode = (next: Mode) => {
    // Stash current mode's state before switching
    if (mode === 'weekly') {
      stash.current.weekly = days
    } else if (mode === 'range') {
      stash.current.range = { start: rangeStart, end: rangeEnd, timeStart: rangeTimeStart, timeEnd: rangeTimeEnd }
    }
    setMode(next)
    // Restore next mode's state
    if (next === 'weekly') {
      setDays(stash.current.weekly)
      setAppliedTemplate(null)
    } else if (next === 'range') {
      setRangeStart(stash.current.range.start)
      setRangeEnd(stash.current.range.end)
      setRangeTimeStart(stash.current.range.timeStart)
      setRangeTimeEnd(stash.current.range.timeEnd)
    } else if (next === 'flexible') {
      setFlexActive(true)
    }
  }

  const showToast = useCallback((msg: string, icon = '✓') => {
    setToast({ show: true, msg, icon })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
  }, [])

  // ── Editor helpers ───────────────────────────────────────
  const toggleDay = useCallback((key: DayKey, enabled: boolean) => {
    setDays(prev => ({
      ...prev,
      [key]: { available: enabled, slots: enabled && prev[key].slots.length === 0 ? [{ start: '08:00', end: '17:00' }] : prev[key].slots },
    }))
  }, [])

  const addSlot = useCallback((key: DayKey) => {
    setDays(prev => {
      const slots = prev[key].slots
      const last  = slots[slots.length - 1]
      return { ...prev, [key]: { ...prev[key], slots: [...slots, { start: last?.end ?? '08:00', end: '18:00' }] } }
    })
    showToast('Time slot added', '⏰')
  }, [showToast])

  const removeSlot = useCallback((key: DayKey, idx: number) => {
    setDays(prev => {
      const slots = prev[key].slots.filter((_, i) => i !== idx)
      return { ...prev, [key]: { ...prev[key], slots: slots.length === 0 ? [{ start: '08:00', end: '17:00' }] : slots } }
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
    if (appliedTemplate === tplKey) { setAppliedTemplate(null); showToast('Template removed', '↩'); return }
    const tpl = templates[tplKey]
    setDays(prev => {
      const next = { ...prev }
      for (const d of DAYS) {
        if (d.key !== 'sat' && d.key !== 'sun') next[d.key] = { available: true, slots: [{ ...tpl }] }
      }
      return next
    })
    setAppliedTemplate(tplKey)
    showToast(`Template applied: ${tplKey}`, '📋')
  }

  const resetAll = () => {
    if (!confirm('Reset all availability? This cannot be undone.')) return
    setDays(Object.fromEntries(DAYS.map(d => [d.key, { available: false, slots: [] }])) as unknown as Record<DayKey, DayState>)
    setAppliedTemplate(null)
    showToast('Availability reset', '↩')
  }

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      let result
      if (mode === 'flexible') {
        result = await saveAvailability_action({ mode: 'flexible' })
      } else if (mode === 'weekly') {
        result = await saveAvailability_action({ mode: 'weekly', days })
      } else {
        result = await saveAvailability_action({ mode: 'date_range', startDate: rangeStart, endDate: rangeEnd, startTime: rangeTimeStart, endTime: rangeTimeEnd })
      }
      if (result.success) {
        const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        setLastSaved(`Today at ${now}`)
        setViewPill(mode)
        setSavedMode(mode)
        showToast(result.message, '✓')
        // Switch to view after short delay so toast is visible
        setTimeout(() => setScreen('view'), 800)
      } else {
        showToast(result.message, '✕')
      }
    } catch {
      showToast('An unexpected error occurred', '✕')
    } finally {
      setSaving(false)
    }
  }

  // ── Resolved view state (for view screen) ────────────────
  const viewDays       = days
  const viewRangeStart = rangeStart
  const viewRangeEnd   = rangeEnd
  const viewRangeTS    = rangeTimeStart
  const viewRangeTE    = rangeTimeEnd

  // ══════════════════════════════════════════════════════════
  // ── RENDER: VIEW SCREEN ───────────────────────────────────
  // ══════════════════════════════════════════════════════════
  if (screen === 'view') {

    return (
      <div style={{ background: '#F0F5F8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E5EDF0', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#8A9BAA' }}>
            <a href="/provider/dashboard" style={{ color: '#0E7B8C', textDecoration: 'none' }}>Dashboard</a>
            <span>›</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B1E2D' }}>Availability</span>
          </div>
          <button
            onClick={() => setScreen('edit')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', background: '#0E7B8C', color: '#fff', border: 'none', fontFamily: 'inherit' }}>
            ✏️ Edit Availability
          </button>
        </div>

        <div style={{ padding: 28, flex: 1 }}>

          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(14,123,140,0.06)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontFamily: 'monospace', color: '#0E7B8C' }}>
                📍 /provider/availability
              </div>
              {lastSaved && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(39,168,105,0.08)', border: '1px solid rgba(39,168,105,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#27A869' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27A869', display: 'inline-block' }} />
                  Saved · {lastSaved}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', fontWeight: 700, color: '#0B1E2D', marginBottom: 4 }}>My Availability</h1>
                <p style={{ fontSize: '0.88rem', color: '#8A9BAA' }}>Your current working schedule — patients can book you during these times.</p>
              </div>
              {/* Mode pills + Calendar tab */}
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {(['weekly', 'flexible', 'range'] as Mode[]).map(m => (
                  <button key={m} onClick={() => setViewPill(m)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                      cursor: 'pointer', border: viewPill === m ? 'none' : '1.5px solid #E5EDF0', fontFamily: 'inherit',
                      background: viewPill === m ? '#0E7B8C' : '#fff',
                      color: viewPill === m ? '#fff' : m === savedMode ? '#0E7B8C' : '#3D5A63',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                    {m === savedMode && <span style={{ width: 6, height: 6, borderRadius: '50%', background: viewPill === m ? '#fff' : '#27A869', flexShrink: 0, display: 'inline-block' }} />}
                    {m === 'weekly' ? '📅 Weekly' : m === 'flexible' ? '🌐 Flexible' : '📆 Date Range'}
                  </button>
                ))}
                <button onClick={() => setViewPill('calendar' as Mode)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5,
                    border: (viewPill as string) === 'calendar' ? 'none' : '1.5px solid #E5EDF0',
                    background: (viewPill as string) === 'calendar' ? '#0E7B8C' : '#fff',
                    color: (viewPill as string) === 'calendar' ? '#fff' : '#3D5A63',
                  }}>
                  🗓 Calendar
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: (viewPill as string) === 'calendar' ? '1fr' : '1fr 300px', gap: 22, alignItems: 'start' }}>

            {/* Left: view */}
            <div>
              {(viewPill as string) === 'calendar' && (
                <div style={{ background: '#fff', border: '1px solid #E5EDF0', borderRadius: 16, padding: 24 }}>
                  <CalendarView />
                </div>
              )}
              {viewPill === 'weekly'   && (savedMode === 'weekly'   ? <ViewWeekly days={viewDays} /> : <ViewNotConfigured modeLabel="Weekly Schedule" onEdit={() => { setMode('weekly'); setScreen('edit') }} />)}
              {viewPill === 'flexible' && (savedMode === 'flexible' ? <ViewFlexible /> : <ViewNotConfigured modeLabel="Fully Flexible" onEdit={() => { setMode('flexible'); setScreen('edit') }} />)}
              {viewPill === 'range'    && (savedMode === 'range'    ? <ViewDateRange startDate={viewRangeStart} endDate={viewRangeEnd} startTime={viewRangeTS} endTime={viewRangeTE} /> : <ViewNotConfigured modeLabel="Date Range" onEdit={() => { setMode('range'); setScreen('edit') }} />)}
            </div>

            {/* Right: summary + tips — hidden on calendar view */}
            {(viewPill as string) !== 'calendar' && <div>
              <SummaryPanel mode={viewPill === savedMode ? viewPill : 'weekly'} days={viewPill === savedMode ? viewDays : Object.fromEntries(DAYS.map(d => [d.key, { available: false, slots: [] }])) as unknown as Record<DayKey, DayState>} rangeStart={viewPill === savedMode ? viewRangeStart : ''} rangeEnd={viewPill === savedMode ? viewRangeEnd : ''} rangeTimeStart={viewPill === savedMode ? viewRangeTS : ''} rangeTimeEnd={viewPill === savedMode ? viewRangeTE : ''} />
              <div style={{ background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 14, marginTop: 16, padding: '18px 20px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#004A54', marginBottom: 10 }}>💡 Tips</div>
                {['Confirmed bookings automatically block your calendar', 'Higher availability = more bookings and better ranking', 'You can switch modes anytime — changes take effect immediately', 'Set multiple time slots for split shifts'].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.78rem', color: '#0E7B8C', lineHeight: 1.7, marginBottom: i < 3 ? 6 : 0 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4DB6C4', marginTop: 7, flexShrink: 0, display: 'inline-block' }} />
                    {tip}
                  </div>
                ))}
              </div>
            </div>}
          </div>
        </div>

        <Toast show={toast.show} msg={toast.msg} icon={toast.icon} />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════
  // ── RENDER: EDIT SCREEN ───────────────────────────────────
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ background: '#F0F5F8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5EDF0', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#8A9BAA' }}>
          <a href="/provider/dashboard" style={{ color: '#0E7B8C', textDecoration: 'none' }}>Dashboard</a>
          <span>›</span>
          <button onClick={() => setScreen('view')} style={{ background: 'none', border: 'none', color: '#0E7B8C', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit', padding: 0 }}>Availability</button>
          <span>›</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0B1E2D' }}>Edit</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {lastSaved && (
            <button onClick={() => setScreen('view')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', background: 'none', border: '1.5px solid #E5EDF0', color: '#3D5A63', fontFamily: 'inherit' }}>
              ← View
            </button>
          )}
          <button onClick={resetAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', background: 'none', border: '1.5px solid #E5EDF0', color: '#3D5A63', fontFamily: 'inherit' }}>
            ↩ Reset
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', background: '#0E7B8C', color: '#fff', border: 'none', fontFamily: 'inherit' }}>
            {saving ? '⏳ Saving…' : '✓ Save Changes'}
          </button>
        </div>
      </div>

      {/* Page body */}
      <div style={{ padding: 28, flex: 1 }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(14,123,140,0.06)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontFamily: 'monospace', color: '#0E7B8C', marginBottom: 10 }}>
            📍 /provider/availability
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', fontWeight: 700, color: '#0B1E2D', marginBottom: 4 }}>Manage Availability</h1>
          <p style={{ fontSize: '0.88rem', color: '#8A9BAA' }}>Set your working hours so patients can only book you during your available times.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

          {/* Left column */}
          <div>

            {/* Mode Card */}
            <div className="dash-card" style={{ marginBottom: 20 }}>
              <div className="dash-card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(14,123,140,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
                <div>
                  <div className="dash-card-title">Availability Mode</div>
                  <div style={{ fontSize: '0.78rem', color: '#8A9BAA', marginTop: 1 }}>Choose how you want to set your availability</div>
                </div>
              </div>
              <div className="dash-card-body">
                {/* Mode tabs */}
                <div style={{ display: 'flex', gap: 6, background: '#F0F5F8', border: '1px solid #E5EDF0', borderRadius: 12, padding: 5, marginBottom: 22 }}>
                  {(['weekly', 'flexible', 'range'] as Mode[]).map(m => (
                    <button key={m} onClick={() => switchMode(m)}
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 9, fontSize: '0.82rem', fontWeight: 600, textAlign: 'center', cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: mode === m ? '#fff' : 'none', color: mode === m ? '#0E7B8C' : '#8A9BAA', boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}>
                      {m === 'weekly' ? '📅 Weekly Schedule' : m === 'flexible' ? '🌐 Fully Flexible' : '📆 Date Range'}
                    </button>
                  ))}
                </div>

                {/* Flexible Panel */}
                {mode === 'flexible' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0B1E2D' }}>Fully Flexible Mode</div>
                        <div style={{ fontSize: '0.78rem', color: '#8A9BAA', marginTop: 2 }}>Available for bookings any day and any time</div>
                      </div>
                      <Toggle checked={flexActive} onChange={v => setFlexActive(v)} />
                    </div>
                    {flexActive && (
                      <div style={{ background: 'linear-gradient(135deg, rgba(14,123,140,0.08), rgba(14,123,140,0.04))', border: '1.5px solid rgba(14,123,140,0.2)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, background: '#0E7B8C', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🌐</div>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#004A54' }}>Fully Flexible — You're always available!</div>
                          <div style={{ fontSize: '0.78rem', color: '#0E7B8C', marginTop: 2 }}>Patients can book you any day and any time.</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Date Range Panel */}
                {mode === 'range' && (
                  <div>
                    <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, fontSize: '0.78rem', color: '#C9A84C', marginBottom: 18 }}>
                      <span>💡</span>
                      <div>Set a specific period when you are available — useful for "available the whole month" or a short project.</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {[
                        { label: '📅 Start Date', type: 'date', value: rangeStart, onChange: setRangeStart },
                        { label: '📅 End Date',   type: 'date', value: rangeEnd,   onChange: setRangeEnd },
                        { label: '🕐 Start Time', type: 'time', value: rangeTimeStart, onChange: setRangeTimeStart },
                        { label: '🕐 End Time',   type: 'time', value: rangeTimeEnd,   onChange: setRangeTimeEnd },
                      ].map(f => (
                        <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8A9BAA', textTransform: 'uppercase', letterSpacing: '1px' }}>{f.label}</label>
                          <input type={f.type} value={f.value} onChange={e => f.onChange(e.target.value)} className="form-input" style={{ padding: '10px 12px', fontSize: '0.88rem' }} />
                        </div>
                      ))}
                    </div>
                    {rangeStart && rangeEnd && (
                      <div style={{ background: 'rgba(14,123,140,0.06)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 10, padding: '12px 14px', marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>✅</span>
                        <div style={{ fontSize: '0.82rem', color: '#0E7B8C', fontWeight: 500 }}>
                          Available from <strong style={{ fontFamily: 'monospace' }}>{fmtDate(rangeStart)}</strong> to <strong style={{ fontFamily: 'monospace' }}>{fmtDate(rangeEnd)}</strong>, <strong style={{ fontFamily: 'monospace' }}>{rangeTimeStart} – {rangeTimeEnd}</strong> daily.
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
                <div className="dash-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(39,168,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📅</div>
                    <div>
                      <div className="dash-card-title">Weekly Schedule</div>
                      <div style={{ fontSize: '0.78rem', color: '#8A9BAA', marginTop: 1 }}>Set your regular working hours for each day</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['morning', 'evening', 'fulltime'] as const).map(tpl => (
                      <button key={tpl} onClick={() => applyTemplate(tpl)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', border: '1.5px solid', borderColor: appliedTemplate === tpl ? '#0E7B8C' : '#E5EDF0', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, color: appliedTemplate === tpl ? '#004A54' : '#3D5A63', background: appliedTemplate === tpl ? 'rgba(14,123,140,0.08)' : '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {tpl === 'morning' ? '🌅 Mornings' : tpl === 'evening' ? '🌙 Evenings' : '💼 Full-time'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="dash-card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {DAYS.map(day => (
                      <DayRow key={day.key} day={day} state={days[day.key]}
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
            <SummaryPanel mode={mode} days={days} rangeStart={rangeStart} rangeEnd={rangeEnd} rangeTimeStart={rangeTimeStart} rangeTimeEnd={rangeTimeEnd} />
            <div style={{ background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: 16, marginTop: 16, padding: '18px 20px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#004A54', marginBottom: 10 }}>💡 Tips</div>
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
      <div style={{ background: '#fff', borderTop: '1px solid #E5EDF0', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, position: 'sticky', bottom: 0, zIndex: 40, boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '0.82rem', color: '#8A9BAA' }}>
          {lastSaved
            ? <>Last saved: <strong style={{ color: '#27A869' }}>{lastSaved}</strong></>
            : <span style={{ color: '#C9A84C' }}>Not yet saved</span>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastSaved && (
            <button onClick={() => setScreen('view')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', background: 'none', border: '1.5px solid #E5EDF0', color: '#3D5A63', fontFamily: 'inherit' }}>
              ← View
            </button>
          )}
          <button onClick={resetAll}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', background: 'none', border: '1.5px solid #E5EDF0', color: '#3D5A63', fontFamily: 'inherit' }}>
            ↩ Reset
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: '#0E7B8C', color: '#fff', border: 'none', fontFamily: 'inherit', boxShadow: '0 3px 12px rgba(14,123,140,0.25)', opacity: saving ? 0.75 : 1 }}>
            {saving ? '⏳ Saving…' : '✓ Save Availability'}
          </button>
        </div>
      </div>

      <Toast show={toast.show} msg={toast.msg} icon={toast.icon} />
    </div>
  )
}
