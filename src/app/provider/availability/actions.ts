'use server'

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { SHIFT_HOURS, DAY_OF_WEEK } from './shiftConstants'
import type { ShiftKey, DayKey, DayShifts, WeekState, ShiftStatus, DaySchedule, WeekSchedule, TimeSlot, DateRangeEntry } from './shiftConstants'
import { DEFAULT_WEEK_SCHEDULE } from './shiftConstants'
export type { ShiftKey, DayKey, DayShifts, WeekState, ShiftStatus, DaySchedule, WeekSchedule, TimeSlot, DateRangeEntry } from './shiftConstants'

// ── Calendar types ────────────────────────────────────────

export type CalendarShift = {
  shift:       ShiftKey
  status:      ShiftStatus
  totalHours:  number
  bookedHours: number
  bookings:    {
    id:          string
    patientName: string | null
    bookedHours: number
    bookingType: 'patient' | 'hospital'
    startTime:   string
    endTime:     string
  }[]
}

export type CalendarDayData = {
  date:   string
  shifts: CalendarShift[]
}

// ── Helpers ───────────────────────────────────────────────
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// ── Load calendar data for a month ────────────────────────
export async function loadCalendarData(year: number, month: number): Promise<CalendarDayData[]> {
  const user    = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const service  = createSupabaseServiceRoleClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!nurse) return []

  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  const startStr = firstDay.toISOString().slice(0, 10)
  const endStr   = lastDay.toISOString().slice(0, 10)

  // Shift availability cache
  const { data: availRows } = await service
    .from('shift_availability')
    .select('date, shift, total_hours, booked_hours, status')
    .eq('nurse_id', nurse.id)
    .gte('date', startStr)
    .lte('date', endStr)

  // Actual bookings
  const { data: bookingRows } = await service
    .from('shift_bookings')
    .select('id, date, shift, patient_name, booked_hours, booking_type, start_time, end_time, status')
    .eq('nurse_id', nurse.id)
    .gte('date', startStr)
    .lte('date', endStr)
    .neq('status', 'cancelled')

  const days: CalendarDayData[] = []

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)

    const shifts: CalendarShift[] = (['morning', 'evening', 'night'] as ShiftKey[]).map(shift => {
      const avail = (availRows ?? []).find(r => r.date === dateStr && r.shift === shift)
      if (!avail) return { shift, status: 'off' as ShiftStatus, totalHours: 8, bookedHours: 0, bookings: [] }

      const shiftBookings = (bookingRows ?? [])
        .filter(b => b.date === dateStr && b.shift === shift)
        .map(b => ({
          id:          b.id,
          patientName: b.patient_name,
          bookedHours: Number(b.booked_hours),
          bookingType: b.booking_type as 'patient' | 'hospital',
          startTime:   b.start_time,
          endTime:     b.end_time,
        }))

      return {
        shift,
        status:      avail.status as ShiftStatus,
        totalHours:  Number(avail.total_hours),
        bookedHours: Number(avail.booked_hours),
        bookings:    shiftBookings,
      }
    })

    days.push({ date: dateStr, shifts })
  }

  return days
}

export type SavedSchedule = {
  mode: 'weekly' | 'flexible' | 'date_range' | null
  weekState: WeekState
  weekSchedule: WeekSchedule
  flexible: boolean
  dateRanges: DateRangeEntry[]
}

