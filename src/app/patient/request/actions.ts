'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

// Generate all dates for a recurring booking
function generateDates(
  bookingType: string,
  startDate: string,
  endDate: string | null,
  daysOfWeek: number[],
): string[] {
  const dates: string[] = []
  const start = new Date(startDate + 'T00:00:00')

  if (bookingType === 'one_time') {
    return [startDate]
  }

  if (!endDate) return [startDate]
  const end = new Date(endDate + 'T00:00:00')

  if (bookingType === 'weekly') {
    // Walk day-by-day from start to end, collect matching days
    const cur = new Date(start)
    while (cur <= end) {
      if (daysOfWeek.includes(cur.getDay())) {
        dates.push(cur.toISOString().split('T')[0])
      }
      cur.setDate(cur.getDate() + 1)
    }
  }

  if (bookingType === 'monthly') {
    // Same day-of-month each month
    const dayOfMonth = start.getDate()
    const cur = new Date(start)
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0])
      // Advance to next month, same day
      cur.setMonth(cur.getMonth() + 1)
      cur.setDate(dayOfMonth)
    }
  }

  return dates
}

export async function createBookingAction(formData: FormData) {
  const user = await requireRole('patient')
  const supabase = await createSupabaseServerClient()

  const service_type      = formData.get('service_type') as string
  const patient_condition = formData.get('patient_condition') as string
  const shift             = formData.get('shift') as string
  const duration          = parseInt(formData.get('duration') as string) || 8
  const city              = formData.get('city') as string
  const address           = formData.get('address') as string
  const notes             = formData.get('notes') as string
  const booking_type      = formData.get('booking_type') as string
  const start_date        = formData.get('start_date') as string
  const end_date          = formData.get('end_date') as string || null
  const days_raw          = formData.getAll('days_of_week') as string[]
  const days_of_week      = days_raw.map(Number)

  // Validate
  if (!start_date) {
    redirect(`/patient/request?error=Start+date+is+required`)
  }
  if ((booking_type === 'weekly' || booking_type === 'monthly') && !end_date) {
    redirect(`/patient/request?error=End+date+required+for+recurring+bookings`)
  }
  if (booking_type === 'weekly' && days_of_week.length === 0) {
    redirect(`/patient/request?error=Select+at+least+one+day+for+weekly+bookings`)
  }

  const dates = generateDates(booking_type, start_date, end_date, days_of_week)

  if (dates.length === 0) {
    redirect(`/patient/request?error=No+valid+dates+found+for+selected+range+and+days`)
  }
  if (dates.length > 60) {
    redirect(`/patient/request?error=Too+many+sessions+(max+60).+Shorten+the+date+range.`)
  }

  // 1. Create the parent booking_request
  const { data: request, error: reqError } = await supabase
    .from('booking_requests')
    .insert({
      patient_id:        user.id,
      patient_name:      user.full_name,
      patient_email:     user.email,
      service_type,
      patient_condition,
      shift,
      duration_hours:    duration,
      city,
      address,
      notes,
      booking_type,
      start_date,
      end_date:          end_date || start_date,
      days_of_week:      days_of_week.length ? days_of_week : null,
      total_sessions:    dates.length,
      status:            'pending',
    })
    .select('id')
    .single()

  if (reqError || !request) {
    redirect(`/patient/request?error=${encodeURIComponent(reqError?.message ?? 'Failed to create request')}`)
  }

  // 2. Create individual booking records for each date
  const bookingRows = dates.map((date, i) => ({
    patient_id:         user.id,
    patient_name:       user.full_name,
    patient_email:      user.email,
    booking_request_id: request.id,
    session_number:     i + 1,
    service_type,
    patient_condition,
    date,
    shift,
    duration_hours:     duration,
    city,
    address,
    notes,
    status:             'pending',
  }))

  const { error: bookingsError } = await supabase.from('bookings').insert(bookingRows)

  if (bookingsError) {
    // Rollback the request
    await supabase.from('booking_requests').delete().eq('id', request.id)
    redirect(`/patient/request?error=${encodeURIComponent(bookingsError.message)}`)
  }

  redirect(`/patient/bookings?message=${encodeURIComponent(`${dates.length} session${dates.length > 1 ? 's' : ''} booked successfully`)}`)
}
