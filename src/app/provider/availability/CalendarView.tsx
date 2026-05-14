'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadCalendarTimeData, type CalendarDayTimeData } from './actions'

const STATUS_COLOR: Record<string, { bg: string; bar: string; text: string }> = {
  available: { bg: 'rgba(39,168,105,0.13)',  bar: '#27A869', text: '#166534' },
  partial:   { bg: 'rgba(245,132,42,0.13)',  bar: '#F5842A', text: '#92400e' },
  booked:    { bg: 'rgba(224,74,74,0.13)',   bar: '#E04A4A', text: '#991b1b' },
}

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const navBtn: React.CSSProperties = {
  background: 'var(--cream)', border: '1px solid var(--border)',
  borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
  fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'inherit',
}

export default function CalendarView() {
  const today = new Date()
  const [year,    setYear]    = useState(today.getFullYear())
  const [month,   setMonth]   = useState(today.getMonth() + 1)
  const [days,    setDays]    = useState<CalendarDayTimeData[]>([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ date: string; x: number; y: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await loadCalendarTimeData(year, month)
    setDays(data)
    setLoading(false)
  }, [year, month])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets loading/days state to mirror remote fetch
  useEffect(() => { load() }, [load])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDow = new Date(year, month - 1, 1).getDay()
  const grid: (CalendarDayTimeData | null)[] = [
    ...Array(firstDow).fill(null),
    ...days,
  ]
  while (grid.length % 7 !== 0) grid.push(null)

  // Summary stats
  const totalAvailHours  = days.reduce((s, d) => s + d.totalAvailHours, 0)
  const totalBookedHours = days.reduce((s, d) => s + d.totalBookedHours, 0)
  const activeDays  = days.filter(d => d.slots.length > 0).length
  const bookedDays  = days.filter(d => d.totalBookedHours > 0).length
  const todayStr    = today.toISOString().slice(0, 10)

  const tooltipDay = tooltip ? days.find(d => d.date === tooltip.date) : null

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Availability Calendar</h3>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
            Time-based view of your schedule
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 130, textAlign: 'center' }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} style={navBtn}>›</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {([
          { key: 'available', label: 'Available', dot: '#27A869' },
          { key: 'partial',   label: 'Partial',   dot: '#F5842A' },
          { key: 'booked',    label: 'Booked',    dot: '#E04A4A' },
          { key: 'off',       label: 'Day Off',   dot: '#CBD5E0' },
        ]).map(l => (
          <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: l.dot, display: 'inline-block' }} />
            {l.label}
          </div>
        ))}
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
              if (!day) return (
                <div key={`pad-${i}`} style={{ minHeight: 72, borderRadius: 8, background: 'var(--cream)', opacity: 0.5 }} />
              )

              const isToday   = day.date === todayStr
              const isPast    = day.date < todayStr
              const hasSlots  = day.slots.length > 0
              const dayNum    = parseInt(day.date.slice(8))
              const isHovered = hovered === day.date

              // Overall day status
              const hasBooked  = day.slots.some(s => s.status === 'booked')
              const hasPartial = day.slots.some(s => s.status === 'partial')
              const hasAvail   = day.slots.some(s => s.status === 'available')

              const borderColor = !hasSlots ? 'var(--border)'
                : hasBooked  ? 'rgba(224,74,74,0.4)'
                : hasPartial ? 'rgba(245,132,42,0.4)'
                : hasAvail   ? 'rgba(39,168,105,0.4)'
                : 'var(--border)'

              return (
                <div
                  key={day.date}
                  onMouseEnter={e => {
                    if (hasSlots) {
                      setHovered(day.date)
                      setTooltip({ date: day.date, x: e.clientX, y: e.clientY })
                    }
                  }}
                  onMouseMove={e => {
                    if (hasSlots) setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)
                  }}
                  onMouseLeave={() => { setHovered(null); setTooltip(null) }}
                  style={{
                    minHeight: 80, borderRadius: 9, padding: '6px 7px',
                    background: isPast && !isToday ? 'var(--cream)' : '#fff',
                    border: isToday ? '2px solid #0E7B8C' : `1.5px solid ${isHovered && hasSlots ? '#0E7B8C' : borderColor}`,
                    cursor: hasSlots ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column', gap: 3,
                    opacity: isPast && !isToday ? 0.6 : 1,
                    transition: 'border-color 0.12s',
                  }}
                >
                  {/* Date number */}
                  <div style={{
                    fontSize: '0.72rem', fontWeight: isToday ? 800 : 600,
                    color: isToday ? '#0E7B8C' : 'var(--ink)', marginBottom: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span>{dayNum}</span>
                    {day.totalBookedHours > 0 && (
                      <span style={{ fontSize: '0.55rem', background: '#FEE2E2', color: '#DC2626', borderRadius: 3, padding: '0 3px', fontWeight: 700 }}>
                        {day.totalBookedHours}h
                      </span>
                    )}
                  </div>

                  {/* Time slots */}
                  {day.slots.map((slot, idx) => {
                    const col   = STATUS_COLOR[slot.status] ?? STATUS_COLOR.available
                    const pct   = slot.totalHours > 0 ? Math.min(100, (slot.bookedHours / slot.totalHours) * 100) : 0
                    const label = slot.from === '00:00' && slot.to === '24:00'
                      ? 'All day'
                      : `${slot.from.slice(0,5)}–${slot.to === '24:00' ? '00:00' : slot.to.slice(0,5)}`

                    return (
                      <div key={idx} style={{
                        background: col.bg, borderRadius: 5, padding: '2px 5px',
                        display: 'flex', flexDirection: 'column', gap: 2,
                      }}>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: col.text, letterSpacing: '0.01em' }}>
                          {label}
                        </span>
                        {/* Progress bar */}
                        <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: pct >= 100 ? '#E04A4A' : pct > 0 ? '#F5842A' : col.bar,
                            borderRadius: 2, transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Summary stats */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Active Days',    val: activeDays,                              dot: '#27A869' },
              { label: 'Booked Days',    val: bookedDays,                              dot: '#F5842A' },
              { label: 'Avail Hours',    val: `${totalAvailHours.toFixed(0)}h`,        dot: '#0E7B8C' },
              { label: 'Booked Hours',   val: `${totalBookedHours.toFixed(0)}h`,       dot: '#E04A4A' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--cream)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '7px 13px',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{s.label}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)' }}>{s.val}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tooltip */}
      {tooltip && tooltipDay && tooltipDay.slots.length > 0 && (
        <div style={{
          position: 'fixed', zIndex: 9999,
          top: Math.min(tooltip.y + 12, window.innerHeight - 200),
          left: Math.min(tooltip.x + 8,  window.innerWidth  - 220),
          background: '#1a1a2e', color: '#fff',
          borderRadius: 12, padding: '12px 16px',
          fontSize: '0.75rem', minWidth: 200, maxWidth: 240,
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 6 }}>
            {new Date(tooltipDay.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          {tooltipDay.slots.map((slot, i) => {
            const pct = slot.totalHours > 0 ? Math.round((slot.bookedHours / slot.totalHours) * 100) : 0
            const statusLabel = slot.status === 'available' ? 'Available' : slot.status === 'booked' ? 'Booked' : 'Partial'
            const statusColor = slot.status === 'available' ? '#27A869' : slot.status === 'booked' ? '#E04A4A' : '#F5842A'
            const label = slot.from === '00:00' && slot.to === '24:00'
              ? 'All day (00:00–24:00)'
              : `${slot.from.slice(0,5)} – ${slot.to === '24:00' ? '00:00' : slot.to.slice(0,5)}`
            return (
              <div key={i} style={{ marginBottom: i < tooltipDay.slots.length - 1 ? 8 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>🕐 {label}</span>
                  <span style={{ color: statusColor, fontWeight: 700, fontSize: '0.68rem',
                    background: `${statusColor}22`, borderRadius: 4, padding: '1px 6px' }}>
                    {statusLabel}
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>
                  {slot.totalHours}h total · {slot.bookedHours}h booked
                  {pct > 0 ? ` (${pct}%)` : ''}
                </div>
                {/* Mini progress */}
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: statusColor, borderRadius: 2 }} />
                </div>
                {slot.bookings.map(b => (
                  <div key={b.id} style={{ marginTop: 5, fontSize: '0.67rem', color: 'rgba(255,255,255,0.6)',
                    borderLeft: '2px solid rgba(255,255,255,0.15)', paddingLeft: 6 }}>
                    👤 {b.patientName ?? 'Patient'} · {b.startTime}–{b.endTime} · {b.bookedHours}h
                  </div>
                ))}
              </div>
            )
          })}
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Total: {tooltipDay.totalAvailHours.toFixed(1)}h avail</span>
            {tooltipDay.totalBookedHours > 0 && <span style={{ color: '#F5842A' }}>{tooltipDay.totalBookedHours.toFixed(1)}h booked</span>}
          </div>
        </div>
      )}
    </div>
  )
}
