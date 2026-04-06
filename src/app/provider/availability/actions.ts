'use server'

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { SHIFT_HOURS, DAY_OF_WEEK } from './shiftConstants'
import type { ShiftKey, DayKey, WeekState, ShiftStatus } from './shiftConstants'
export type { ShiftKey, DayKey, DayShifts, WeekState, ShiftStatus } from './shiftConstants'

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
  flexible: boolean
  dateRange: { startDate: string; endDate: string; shifts: { morning: boolean; evening: boolean; night: boolean } } | null
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

  if (!nurse) return { mode: null, weekState: emptyWeek, flexible: false, dateRange: null }

  // Try nurse_shifts first (weekly mode)
  const { data: shiftRows } = await supabase
    .from('nurse_shifts')
    .select('day_of_week, shift, is_active')
    .eq('nurse_id', nurse.id)

  // Check nurse_availability for flexible/date_range (legacy + new)
  const { data: availRows } = await supabase
    .from('nurse_availability')
    .select('availability_type, day_of_week, start_time, end_time, start_date, end_date')
    .eq('nurse_id', nurse.id)

  const hasWeekly   = shiftRows && shiftRows.some(r => r.is_active)
  const availMode   = availRows?.[0]?.availability_type ?? null
  const isFlexible  = availMode === 'flexible'
  const isDateRange = availMode === 'date_range'

  // Build weekState from nurse_shifts
  const DOW_TO_KEY: Record<number, DayKey> = { 0:'sun',1:'mon',2:'tue',3:'wed',4:'thu',5:'fri',6:'sat' }
  const weekState = { ...emptyWeek }
  for (const row of shiftRows ?? []) {
    if (!row.is_active) continue
    const dayKey = DOW_TO_KEY[row.day_of_week]
    if (dayKey && ['morning','evening','night'].includes(row.shift)) {
      weekState[dayKey][row.shift as ShiftKey] = true
    }
  }

  if (isFlexible) return { mode: 'flexible', weekState, flexible: true, dateRange: null }

  if (isDateRange && availRows?.[0]) {
    const r = availRows[0]
    return {
      mode: 'date_range', weekState, flexible: false,
      dateRange: {
        startDate: r.start_date ?? '',
        endDate:   r.end_date   ?? '',
        shifts:    { morning: true, evening: false, night: false }, // default
      },
    }
  }

  if (hasWeekly) return { mode: 'weekly', weekState, flexible: false, dateRange: null }

  return { mode: null, weekState: emptyWeek, flexible: false, dateRange: null }
}

// ── Save shift schedule ────────────────────────────────────
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

// ── Save Date Range mode ───────────────────────────────────
export async function saveDateRangeSchedule(
  startDate: string,
  endDate:   string,
  shifts:    { morning: boolean; evening: boolean; night: boolean },
): Promise<{ success: boolean; message: string }> {
  const user    = await requireRole('provider')
  const service  = createSupabaseServiceRoleClient()

  if (!startDate || !endDate) return { success: false, message: 'Start and end dates are required' }
  if (startDate > endDate)    return { success: false, message: 'Start date must be before end date' }
  if (!shifts.morning && !shifts.evening && !shifts.night)
    return { success: false, message: 'Select at least one shift' }

  const { data: nurse } = await service.from('nurses').select('id').eq('user_id', user.id).single()
  if (!nurse) return { success: false, message: 'Nurse profile not found' }

  // Store in nurse_availability
  await service.from('nurse_availability').delete().eq('nurse_id', nurse.id)
  await service.from('nurse_availability').insert({
    nurse_id: nurse.id, availability_type: 'date_range',
    day_of_week: null, start_time: null, end_time: null,
    start_date: startDate, end_date: endDate,
  })

  // Disable nurse_shifts (weekly template)
  await service.from('nurse_shifts').update({ is_active: false }).eq('nurse_id', nurse.id)

  // Build shift_availability rows for the date range
  const today = new Date().toISOString().slice(0, 10)
  const rows: { nurse_id: string; date: string; shift: string; total_hours: number; booked_hours: number; status: string }[] = []

  const cur = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate   + 'T00:00:00')
  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10)
    if (dateStr >= today) {
      for (const shift of ['morning', 'evening', 'night'] as ShiftKey[]) {
        if (shifts[shift]) {
          rows.push({ nurse_id: nurse.id, date: dateStr, shift, total_hours: 8, booked_hours: 0, status: 'available' })
        }
      }
    }
    cur.setDate(cur.getDate() + 1)
  }

  if (rows.length > 0) {
    await service.from('shift_availability').upsert(rows, { onConflict: 'nurse_id,date,shift', ignoreDuplicates: true })
  }

  revalidatePath('/provider/availability')
  return { success: true, message: `Schedule saved for ${rows.length / Object.values(shifts).filter(Boolean).length} days` }
}