// ── Load saved schedule (all modes) ───────────────────────
export async function loadShiftSchedule(): Promise<SavedSchedule> {
  const user    = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const emptyWeek: WeekState = {
    sun: { morning: false, evening: false, night: false },
    mon: { morning: false, evening: false, night: false },
    tue: { morning: false, evening: false, night: false },
    wed: { morning: false, evening: false, night: false },
    thu: { morning: false, evening: false, night: false },
    fri: { morning: false, evening: false, night: false },
    sat: { morning: false, evening: false, night: false },
  }

  const emptyWeekSchedule: WeekSchedule = { ...DEFAULT_WEEK_SCHEDULE }
  if (!nurse) return { mode: null, weekState: emptyWeek, weekSchedule: emptyWeekSchedule, flexible: false, dateRanges: [] }

  const { data: shiftRows } = await supabase
    .from('nurse_shifts')
    .select('day_of_week, shift, is_active')
    .eq('nurse_id', nurse.id)

  const { data: availRows } = await supabase
    .from('nurse_availability')
    .select('id, availability_type, day_of_week, start_time, end_time, start_date, end_date, slot_group')
    .eq('nurse_id', nurse.id)
    .order('slot_group', { ascending: true })
    .order('start_time', { ascending: true })

  const hasWeekly    = shiftRows && shiftRows.some(r => r.is_active)
  const modes        = [...new Set((availRows ?? []).map(r => r.availability_type).filter(Boolean))]
  const isFlexible   = modes.includes('flexible')
  const isDateRange  = modes.includes('date_range')
  const isWeeklyTime = modes.includes('weekly_time')

  const DOW_TO_KEY: Record<number, DayKey> = { 0:'sun',1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:'sat' }

  // Build weekState (legacy shift-based)
  const weekState = { ...emptyWeek }
  for (const row of shiftRows ?? []) {
    if (!row.is_active) continue
    const dayKey = DOW_TO_KEY[row.day_of_week]
    if (dayKey && ['morning','evening','night'].includes(row.shift)) {
      weekState[dayKey][row.shift as ShiftKey] = true
    }
  }

  // Build weekSchedule (multi-slot time-based weekly)
  const weekSchedule: WeekSchedule = { ...DEFAULT_WEEK_SCHEDULE }
  if (isWeeklyTime) {
    const weekRows = (availRows ?? []).filter(r => r.availability_type === 'weekly_time')
    for (const dayKey of Object.keys(weekSchedule) as DayKey[]) {
      const dow = { sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6 }[dayKey]
      const dayRows = weekRows.filter(r => r.day_of_week === dow)
      if (dayRows.length > 0) {
        weekSchedule[dayKey] = {
          enabled: true,
          slots: dayRows.map(r => ({ from: r.start_time ?? '08:00', to: r.end_time ?? '17:00' })),
        }
      }
    }
  }

  // Build dateRanges (multi-range, multi-slot — grouped by slot_group)
  const dateRanges: DateRangeEntry[] = []
  if (isDateRange) {
    const drRows = (availRows ?? []).filter(r => r.availability_type === 'date_range')
    const groups = [...new Set(drRows.map(r => r.slot_group ?? r.start_date ?? '').filter(Boolean))]
    for (const grp of groups) {
      const grpRows = drRows.filter(r => (r.slot_group ?? r.start_date ?? '') === grp)
      if (grpRows.length === 0) continue
      dateRanges.push({
        id: grp,
        startDate: grpRows[0].start_date ?? '',
        endDate:   grpRows[0].end_date   ?? '',
        slots: grpRows.map(r => ({ from: r.start_time ?? '08:00', to: r.end_time ?? '17:00' })),
      })
    }
  }

  if (isFlexible)   return { mode: 'flexible',   weekState, weekSchedule, flexible: true,  dateRanges }
  if (isDateRange)  return { mode: 'date_range',  weekState, weekSchedule, flexible: false, dateRanges }
  if (isWeeklyTime) return { mode: 'weekly',      weekState, weekSchedule, flexible: false, dateRanges }
  if (hasWeekly)    return { mode: 'weekly',      weekState, weekSchedule, flexible: false, dateRanges }

  return { mode: null, weekState: emptyWeek, weekSchedule: emptyWeekSchedule, flexible: false, dateRanges: [] }
}

