'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ── Calendar data types ───────────────────────────────────
export type CalendarBooking = {
  id: string
  booking_ref: string
  start_date: string
  end_date: string
  shift: string
  status: string
  patient_name: string | null
  service_type: string | null
  duration_hours: number | null
}

export type CalendarDayData = {
  date: string            // YYYY-MM-DD
  availableHours: number  // 0 = not available
  isFlexible: boolean
  bookings: CalendarBooking[]
  bookedHours: number
}

export async function loadCalendarData(year: number, month: number): Promise<CalendarDayData[]> {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!nurse) return []

  // Date range for this month
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  const startStr = firstDay.toISOString().slice(0, 10)
  const endStr   = lastDay.toISOString().slice(0, 10)

  // Fetch availability config
  const { data: availRows } = await supabase
    .from('nurse_availability')
    .select('availability_type, day_of_week, start_time, end_time, start_date, end_date')
    .eq('nurse_id', nurse.id)

  // Fetch bookings for this month (accepted/confirmed/in_progress/completed)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_ref, start_date, end_date, shift, status, patient_name, service_type, duration_hours')
    .eq('nurse_id', user.id)
    .in('status', ['accepted', 'confirmed', 'in_progress', 'completed'])
    .lte('start_date', endStr)
    .gte('end_date', startStr)

  const mode = availRows?.[0]?.availability_type ?? null
  const days: CalendarDayData[] = []

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    const dow = d.getDay() // 0=Sun

    // Calculate available hours for this day
    let availableHours = 0
    let isFlexible = false

    if (mode === 'flexible') {
      availableHours = 24
      isFlexible = true
    } else if (mode === 'weekly' && availRows) {
      for (const row of availRows) {
        if (row.day_of_week === dow && row.start_time && row.end_time) {
          const [sh, sm] = row.start_time.split(':').map(Number)
          const [eh, em] = row.end_time.split(':').map(Number)
          availableHours += (eh * 60 + em - sh * 60 - sm) / 60
        }
      }
    } else if (mode === 'date_range' && availRows?.[0]) {
      const r = availRows[0]
      if (r.start_date && r.end_date && dateStr >= r.start_date && dateStr <= r.end_date) {
        if (r.start_time && r.end_time) {
          const [sh, sm] = r.start_time.split(':').map(Number)
          const [eh, em] = r.end_time.split(':').map(Number)
          availableHours = (eh * 60 + em - sh * 60 - sm) / 60
        } else {
          availableHours = 24
          isFlexible = true
        }
      }
    }

    // Bookings that cover this date
    const dayBookings: CalendarBooking[] = (bookings ?? []).filter(b =>
      b.start_date <= dateStr && b.end_date >= dateStr
    )

    const SHIFT_HOURS: Record<string, number> = {
      morning: 6, evening: 6, night: 8, full_day: 12,
    }
    const bookedHours = dayBookings.reduce((sum, b) => {
      return sum + (b.duration_hours ?? SHIFT_HOURS[b.shift] ?? 6)
    }, 0)

    days.push({ date: dateStr, availableHours, isFlexible, bookings: dayBookings, bookedHours })
  }

  return days
}

// Maps UI DayKey to day_of_week integer (0=Sunday)
const DAY_OF_WEEK: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

type Slot = { start: string; end: string }

type WeeklyPayload = {
  mode: 'weekly'
  days: Record<string, { available: boolean; slots: Slot[] }>
}

type FlexiblePayload = {
  mode: 'flexible'
}

type RangePayload = {
  mode: 'date_range'
  startDate: string
  endDate: string
  startTime: string
  endTime: string
}

type SavePayload = WeeklyPayload | FlexiblePayload | RangePayload

