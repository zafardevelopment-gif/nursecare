'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadCalendarData, type CalendarDayData, type ShiftKey } from './actions'

const SHIFT_META: Record<ShiftKey, { label: string; icon: string; time: string }> = {
  morning: { label: 'Morning', icon: '🌅', time: '08–16' },
  evening: { label: 'Evening', icon: '🌆', time: '16–00' },
  night:   { label: 'Night',   icon: '🌙', time: '00–08' },
}

const STATUS_COLOR: Record<string, { bg: string; dot: string; label: string }> = {
  available: { bg: 'rgba(39,168,105,0.12)',  dot: '#27A869', label: 'Available' },
  partial:   { bg: 'rgba(245,132,42,0.12)',  dot: '#F5842A', label: 'Partial'   },
  booked:    { bg: 'rgba(224,74,74,0.12)',   dot: '#E04A4A', label: 'Booked'    },
  off:       { bg: 'transparent',            dot: '#ccc',    label: 'Off'       },
}

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function CalendarView() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [days,  setDays]  = useState<CalendarDayData[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ date: string; x: number; y: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await loadCalendarData(year, month)
    setDays(data)
    setLoading(false)
  }, [year, month])

  useEffect(() => { load() }, [load])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // Build grid (pad with nulls)
  const firstDow = new Date(year, month - 1, 1).getDay()
  const grid: (CalendarDayData | null)[] = [
    ...Array(firstDow).fill(null),
    ...days,
  ]
  while (grid.length % 7 !== 0) grid.push(null)

  // Summary stats
  const allShifts    = days.flatMap(d => d.shifts)
  const availCount   = allShifts.filter(s => s.status === 'available').length
  const partialCount = allShifts.filter(s => s.status === 'partial').length
  const bookedCount  = allShifts.filter(s => s.status === 'booked').length
  const totalBooked  = allShifts.reduce((s, sh) => s + sh.bookedHours, 0)

  const tooltipDay = tooltip ? days.find(d => d.date === tooltip.date) : null

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem',
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          Availability Calendar
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 130, textAlign: 'center' }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} style={navBtn}>›</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLOR).filter(([k]) => k !== 'off').map(([key, val]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--ink)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: val.dot, display: 'inline-block' }} />
            {val.label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--ink)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ccc', display: 'inline-block' }} />
          Day Off
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading…</div>
      ) : (
        <>
          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {grid.map((day, i) => {
              if (!day) {
                return <div key={`pad-${i}`} style={{ minHeight: 72, borderRadius: 8, background: 'var(--cream)' }} />
              }

              const isToday      = day.date === today.toISOString().slice(0, 10)
              const activeShifts = day.shifts.filter(s => s.status !== 'off')
              const dayNum       = parseInt(day.date.slice(8))
              const hasBooked    = activeShifts.some(s => s.status === 'booked')
              const hasPartial   = activeShifts.some(s => s.status === 'partial')
              const hasAvail     = activeShifts.some(s => s.status === 'available')
              const cellBorder   = hasBooked  ? '1.5px solid rgba(224,74,74,0.35)'
                                 : hasPartial ? '1.5px solid rgba(245,132,42,0.35)'
                                 : hasAvail   ? '1.5px solid rgba(39,168,105,0.3)'
                                 : '1px solid var(--border)'

              return (
                <div
                  key={day.date}
                  onMouseEnter={e => {
                    if (activeShifts.length > 0) setTooltip({ date: day.date, x: e.clientX, y: e.clientY })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    minHeight: 72, borderRadius: 8, padding: '6px 7px',
                    background: '#fff',
                    border: isToday ? '2px solid var(--teal)' : cellBorder,
                    cursor: activeShifts.length > 0 ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column', gap: 3,
                  }}
                >
                  <div style={{
                    fontSize: '0.72rem', fontWeight: isToday ? 800 : 600,
                    color: isToday ? 'var(--teal)' : 'var(--ink)',
                    marginBottom: 2,
                  }}>
                    {dayNum}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(['morning', 'evening', 'night'] as ShiftKey[]).map(shift => {
                      const shiftData = day.shifts.find(s => s.shift === shift)
                      if (!shiftData || shiftData.status === 'off') return null
                      const color     = STATUS_COLOR[shiftData.status]
                      const booked    = shiftData.bookedHours
                      const total     = shiftData.totalHours
                      return (
                        <div key={shift} style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          background: color.bg, borderRadius: 4, padding: '1px 4px',
                        }}>
                          <span style={{ fontSize: '0.58rem' }}>{SHIFT_META[shift].icon}</span>
                          <div style={{
                            flex: 1, height: 3, borderRadius: 2,
                            background: 'rgba(0,0,0,0.08)', overflow: 'hidden',
                          }}>
                            {booked > 0 && (
                              <div style={{
                                height: '100%',
                                width: `${Math.min(100, (booked / total) * 100)}%`,
                                background: color.dot, borderRadius: 2,
                              }} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary stats */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Available Shifts', val: availCount,   dot: '#27A869' },
              { label: 'Partial',          val: partialCount, dot: '#F5842A' },
              { label: 'Fully Booked',     val: bookedCount,  dot: '#E04A4A' },
              { label: 'Hours Booked',     val: `${totalBooked}h`, dot: 'var(--teal)' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--cream)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 14px',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.label}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)' }}>{s.val}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tooltip */}
      {tooltip && tooltipDay && (
        <div style={{
          position: 'fixed', zIndex: 9999,
          top: tooltip.y + 12, left: tooltip.x + 8,
          background: '#1a1a2e', color: '#fff',
          borderRadius: 10, padding: '10px 14px',
          fontSize: '0.75rem', minWidth: 180,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.8rem' }}>
            {new Date(tooltipDay.date + 'T12:00:00').toLocaleDateString('en-SA', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          {(['morning', 'evening', 'night'] as ShiftKey[]).map(shift => {
            const s = tooltipDay.shifts.find(x => x.shift === shift)
            if (!s || s.status === 'off') return null
            const col = STATUS_COLOR[s.status]
            return (
              <div key={shift} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span>{SHIFT_META[shift].icon}</span>
                <span style={{ flex: 1 }}>{SHIFT_META[shift].label}</span>
                <span style={{
                  background: col.bg, color: col.dot,
                  padding: '1px 6px', borderRadius: 5, fontWeight: 700, fontSize: '0.68rem',
                }}>
                  {col.label}
                </span>
                {s.bookedHours > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>
                    {s.bookedHours}/{s.totalHours}h
                  </span>
                )}
              </div>
            )
          })}
          {tooltipDay.shifts.flatMap(s => s.bookings).length > 0 && (
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              {tooltipDay.shifts.flatMap(s => s.bookings).map(b => (
                <div key={b.id} style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>
                  👤 {b.patientName ?? 'Patient'} · {b.startTime}–{b.endTime} · {b.bookedHours}h
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const navBtn: React.CSSProperties = {
  background: 'var(--cream)', border: '1px solid var(--border)',
  borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
  fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'inherit',
}