// ── Shared: time-overlap → shifts ─────────────────────────
function slotsToShifts(slots: TimeSlot[]): Set<ShiftKey> {
  const SHIFT_RANGES: Record<ShiftKey, { start: string; end: string }> = {
    morning: { start: '08:00', end: '16:00' },
    evening: { start: '16:00', end: '24:00' },
    night:   { start: '00:00', end: '08:00' },
  }
  const result = new Set<ShiftKey>()
  for (const slot of slots) {
    const from = slot.from
    const to   = slot.to <= slot.from ? '24:00' : slot.to
    for (const shift of ['morning', 'evening', 'night'] as ShiftKey[]) {
      const sr = SHIFT_RANGES[shift]
      if (from < sr.end && to > sr.start) result.add(shift)
    }
  }
  return result
}

// ── Save time-based weekly schedule (multi-slot) ───────────
export async function saveWeeklyTimeSchedule(
  schedule: WeekSchedule
): Promise<{ success: boolean; message: string }> {
  const user    = await requireRole('provider')
  const service  = createSupabaseServiceRoleClient()

  const { data: nurse } = await service
    .from('nurses').select('id').eq('user_id', user.id).single()
  if (!nurse) return { success: false, message: 'Nurse profile not found' }

  const DOW: Record<DayKey, number> = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 }

  await service.from('nurse_availability')
    .delete().eq('nurse_id', nurse.id).eq('availability_type', 'weekly_time')

  // One row per slot per day
  const rows: object[] = []
  for (const [dayKey, ds] of Object.entries(schedule) as [DayKey, DaySchedule][]) {
    if (!ds.enabled) continue
    for (const slot of ds.slots) {
      rows.push({
        nurse_id: nurse.id, availability_type: 'weekly_time',
        day_of_week: DOW[dayKey],
        start_time: slot.from, end_time: slot.to,
        start_date: null, end_date: null,
      })
    }
  }

  if (rows.length > 0) {
    const { error } = await service.from('nurse_availability').insert(rows)
    if (error) return { success: false, message: error.message }
  }

  // Expand shift_availability for next 90 days
  const DOW_TO_KEY: Record<number, DayKey> = { 0:'sun',1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:'sat' }
  const today = new Date(); today.setHours(0,0,0,0)
  const todayStr = today.toISOString().slice(0, 10)
  const avRows: { nurse_id:string; date:string; shift:string; total_hours:number; booked_hours:number; status:string }[] = []

  for (let i = 0; i < 90; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayKey  = DOW_TO_KEY[d.getDay()]
    const ds      = schedule[dayKey]
    if (!ds.enabled) continue
    for (const shift of slotsToShifts(ds.slots)) {
      avRows.push({ nurse_id: nurse.id, date: dateStr, shift, total_hours: 8, booked_hours: 0, status: 'available' })
    }
  }

  await service.from('shift_availability')
    .delete().eq('nurse_id', nurse.id).eq('booked_hours', 0).gte('date', todayStr)

  if (avRows.length > 0) {
    await service.from('shift_availability')
      .upsert(avRows, { onConflict: 'nurse_id,date,shift', ignoreDuplicates: true })
  }

  await service.from('nurse_shifts').update({ is_active: false }).eq('nurse_id', nurse.id)

  revalidatePath('/provider/availability')
  const activeDays = Object.values(schedule).filter(d => d.enabled).length
  return { success: true, message: `Schedule saved for ${activeDays} day${activeDays !== 1 ? 's' : ''} per week` }
}

// ── Save shift schedule (legacy — kept for compatibility) ──
export async function saveShiftSchedule(
  days: WeekState
): Promise<{ success: boolean; message: string }> {
  const user    = await requireRole('provider')
  const service  = createSupabaseServiceRoleClient()

  const { data: nurse } = await service
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!nurse) return { success: false, message: 'Nurse profile not found' }

  // Build upsert rows for all shifts
  const rows: { nurse_id: string; day_of_week: number; shift: string; is_active: boolean }[] = []

  for (const [dayKey, shifts] of Object.entries(days) as [DayKey, DayShifts][]) {
    const dow = DAY_OF_WEEK[dayKey]
    for (const shift of ['morning', 'evening', 'night'] as ShiftKey[]) {
      rows.push({
        nurse_id:    nurse.id,
        day_of_week: dow,
        shift,
        is_active:   shifts[shift],
      })
    }
  }

  const { error } = await service
    .from('nurse_shifts')
    .upsert(rows, { onConflict: 'nurse_id,day_of_week,shift' })

  if (error) return { success: false, message: error.message }

  // Expand shift_availability for next 90 days
  await expandShiftAvailability(nurse.id, days, 90)

  revalidatePath('/provider/availability')
  return { success: true, message: 'Schedule saved successfully' }
}

