'use client'

import { useState } from 'react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SHIFTS = [
  { key: 'morning',  label: 'Morning',  time: '8AM – 4PM',   color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)', icon: '🌅' },
  { key: 'evening',  label: 'Evening',  time: '4PM – 12AM',  color: '#7B2FBE', bg: 'rgba(123,47,190,0.08)', icon: '🌆' },
  { key: 'night',    label: 'Night',    time: '12AM – 8AM',  color: '#1A3A6A', bg: 'rgba(26,58,106,0.08)',  icon: '🌙' },
]

const DEPTS = ['ICU', 'General Ward', 'Pediatrics', 'Emergency', 'Surgery']

type Slot = { nurseId: string; nurseName: string; dept: string }
type Schedule = Record<string, Record<string, Slot[]>> // shift -> day -> slots[]

const NURSES = [
  'Reem Al-Ghamdi', 'Sara Al-Harbi', 'Nadia Khan', 'Fatima Malik',
  'Lina Al-Saad', 'Hessa Al-Dosari', 'Noura Al-Qahtani', 'Maha Al-Zahrani',
]

function makeInitialSchedule(): Schedule {
  const s: Schedule = {}
  for (const shift of SHIFTS) {
    s[shift.key] = {}
    for (const day of DAYS) {
      // Populate most slots with random nurses
      const count = Math.floor(Math.random() * 3) + 1
      s[shift.key][day] = Array.from({ length: count }, (_, i) => ({
        nurseId: `n${i}`,
        nurseName: NURSES[Math.floor(Math.random() * NURSES.length)],
        dept: DEPTS[Math.floor(Math.random() * DEPTS.length)],
      }))
    }
  }
  return s
}

