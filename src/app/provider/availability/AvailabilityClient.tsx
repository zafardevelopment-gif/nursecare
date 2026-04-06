'use client'

import { useState, useTransition } from 'react'
import { saveShiftSchedule, saveFlexibleSchedule, saveDateRangeSchedule, type SavedSchedule } from './actions'
import type { WeekState, DayKey, ShiftKey, DayShifts } from './shiftConstants'
import CalendarView from './CalendarView'

// ── Constants ─────────────────────────────────────────────
const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Monday'    },
  { key: 'tue', label: 'Tuesday'   },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday'  },
  { key: 'fri', label: 'Friday'    },
  { key: 'sat', label: 'Saturday'  },
  { key: 'sun', label: 'Sunday'    },
]

const SHIFTS: { key: ShiftKey; label: string; time: string; icon: string }[] = [
  { key: 'morning', label: 'Morning', time: '08:00–16:00', icon: '🌅' },
  { key: 'evening', label: 'Evening', time: '16:00–00:00', icon: '🌆' },
  { key: 'night',   label: 'Night',   time: '00:00–08:00', icon: '🌙' },
]

const EMPTY_WEEK: WeekState = {
  sun: { morning: false, evening: false, night: false },
  mon: { morning: false, evening: false, night: false },
  tue: { morning: false, evening: false, night: false },
  wed: { morning: false, evening: false, night: false },
  thu: { morning: false, evening: false, night: false },
  fri: { morning: false, evening: false, night: false },
  sat: { morning: false, evening: false, night: false },
}

type Mode = 'weekly' | 'flexible' | 'date_range'

// ── Toast ─────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: type === 'success' ? '#27A869' : '#E04A4A',
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  )
}