// ── Expand shift_availability for next N days ──────────────
async function expandShiftAvailability(nurseId: string, days: WeekState, numDays: number) {
  const service = createSupabaseServiceRoleClient()
  const DOW_TO_KEY: Record<number, DayKey> = { 0:'sun',1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:'sat' }

  const today   = new Date()
  today.setHours(0, 0, 0, 0)
  const rows: { nurse_id: string; date: string; shift: string; total_hours: number; booked_hours: number; status: string }[] = []

  for (let i = 0; i < numDays; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayKey  = DOW_TO_KEY[d.getDay()]
    const dayShifts = days[dayKey]

    for (const shift of ['morning', 'evening', 'night'] as ShiftKey[]) {
      if (dayShifts[shift]) {
        rows.push({
          nurse_id:    nurseId,
          date:        dateStr,
          shift,
          total_hours:  8,
          booked_hours: 0,
          status:       'available',
        })
      }
    }
  }

  if (rows.length === 0) return

  // Upsert — don't overwrite booked_hours if already booked
  await service
    .from('shift_availability')
    .upsert(rows, {
      onConflict:        'nurse_id,date,shift',
      ignoreDuplicates:  true,   // don't overwrite existing rows (preserves booked_hours)
    })

  // Also delete shift_availability rows that are no longer active (nurse deselected them)
  // Only delete future rows with 0 booked_hours (don't touch rows with bookings)
  const today2 = today.toISOString().slice(0, 10)
  const inactiveCombos: { date: string; shift: string }[] = []

  for (let i = 0; i < numDays; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayKey  = DOW_TO_KEY[d.getDay()]
    const dayShifts = days[dayKey]

    for (const shift of ['morning', 'evening', 'night'] as ShiftKey[]) {
      if (!dayShifts[shift]) {
        inactiveCombos.push({ date: dateStr, shift })
      }
    }
  }

  // Delete in batches of 50 to avoid huge OR clauses
  for (let i = 0; i < inactiveCombos.length; i += 50) {
    const batch = inactiveCombos.slice(i, i + 50)
    for (const combo of batch) {
      await service
        .from('shift_availability')
        .delete()
        .eq('nurse_id', nurseId)
        .eq('date', combo.date)
        .eq('shift', combo.shift)
        .eq('booked_hours', 0)   // safety: only delete unbooked
        .gte('date', today2)
    }
  }
}

// ── Get shift availability for a specific nurse + date range ─
export async function getShiftAvailability(
  nurseUserId: string,
  startDate:   string,
  endDate:     string,
): Promise<Record<string, Record<ShiftKey, { status: ShiftStatus; bookedHours: number; remainingHours: number }>>> {
  const service = createSupabaseServiceRoleClient()

  const { data: nurse } = await service
    .from('nurses')
    .select('id')
    .eq('user_id', nurseUserId)
    .single()

  if (!nurse) return {}

  const { data: rows } = await service
    .from('shift_availability')
    .select('date, shift, status, booked_hours, total_hours')
    .eq('nurse_id', nurse.id)
    .gte('date', startDate)
    .lte('date', endDate)

  const result: Record<string, Record<ShiftKey, { status: ShiftStatus; bookedHours: number; remainingHours: number }>> = {}

  for (const row of rows ?? []) {
    if (!result[row.date]) {
      result[row.date] = {
        morning: { status: 'off', bookedHours: 0, remainingHours: 0 },
        evening: { status: 'off', bookedHours: 0, remainingHours: 0 },
        night:   { status: 'off', bookedHours: 0, remainingHours: 0 },
      }
    }
    result[row.date][row.shift as ShiftKey] = {
      status:         row.status as ShiftStatus,
      bookedHours:    Number(row.booked_hours),
      remainingHours: Number(row.total_hours) - Number(row.booked_hours),
    }
  }

  return result
}