function toMins(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function validatePayload(payload: SavePayload): string | null {
  if (payload.mode === 'weekly') {
    for (const [dayKey, state] of Object.entries(payload.days)) {
      if (!state.available) continue
      const slots = state.slots
      for (const slot of slots) {
        if (toMins(slot.start) >= toMins(slot.end)) {
          return `${dayKey.toUpperCase()}: start time must be before end time (${slot.start} – ${slot.end})`
        }
      }
      // Check for overlapping slots within the same day
      const sorted = [...slots].sort((a, b) => toMins(a.start) - toMins(b.start))
      for (let i = 1; i < sorted.length; i++) {
        if (toMins(sorted[i].start) < toMins(sorted[i - 1].end)) {
          return `${dayKey.toUpperCase()}: time slots overlap (${sorted[i - 1].start}–${sorted[i - 1].end} and ${sorted[i].start}–${sorted[i].end})`
        }
      }
    }
  }

  if (payload.mode === 'date_range') {
    if (!payload.startDate || !payload.endDate) {
      return 'Please select both start and end dates'
    }
    if (payload.startDate > payload.endDate) {
      return 'Start date must be on or before end date'
    }
    if (toMins(payload.startTime) >= toMins(payload.endTime)) {
      return 'Start time must be before end time'
    }
  }

  return null
}

export async function saveAvailability(payload: SavePayload): Promise<{ success: boolean; message: string }> {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  // Get nurse record for this user
  const { data: nurse, error: nurseError } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (nurseError || !nurse) {
    return { success: false, message: 'Nurse profile not found' }
  }

  // Validate
  const validationError = validatePayload(payload)
  if (validationError) {
    return { success: false, message: validationError }
  }

  // Delete existing availability for this nurse
  const { error: deleteError } = await supabase
    .from('nurse_availability')
    .delete()
    .eq('nurse_id', nurse.id)

  if (deleteError) {
    return { success: false, message: 'Failed to clear previous availability' }
  }

  // Build rows to insert
  const rows: {
    nurse_id: string
    availability_type: string
    day_of_week?: number | null
    start_time?: string | null
    end_time?: string | null
    start_date?: string | null
    end_date?: string | null
  }[] = []

  if (payload.mode === 'flexible') {
    rows.push({
      nurse_id: nurse.id,
      availability_type: 'flexible',
      day_of_week: null,
      start_time: null,
      end_time: null,
      start_date: null,
      end_date: null,
    })
  } else if (payload.mode === 'weekly') {
    for (const [dayKey, state] of Object.entries(payload.days)) {
      if (!state.available || state.slots.length === 0) continue
      const dow = DAY_OF_WEEK[dayKey]
      for (const slot of state.slots) {
        rows.push({
          nurse_id: nurse.id,
          availability_type: 'weekly',
          day_of_week: dow,
          start_time: slot.start,
          end_time: slot.end,
          start_date: null,
          end_date: null,
        })
      }
    }
  } else if (payload.mode === 'date_range') {
    rows.push({
      nurse_id: nurse.id,
      availability_type: 'date_range',
      day_of_week: null,
      start_time: payload.startTime,
      end_time: payload.endTime,
      start_date: payload.startDate,
      end_date: payload.endDate,
    })
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from('nurse_availability')
      .insert(rows)

    if (insertError) {
      return { success: false, message: insertError.message }
    }
  }

  revalidatePath('/provider/availability')
  return { success: true, message: 'Availability saved successfully' }
}

export async function loadAvailability(): Promise<{
  mode: 'weekly' | 'flexible' | 'date_range' | null
  rows: {
    availability_type: string
    day_of_week: number | null
    start_time: string | null
    end_time: string | null
    start_date: string | null
    end_date: string | null
  }[]
}> {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!nurse) return { mode: null, rows: [] }

  const { data: rows } = await supabase
    .from('nurse_availability')
    .select('availability_type, day_of_week, start_time, end_time, start_date, end_date')
    .eq('nurse_id', nurse.id)
    .order('day_of_week', { ascending: true })

  if (!rows || rows.length === 0) return { mode: null, rows: [] }

  const mode = rows[0].availability_type as 'weekly' | 'flexible' | 'date_range'
  return { mode, rows }
}