// ── Main component ────────────────────────────────────────
export default function AvailabilityClient({ saved }: { saved: SavedSchedule }) {
  const [mode, setMode]       = useState<Mode>(saved.mode ?? 'weekly')
  const [week, setWeek]       = useState<WeekState>(saved.weekState ?? EMPTY_WEEK)
  const [flexible, setFlexible] = useState(saved.flexible ?? false)
  const [drStart, setDrStart] = useState(saved.dateRange?.startDate ?? '')
  const [drEnd,   setDrEnd]   = useState(saved.dateRange?.endDate   ?? '')
  const [drShifts, setDrShifts] = useState<{ morning: boolean; evening: boolean; night: boolean }>(
    saved.dateRange?.shifts ?? { morning: true, evening: false, night: false }
  )
  const [toast, setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function toggleShift(dayKey: DayKey, shift: ShiftKey) {
    setWeek(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], [shift]: !prev[dayKey][shift] } }))
  }

  function applyTemplate(template: ShiftKey | 'all') {
    const next = { ...EMPTY_WEEK } as WeekState
    for (const day of DAYS) {
      next[day.key] = template === 'all'
        ? { morning: true, evening: true, night: true }
        : { morning: false, evening: false, night: false, [template]: true }
    }
    setWeek(next)
  }

  function handleSave() {
    startTransition(async () => {
      let result: { success: boolean; message: string }
      if (mode === 'weekly') {
        result = await saveShiftSchedule(week)
      } else if (mode === 'flexible') {
        result = await saveFlexibleSchedule()
      } else {
        result = await saveDateRangeSchedule(drStart, drEnd, drShifts)
      }
      showToast(result.message, result.success ? 'success' : 'error')
    })
  }

  // Weekly stats
  const totalShifts = Object.values(week).reduce((s, d) => s + [d.morning, d.evening, d.night].filter(Boolean).length, 0)
  const activeDays  = Object.values(week).filter(d => d.morning || d.evening || d.night).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Mode selector */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Availability Mode</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Choose how you want to set your availability</div>
            </div>
          </div>
        </div>
        <div className="dash-card-body" style={{ paddingTop: 0 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8,
            background: 'var(--cream)', borderRadius: 10, padding: 4,
          }}>
            {([
              { key: 'weekly',     icon: '📅', label: 'Weekly Schedule' },
              { key: 'flexible',   icon: '🌐', label: 'Fully Flexible'  },
              { key: 'date_range', icon: '📆', label: 'Date Range'      },
            ] as { key: Mode; icon: string; label: string }[]).map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                style={{
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: mode === m.key ? '#fff' : 'transparent',
                  fontWeight: mode === m.key ? 700 : 500,
                  color: mode === m.key ? 'var(--teal)' : 'var(--muted)',
                  boxShadow: mode === m.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  fontSize: '0.82rem', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Weekly Mode ─────────────────────────────────── */}
      {mode === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header + templates */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Weekly Shift Schedule</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>Select shifts per day</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {([
                { key: 'morning', label: '🌅 All Mornings', bg: '#FFF8E7', color: '#b85e00' },
                { key: 'evening', label: '🌆 All Evenings', bg: '#EEF6FD', color: '#1a5f7a' },
                { key: 'night',   label: '🌙 All Nights',   bg: '#F0F0FF', color: '#3b3b8a' },
                { key: 'all',     label: '✦ Full Week',     bg: '#E8F9F0', color: '#1a7a4a' },
              ] as any[]).map(t => (
                <button key={t.key} onClick={() => applyTemplate(t.key)}
                  style={{ background: t.bg, color: t.color, border: '1px solid var(--border)', borderRadius: 7, padding: '5px 11px', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t.label}
                </button>
              ))}
              <button onClick={() => setWeek({ ...EMPTY_WEEK })}
                style={{ background: 'var(--cream)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 11px', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✕ Clear
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Active Days',   val: activeDays },
              { label: 'Weekly Shifts', val: totalShifts },
              { label: 'Weekly Hours',  val: `${totalShifts * 8}h` },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--teal)' }}>{s.val}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Shift legend */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {SHIFTS.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600 }}>
                {s.icon} {s.label}: <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{s.time}</span>
              </div>
            ))}
          </div>

          {/* Day rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {DAYS.map(day => {
              const ds: DayShifts = week[day.key]
              const any = ds.morning || ds.evening || ds.night
              return (
                <div key={day.key} style={{
                  background: '#fff', borderRadius: 12, padding: '0.9rem 1.2rem',
                  border: `1px solid ${any ? 'rgba(14,123,140,0.3)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                }}>
                  <div style={{ width: 110, flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{day.label}</div>
                    <div style={{ fontSize: '0.68rem', color: any ? '#27A869' : 'var(--muted)', marginTop: 1 }}>
                      {any ? `${[ds.morning, ds.evening, ds.night].filter(Boolean).length} shift${[ds.morning, ds.evening, ds.night].filter(Boolean).length !== 1 ? 's' : ''}` : 'Day off'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
                    {SHIFTS.map(s => {
                      const active = ds[s.key]
                      return (
                        <button key={s.key} onClick={() => toggleShift(day.key, s.key)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                            padding: '7px 14px', borderRadius: 9, cursor: 'pointer', minWidth: 85,
                            border: active ? '2px solid var(--teal)' : '1px solid var(--border)',
                            background: active ? 'rgba(14,123,140,0.07)' : 'var(--cream)',
                            color: active ? 'var(--teal)' : 'var(--muted)',
                            fontWeight: active ? 700 : 500, fontSize: '0.75rem',
                            transition: 'all 0.15s', fontFamily: 'inherit',
                          }}>
                          <span style={{ fontSize: '0.95rem' }}>{s.icon}</span>
                          <span>{s.label}</span>
                          <span style={{ fontSize: '0.6rem', opacity: 0.75 }}>{s.time}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Flexible Mode ───────────────────────────────── */}
      {mode === 'flexible' && (
        <div className="dash-card">
          <div className="dash-card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Fully Flexible Mode</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 }}>Available for bookings any day and any time</div>
              </div>
              <button onClick={() => setFlexible(f => !f)} style={{
                width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: flexible ? '#27A869' : '#CBD5E0', position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: flexible ? 24 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
            {flexible && (
              <div style={{
                marginTop: '1rem', padding: '1rem 1.2rem',
                background: 'linear-gradient(135deg,rgba(14,123,140,0.07),rgba(10,191,204,0.05))',
                border: '1px solid rgba(14,123,140,0.2)', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 40, height: 40, background: 'var(--teal)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🌐</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>Fully Flexible — You're always available!</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>Patients can book you any day and any time.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Date Range Mode ─────────────────────────────── */}
      {mode === 'date_range' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: '#FFFBEB', border: '1px solid rgba(245,132,42,0.3)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: '0.78rem', color: '#92400e', display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span>💡</span>
            <span>Set a specific period when you are available — useful for "available the whole month" or a short project.</span>
          </div>

          <div className="dash-card">
            <div className="dash-card-body">
              {/* Date pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    📅 Start Date
                  </div>
                  <input type="date" value={drStart} onChange={e => setDrStart(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.88rem', fontFamily: 'inherit', background: 'var(--cream)', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    📅 End Date
                  </div>
                  <input type="date" value={drEnd} onChange={e => setDrEnd(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.88rem', fontFamily: 'inherit', background: 'var(--cream)', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Shift selection */}
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Available Shifts During This Period
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {SHIFTS.map(s => {
                  const active = drShifts[s.key]
                  return (
                    <button key={s.key}
                      onClick={() => setDrShifts(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        padding: '10px', borderRadius: 10, cursor: 'pointer',
                        border: active ? '2px solid var(--teal)' : '1px solid var(--border)',
                        background: active ? 'rgba(14,123,140,0.07)' : 'var(--cream)',
                        color: active ? 'var(--teal)' : 'var(--muted)',
                        fontWeight: active ? 700 : 500, fontSize: '0.78rem',
                        transition: 'all 0.15s', fontFamily: 'inherit',
                      }}>
                      <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
                      <span>{s.label}</span>
                      <span style={{ fontSize: '0.63rem', opacity: 0.8 }}>{s.time}</span>
                    </button>
                  )
                })}
              </div>

              {/* Summary */}
              {drStart && drEnd && drStart <= drEnd && (
                <div style={{ marginTop: '1rem', padding: '10px 12px', background: 'rgba(14,123,140,0.05)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--teal)', fontWeight: 600 }}>
                  📅 {drStart} → {drEnd} · {[drShifts.morning && 'Morning', drShifts.evening && 'Evening', drShifts.night && 'Night'].filter(Boolean).join(', ') || 'No shifts selected'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={isPending}
          style={{
            background: isPending ? 'var(--muted)' : 'var(--teal)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '12px 28px', fontSize: '0.9rem', fontWeight: 700,
            cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
          {isPending ? 'Saving…' : 'Save Schedule'}
        </button>
      </div>

      {/* Calendar */}
      <div style={{ marginTop: '0.5rem' }}>
        <CalendarView />
      </div>
    </div>
  )
}