// ── Recalculate + update shift_availability after a booking ─
export async function recalcShiftAvailability(
  nurseId: string,
  date:    string,
  shift:   ShiftKey,
) {
  const service = createSupabaseServiceRoleClient()

  const { data } = await service
    .from('shift_bookings')
    .select('booked_hours')
    .eq('nurse_id', nurseId)
    .eq('date', date)
    .eq('shift', shift)
    .neq('status', 'cancelled')

  const bookedHours = (data ?? []).reduce((sum, r) => sum + Number(r.booked_hours), 0)
  const totalHours  = 8
  const status      = bookedHours === 0 ? 'available' : bookedHours >= totalHours ? 'booked' : 'partial'

  await service
    .from('shift_availability')
    .update({ booked_hours: bookedHours, status, updated_at: new Date().toISOString() })
    .eq('nurse_id', nurseId)
    .eq('date', date)
    .eq('shift', shift)
}

// ── Save Flexible mode ─────────────────────────────────────
export async function saveFlexibleSchedule(): Promise<{ success: boolean; message: string }> {
  const user    = await requireRole('provider')
  const service  = createSupabaseServiceRoleClient()

  const { data: nurse } = await service.from('nurses').select('id').eq('user_id', user.id).single()
  if (!nurse) return { success: false, message: 'Nurse profile not found' }

  // Store in nurse_availability (existing table)
  await service.from('nurse_availability').delete().eq('nurse_id', nurse.id)
  await service.from('nurse_availability').insert({
    nurse_id: nurse.id, availability_type: 'flexible',
    day_of_week: null, start_time: null, end_time: null, start_date: null, end_date: null,
  })

  // Disable all nurse_shifts
  await service.from('nurse_shifts').update({ is_active: false }).eq('nurse_id', nurse.id)

  // Expand shift_availability for all 3 shifts for next 90 days
  const allDays: WeekState = {
    sun: { morning: true, evening: true, night: true },
    mon: { morning: true, evening: true, night: true },
    tue: { morning: true, evening: true, night: true },
    wed: { morning: true, evening: true, night: true },
    thu: { morning: true, evening: true, night: true },
    fri: { morning: true, evening: true, night: true },
    sat: { morning: true, evening: true, night: true },
  }
  await expandShiftAvailability(nurse.id, allDays, 90)

  revalidatePath('/provider/availability')
  return { success: true, message: 'Flexible availability saved' }
}

