// Shared constants — no 'use server' directive, safe to import anywhere

export const SHIFT_HOURS: Record<string, { start: string; end: string; total: number }> = {
  morning: { start: '08:00', end: '16:00', total: 8 },
  evening: { start: '16:00', end: '00:00', total: 8 },
  night:   { start: '00:00', end: '08:00', total: 8 },
}

export type ShiftKey   = 'morning' | 'evening' | 'night'
export type DayKey     = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export type DayShifts  = { morning: boolean; evening: boolean; night: boolean }
export type WeekState  = Record<DayKey, DayShifts>
export type ShiftStatus = 'available' | 'partial' | 'booked' | 'off'

export const DAY_OF_WEEK: Record<DayKey, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}
