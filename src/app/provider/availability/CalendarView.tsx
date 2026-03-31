'use client'

import { useState, useCallback, useEffect } from 'react'
import { loadCalendarData, type CalendarDayData } from './actions'

// ── Color helpers ─────────────────────────────────────────

/** Returns a green shade based on available hours (0–24) */
function availColor(hours: number, isFlexible: boolean): string {
  if (hours <= 0) return 'transparent'
  if (isFlexible) return 'rgba(39,168,105,0.85)' // solid green for flexible
  const ratio = Math.min(hours / 12, 1) // saturate at 12h
  const alpha = 0.15 + ratio * 0.7
  return `rgba(39,168,105,${alpha.toFixed(2)})`
}

/** Returns a red shade based on booked hours */
function bookedColor(bookedHours: number, availHours: number): string {
  if (bookedHours <= 0) return 'transparent'
  const maxRef  = Math.max(availHours, bookedHours, 8)
  const ratio   = Math.min(bookedHours / maxRef, 1)
  const alpha   = 0.2 + ratio * 0.65
  return `rgba(220,53,69,${alpha.toFixed(2)})`
}

/** Mixed color when both available and booked */
function dayBg(d: CalendarDayData): { bg: string; border: string; textColor: string } {
  if (d.bookings.length > 0) {
    // Show red gradient — how full the bookings are
    const bg     = bookedColor(d.bookedHours, d.availableHours)
    const full   = d.bookedHours >= d.availableHours
    const border = full ? 'rgba(220,53,69,0.6)' : 'rgba(220,53,69,0.3)'
    const textColor = d.bookedHours >= 4 ? '#fff' : '#7f1d1d'
    return { bg, border, textColor }
  }
  if (d.availableHours > 0) {
    const bg     = availColor(d.availableHours, d.isFlexible)
    const border = d.isFlexible ? 'rgba(39,168,105,0.5)' : 'rgba(39,168,105,0.3)'
    const textColor = d.availableHours >= 6 ? '#fff' : '#14532d'
    return { bg, border, textColor }
  }
  return { bg: '#F7FAFC', border: '#E5EDF0', textColor: '#B0BEC5' }
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const SHIFT_LABEL: Record<string, string> = {
  morning: 'Morning (6h)', evening: 'Evening (6h)', night: 'Night (8h)', full_day: 'Full Day (12h)',
}

// ── Tooltip ───────────────────────────────────────────────
function Tooltip({ day, x, y }: { day: CalendarDayData; x: number; y: number }) {
  const hasBookings = day.bookings.length > 0
  const isOff       = day.availableHours <= 0 && !hasBookings

  // Position: flip left if too close to right edge
  const leftPos = x > window.innerWidth - 280 ? x - 270 : x + 14

  return (
    <div style={{
      position: 'fixed',
      left: leftPos,
      top: Math.min(y - 10, window.innerHeight - 260),
      zIndex: 9999,
      background: '#0C1E26',
      color: '#fff',
      borderRadius: 12,
      padding: '14px 16px',
      minWidth: 220,
      maxWidth: 280,
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      pointerEvents: 'none',
      fontSize: '0.8rem',
    }}>
      {/* Date header */}
      <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
        {new Date(day.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      {isOff && (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Not available this day</div>
      )}

      {!isOff && (
        <>
          {/* Availability row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
              {day.isFlexible ? 'Fully flexible — any time' : `Available: ${day.availableHours.toFixed(1)}h`}
            </span>
          </div>

          {/* Bookings */}
          {hasBookings ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F87171', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Booked: {day.bookedHours}h · {day.bookings.length} booking{day.bookings.length > 1 ? 's' : ''}
                </span>
              </div>
              {day.bookings.map(b => (
                <div key={b.id} style={{
                  background: 'rgba(220,53,69,0.15)',
                  border: '1px solid rgba(220,53,69,0.25)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  marginBottom: 6,
                }}>
                  <div style={{ fontWeight: 700, color: '#FCA5A5', fontSize: '0.78rem', marginBottom: 3 }}>
                    {b.booking_ref}
                  </div>
                  {b.patient_name && (
                    <div style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>👤 {b.patient_name}</div>
                  )}
                  {b.service_type && (
                    <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>🏥 {b.service_type}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'rgba(255,255,255,0.1)', borderRadius: 5,
                      padding: '2px 7px', fontSize: '0.72rem', fontWeight: 600,
                    }}>
                      {SHIFT_LABEL[b.shift] ?? b.shift}
                    </span>
                    <span style={{
                      background: b.status === 'confirmed' ? 'rgba(39,168,105,0.2)' : 'rgba(255,255,255,0.1)',
                      color: b.status === 'confirmed' ? '#4ADE80' : 'rgba(255,255,255,0.6)',
                      borderRadius: 5, padding: '2px 7px', fontSize: '0.72rem', fontWeight: 600,
                    }}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '0.75rem' }}>
              No bookings this day
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: '0.75rem', color: '#8A9BAA' }}>
      {[
        { color: 'rgba(39,168,105,0.2)', label: 'Low availability (1–4h)' },
        { color: 'rgba(39,168,105,0.55)', label: 'Moderate (4–8h)' },
        { color: 'rgba(39,168,105,0.85)', label: 'Fully available / Flexible' },
        { color: 'rgba(220,53,69,0.3)', label: 'Lightly booked' },
        { color: 'rgba(220,53,69,0.7)', label: 'Heavily booked' },
        { color: '#F7FAFC', label: 'Day off', border: '#E5EDF0' },
      ].map(l => (
        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: l.color, border: `1px solid ${l.border ?? 'transparent'}`, display: 'inline-block', flexShrink: 0 }} />
          {l.label}
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────
export default function CalendarView() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-based
  const [days,  setDays]  = useState<CalendarDayData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [tooltip, setTooltip] = useState<{ day: CalendarDayData; x: number; y: number } | null>(null)

  const fetchMonth = useCallback(async (y: number, m: number) => {
    setLoading(true)
    setDays(null)
    try {
      const data = await loadCalendarData(y, m)
      setDays(data)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on first render
  useEffect(() => { fetchMonth(year, month) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function prevMonth() {
    const m = month === 1 ? 12 : month - 1
    const y = month === 1 ? year - 1 : year
    setMonth(m); setYear(y); fetchMonth(y, m)
  }
  function nextMonth() {
    const m = month === 12 ? 1 : month + 1
    const y = month === 12 ? year + 1 : year
    setMonth(m); setYear(y); fetchMonth(y, m)
  }
  function goToday() {
    const t = new Date()
    setMonth(t.getMonth() + 1); setYear(t.getFullYear())
    fetchMonth(t.getFullYear(), t.getMonth() + 1)
  }

  // Build calendar grid — first cell = Sunday of week containing 1st
  const firstDayDate = new Date(year, month - 1, 1)
  const startOffset  = firstDayDate.getDay() // 0=Sun
  const daysInMonth  = new Date(year, month, 0).getDate()
  const totalCells   = Math.ceil((startOffset + daysInMonth) / 7) * 7

  const todayStr = today.toISOString().slice(0, 10)
  const dayMap   = new Map<string, CalendarDayData>(days?.map(d => [d.date, d]) ?? [])

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.2rem', fontWeight: 700, color: '#0B1E2D', minWidth: 180, textAlign: 'center' }}>
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} style={navBtn}>›</button>
        </div>
        <button onClick={goToday} style={{
          padding: '6px 14px', borderRadius: 8, border: '1.5px solid #E5EDF0',
          background: '#fff', color: '#0E7B8C', fontSize: '0.8rem', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Today
        </button>
      </div>

      {/* Legend */}
      <div style={{ marginBottom: 16 }}>
        <Legend />
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#8A9BAA', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A9BAA', fontSize: '0.85rem' }}>
          Loading…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const dayNum = i - startOffset + 1
            if (dayNum < 1 || dayNum > daysInMonth) {
              return <div key={i} style={{ height: 64, borderRadius: 10 }} />
            }

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
            const dayData = dayMap.get(dateStr)
            const isToday = dateStr === todayStr
            const colors  = dayData ? dayBg(dayData) : { bg: '#F7FAFC', border: '#E5EDF0', textColor: '#B0BEC5' }

            return (
              <div
                key={dateStr}
                onMouseEnter={e => dayData && setTooltip({ day: dayData, x: e.clientX, y: e.clientY })}
                onMouseMove={e => dayData && setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => setTooltip(null)}
                style={{
                  height: 64,
                  borderRadius: 10,
                  background: colors.bg,
                  border: `1.5px solid ${isToday ? '#0E7B8C' : colors.border}`,
                  cursor: dayData ? 'pointer' : 'default',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  boxShadow: isToday ? '0 0 0 2px rgba(14,123,140,0.3)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '6px 7px',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
                onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.boxShadow = isToday ? '0 0 0 2px rgba(14,123,140,0.3)' : 'none' }}
              >
                {/* Day number */}
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: isToday ? 800 : 600,
                  color: isToday ? '#0E7B8C' : colors.textColor,
                  lineHeight: 1,
                }}>
                  {dayNum}
                  {isToday && <span style={{ marginLeft: 3, fontSize: '0.6rem', color: '#0E7B8C', fontWeight: 700, background: 'rgba(14,123,140,0.1)', borderRadius: 4, padding: '1px 4px' }}>Today</span>}
                </span>

                {/* Bottom info */}
                {dayData && dayData.availableHours > 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 }}>
                    {/* Available hours pill */}
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 700,
                      color: colors.textColor, opacity: 0.9,
                      lineHeight: 1,
                    }}>
                      {dayData.isFlexible ? '∞' : `${dayData.availableHours.toFixed(0)}h`}
                    </span>

                    {/* Booking dots */}
                    {dayData.bookings.length > 0 && (
                      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 28 }}>
                        {dayData.bookings.slice(0, 3).map((b, i) => (
                          <span key={i} style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: b.status === 'confirmed' ? '#fff' : 'rgba(255,255,255,0.6)',
                            display: 'inline-block', flexShrink: 0,
                          }} />
                        ))}
                        {dayData.bookings.length > 3 && (
                          <span style={{ fontSize: '0.55rem', color: colors.textColor, fontWeight: 700 }}>+{dayData.bookings.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && <Tooltip day={tooltip.day} x={tooltip.x} y={tooltip.y} />}

      {/* Monthly summary */}
      {days && !loading && <MonthlySummary days={days} />}
    </div>
  )
}

// ── Monthly summary bar ───────────────────────────────────
function MonthlySummary({ days }: { days: CalendarDayData[] }) {
  const availDays   = days.filter(d => d.availableHours > 0).length
  const bookedDays  = days.filter(d => d.bookings.length > 0).length
  const totalBooked = days.reduce((s, d) => s + d.bookedHours, 0)
  const totalAvail  = days.reduce((s, d) => s + d.availableHours, 0)
  const utilPct     = totalAvail > 0 ? Math.round((totalBooked / totalAvail) * 100) : 0

  return (
    <div style={{
      marginTop: 20, padding: '14px 18px',
      background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.15)',
      borderRadius: 12, display: 'flex', gap: 24, flexWrap: 'wrap',
    }}>
      {[
        { label: 'Available Days', value: availDays, color: '#27A869' },
        { label: 'Booked Days',    value: bookedDays, color: '#DC3545' },
        { label: 'Booked Hours',   value: `${totalBooked}h`, color: '#DC3545' },
        { label: 'Utilisation',    value: `${utilPct}%`, color: utilPct > 70 ? '#DC3545' : utilPct > 40 ? '#C9A84C' : '#27A869' },
      ].map(s => (
        <div key={s.label}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: '0.72rem', color: '#8A9BAA', marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

const navBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8,
  border: '1.5px solid #E5EDF0', background: '#fff',
  color: '#0E7B8C', fontSize: '1.1rem', fontWeight: 700,
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontFamily: 'inherit',
  transition: 'all 0.15s',
}