// ── Save Date Range mode (multi-range, multi-slot) ────────
export async function saveDateRangeSchedule(
  ranges: DateRangeEntry[]
): Promise<{ success: boolean; message: string }> {
  const user    = await requireRole('provider')
  const service  = createSupabaseServiceRoleClient()

  if (!ranges.length) return { success: false, message: 'Add at least one date range' }
  for (const r of ranges) {
    if (!r.startDate || !r.endDate)   return { success: false, message: 'Start and end dates are required for each range' }
    if (r.startDate > r.endDate)      return { success: false, message: 'Start date must be before end date' }
    if (!r.slots.length)              return { success: false, message: 'Add at least one time slot per range' }
    for (const s of r.slots) {
      if (!s.from || !s.to)           return { success: false, message: 'Fill in all time slots' }
      if (s.from >= s.to)             return { success: false, message: 'From time must be before to time in each slot' }
    }
  }

  const { data: nurse } = await service.from('nurses').select('id').eq('user_id', user.id).single()
  if (!nurse) return { success: false, message: 'Nurse profile not found' }

  // Replace all date_range rows
  await service.from('nurse_availability').delete().eq('nurse_id', nurse.id).eq('availability_type', 'date_range')

  // Insert: one row per slot per range; use range id as slot_group
  const insertRows: object[] = []
  for (const range of ranges) {
    for (const slot of range.slots) {
      insertRows.push({
        nurse_id: nurse.id, availability_type: 'date_range',
        day_of_week: null,
        start_time: slot.from, end_time: slot.to,
        start_date: range.startDate, end_date: range.endDate,
        slot_group: range.id,
      })
    }
  }

  if (insertRows.length > 0) {
    const { error } = await service.from('nurse_availability').insert(insertRows)
    if (error) return { success: false, message: error.message }
  }

  await service.from('nurse_shifts').update({ is_active: false }).eq('nurse_id', nurse.id)

  // Expand shift_availability for all ranges
  const today = new Date().toISOString().slice(0, 10)
  const avRows: { nurse_id:string; date:string; shift:string; total_hours:number; booked_hours:number; status:string }[] = []

  for (const range of ranges) {
    const activeShifts = slotsToShifts(range.slots)
    const cur = new Date(range.startDate + 'T00:00:00')
    const end = new Date(range.endDate   + 'T00:00:00')
    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10)
      if (dateStr >= today) {
        for (const shift of activeShifts) {
          avRows.push({ nurse_id: nurse.id, date: dateStr, shift, total_hours: 8, booked_hours: 0, status: 'available' })
        }
      }
      cur.setDate(cur.getDate() + 1)
    }
  }

  if (avRows.length > 0) {
    await service.from('shift_availability').upsert(avRows, { onConflict: 'nurse_id,date,shift', ignoreDuplicates: true })
  }

  revalidatePath('/provider/availability')
  return { success: true, message: `${ranges.length} date range${ranges.length !== 1 ? 's' : ''} saved` }
}

// ── Check if a day-of-week has active bookings (for weekly edit guard) ──
export async function checkDayHasBookings(
  dayOfWeek: number  // 0=Sun … 6=Sat
): Promise<{ hasBookings: boolean; dates: string[] }> {
  const user    = await requireRole('provider')
  const service  = createSupabaseServiceRoleClient()

  const { data: nurse } = await service.from('nurses').select('id').eq('user_id', user.id).single()
  if (!nurse) return { hasBookings: false, dates: [] }

  const today = new Date().toISOString().slice(0, 10)
  const { data } = await service
    .from('shift_bookings')
    .select('date')
    .eq('nurse_id', nurse.id)
    .neq('status', 'cancelled')
    .gte('date', today)

  const matchDates = (data ?? [])
    .map(r => r.date as string)
    .filter(d => {
      const dow = new Date(d + 'T12:00:00').getDay()
      return dow === dayOfWeek
    })

  return { hasBookings: matchDates.length > 0, dates: [...new Set(matchDates)] }
}

// ── Check if a date range overlaps with active bookings ────
export async function checkRangeHasBookings(
  startDate: string,
  endDate:   string,
): Promise<{ hasBookings: boolean; dates: string[] }> {
  const user    = await requireRole('provider')
  const service  = createSupabaseServiceRoleClient()

  const { data: nurse } = await service.from('nurses').select('id').eq('user_id', user.id).single()
  if (!nurse) return { hasBookings: false, dates: [] }

  const { data } = await service
    .from('shift_bookings')
    .select('date')
    .eq('nurse_id', nurse.id)
    .neq('status', 'cancelled')
    .gte('date', startDate)
    .lte('date', endDate)

  const dates = [...new Set((data ?? []).map(r => r.date as string))]
  return { hasBookings: dates.length > 0, dates }
}

// ── Time-based calendar data (replaces shift-based for display) ──
export type CalendarTimeSlot = {
  from:        string
  to:          string
  bookedHours: number
  totalHours:  number
  status:      ShiftStatus
  bookings: {
    id:          string
    patientName: string | null
    bookedHours: number
    startTime:   string
    endTime:     string
  }[]
}