export default function HospitalSchedulePage() {
  const [schedule] = useState<Schedule>(makeInitialSchedule)
  const [selectedShift, setSelectedShift] = useState('morning')
  const [selectedDept, setSelectedDept] = useState('All')
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay()])

  const shiftInfo = SHIFTS.find(s => s.key === selectedShift)!
  const shiftSchedule = schedule[selectedShift] ?? {}

  function getSlots(day: string): Slot[] {
    const slots = shiftSchedule[day] ?? []
    return selectedDept === 'All' ? slots : slots.filter(s => s.dept === selectedDept)
  }

  const totalAssigned = DAYS.reduce((sum, day) => sum + getSlots(day).length, 0)
  const vacantDays = DAYS.filter(day => getSlots(day).length === 0).length

  return (
    <div className="dash-shell">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Shift Schedule</h1>
          <p className="dash-sub">Weekly nursing shift assignments and vacancy management</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode(viewMode === 'week' ? 'day' : 'week')}
            style={{
              background: 'var(--shell-bg)', border: '1px solid var(--border)', color: 'var(--ink)',
              padding: '9px 16px', borderRadius: 9, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
            }}
          >
            {viewMode === 'week' ? '📅 Day View' : '📆 Week View'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Assigned', value: totalAssigned, color: '#0E7B8C', icon: '👩‍⚕️' },
          { label: 'Vacant Days', value: vacantDays, color: '#b85e00', icon: '⚠️' },
          { label: 'Shifts / Day', value: SHIFTS.length, color: '#7B2FBE', icon: '🕐' },
          { label: 'Departments', value: DEPTS.length, color: '#1A7A4A', icon: '🏢' },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ padding: '1rem', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="dash-card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Shift Tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {SHIFTS.map(s => (
              <button
                key={s.key}
                onClick={() => setSelectedShift(s.key)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem',
                  border: 'none', cursor: 'pointer',
                  background: selectedShift === s.key ? s.color : 'var(--shell-bg)',
                  color: selectedShift === s.key ? '#fff' : 'var(--ink)',
                  transition: 'all 0.15s',
                }}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Dept filter */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="form-input"
            style={{ width: 'auto', fontSize: '0.82rem', padding: '8px 12px' }}
          >
            <option value="All">All Departments</option>
            {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Shift info badge */}
          <div style={{
            marginLeft: 'auto', background: shiftInfo.bg, color: shiftInfo.color,
            padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
          }}>
            {shiftInfo.icon} {shiftInfo.label} Shift · {shiftInfo.time}
          </div>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="week-grid">
          {DAYS.map((day, dayIdx) => {
            const slots = getSlots(day)
            const isToday = dayIdx === new Date().getDay()
            const isEmpty = slots.length === 0

            return (
              <div key={day} className="dash-card" style={{
                borderTop: `3px solid ${isEmpty ? '#E5E7EB' : shiftInfo.color}`,
                opacity: isEmpty ? 0.75 : 1,
              }}>
                <div style={{ padding: '0.75rem 0.6rem' }}>
                  {/* Day header */}
                  <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <div style={{
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                      color: isToday ? shiftInfo.color : 'var(--muted)', letterSpacing: '0.05em',
                    }}>{SHORT_DAYS[dayIdx]}</div>
                    {isToday && (
                      <div style={{
                        display: 'inline-block', background: shiftInfo.color, color: '#fff',
                        fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 50, marginTop: 2,
                      }}>TODAY</div>
                    )}
                  </div>

                  {/* Nurse slots */}
                  {isEmpty ? (
                    <div style={{
                      background: '#FEF2F2', borderRadius: 6, padding: '8px 4px',
                      textAlign: 'center', fontSize: '0.65rem', color: '#EF4444', fontWeight: 600,
                    }}>
                      <div style={{ fontSize: '0.9rem', marginBottom: 2 }}>⚠️</div>
                      Vacant
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {slots.slice(0, 3).map((slot, i) => (
                        <div key={i} style={{
                          background: shiftInfo.bg, borderRadius: 6, padding: '5px 6px',
                        }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: shiftInfo.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {slot.nurseName.split(' ')[0]}
                          </div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--muted)', marginTop: 1 }}>{slot.dept}</div>
                        </div>
                      ))}
                      {slots.length > 3 && (
                        <div style={{
                          fontSize: '0.6rem', color: shiftInfo.color, fontWeight: 700,
                          textAlign: 'center', padding: '2px 0',
                        }}>+{slots.length - 3} more</div>
                      )}
                    </div>
                  )}

                  {/* Slot count */}
                  <div style={{
                    marginTop: 8, textAlign: 'center', fontSize: '0.65rem',
                    color: isEmpty ? '#EF4444' : 'var(--muted)', fontWeight: 600,
                  }}>
                    {slots.length} nurse{slots.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div>
          {/* Day selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
            {DAYS.map((day, i) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem',
                  border: 'none', cursor: 'pointer',
                  background: selectedDay === day ? shiftInfo.color : 'var(--shell-bg)',
                  color: selectedDay === day ? '#fff' : 'var(--ink)',
                  outline: i === new Date().getDay() ? `2px solid ${shiftInfo.color}` : 'none',
                  outlineOffset: 1,
                }}
              >
                {SHORT_DAYS[i]}
              </button>
            ))}
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">{selectedDay} — {shiftInfo.label} Shift ({shiftInfo.time})</span>
              <span style={{ background: shiftInfo.bg, color: shiftInfo.color, fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 50 }}>
                {getSlots(selectedDay).length} assigned
              </span>
            </div>
            <div className="dash-card-body" style={{ padding: 0 }}>
              {getSlots(selectedDay).length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>No nurses assigned</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>This slot is vacant for the selected shift and department filter.</div>
                </div>
              ) : (
                getSlots(selectedDay).map((slot, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                    borderBottom: i < getSlots(selectedDay).length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', background: shiftInfo.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: '0.88rem', flexShrink: 0,
                    }}>
                      {slot.nurseName.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)' }}>{slot.nurseName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>Department: {slot.dept}</div>
                    </div>
                    <span style={{
                      background: shiftInfo.bg, color: shiftInfo.color,
                      fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50,
                    }}>
                      {shiftInfo.label}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