export type CalendarDayTimeData = {
  date:  string
  slots: CalendarTimeSlot[]
  totalAvailHours:  number
  totalBookedHours: number
}

export async function loadCalendarTimeData(year: number, month: number): Promise<CalendarDayTimeData[]> {
  const user    = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const service  = createSupabaseServiceRoleClient()

  const { data: nurse } = await supabase.from('nurses').select('id').eq('user_id', user.id).single()
  if (!nurse) return []

  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  const startStr = firstDay.toISOString().slice(0, 10)
  const endStr   = lastDay.toISOString().slice(0, 10)

  // Get nurse_availability time slots that apply to this month
  const { data: availRows } = await service
    .from('nurse_availability')
    .select('availability_type, day_of_week, start_time, end_time, start_date, end_date')
    .eq('nurse_id', nurse.id)

  // Get bookings
  const { data: bookingRows } = await service
    .from('shift_bookings')
    .select('id, date, patient_name, booked_hours, start_time, end_time, status')
    .eq('nurse_id', nurse.id)
    .gte('date', startStr)
    .lte('date', endStr)
    .neq('status', 'cancelled')

  const DOW_TO_KEY: Record<number, DayKey> = { 0:'sun',1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:'sat' }
  const result: CalendarDayTimeData[] = []

  const isFlexible  = (availRows ?? []).some(r => r.availability_type === 'flexible')
  const weeklyRows  = (availRows ?? []).filter(r => r.availability_type === 'weekly_time')
  const rangeRows   = (availRows ?? []).filter(r => r.availability_type === 'date_range')

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    const dow     = d.getDay()

    // Determine time slots for this day
    let daySlots: { from: string; to: string }[] = []

    if (isFlexible) {
      daySlots = [{ from: '00:00', to: '24:00' }]
    } else {
      // Check date ranges first (override weekly)
      const rangeMatch = rangeRows.filter(r =>
        r.start_date && r.end_date &&
        dateStr >= r.start_date && dateStr <= r.end_date
      )
      if (rangeMatch.length > 0) {
        daySlots = rangeMatch.map(r => ({ from: r.start_time ?? '08:00', to: r.end_time ?? '17:00' }))
      } else {
        // Weekly schedule
        daySlots = weeklyRows
          .filter(r => r.day_of_week === dow)
          .map(r => ({ from: r.start_time ?? '08:00', to: r.end_time ?? '17:00' }))
      }
    }

    if (daySlots.length === 0) {
      result.push({ date: dateStr, slots: [], totalAvailHours: 0, totalBookedHours: 0 })
      continue
    }

    const dayBookings = (bookingRows ?? []).filter(b => b.date === dateStr)
    const totalBookedHours = dayBookings.reduce((s, b) => s + Number(b.booked_hours), 0)

    const slots: CalendarTimeSlot[] = daySlots.map(sl => {
      const [fh, fm] = sl.from.split(':').map(Number)
      const [th, tm] = (sl.to === '24:00' ? '24:00' : sl.to).split(':').map(Number)
      const totalHours = Math.max(0, (th * 60 + tm - fh * 60 - fm) / 60)

      // Bookings overlapping this slot
      const slotBookings = dayBookings
        .filter(b => b.start_time < sl.to && b.end_time > sl.from)
        .map(b => ({
          id: b.id,
          patientName: b.patient_name,
          bookedHours: Number(b.booked_hours),
          startTime: b.start_time,
          endTime:   b.end_time,
        }))
      const bookedHours = slotBookings.reduce((s, b) => s + b.bookedHours, 0)
      const status: ShiftStatus = bookedHours === 0 ? 'available' : bookedHours >= totalHours ? 'booked' : 'partial'

      return { from: sl.from, to: sl.to, bookedHours, totalHours, status, bookings: slotBookings }
    })

    const totalAvailHours = slots.reduce((s, sl) => s + sl.totalHours, 0)
    result.push({ date: dateStr, slots, totalAvailHours, totalBookedHours })
  }

  return result
}
