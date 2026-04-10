'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { recalcShiftAvailability } from '@/app/provider/availability/actions'
import type { ShiftKey } from '@/app/provider/availability/shiftConstants'
import { sendNotifications } from '@/lib/notifications'

// Generate all dates for a recurring booking
function generateDates(
  bookingType: string,
  startDate: string,
  endDate: string | null,
  daysOfWeek: number[],
): string[] {
  const start = new Date(startDate + 'T00:00:00')

  if (bookingType === 'one_time') return [startDate]
  if (!endDate) return [startDate]

  const end = new Date(endDate + 'T00:00:00')
  const dates: string[] = []

  if (bookingType === 'weekly') {
    const cur = new Date(start)
    while (cur <= end) {
      if (daysOfWeek.includes(cur.getDay())) {
        dates.push(cur.toISOString().split('T')[0])
      }
      cur.setDate(cur.getDate() + 1)
    }
  }

  if (bookingType === 'monthly') {
    const dayOfMonth = start.getDate()
    const cur = new Date(start)
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0])
      cur.setMonth(cur.getMonth() + 1)
      cur.setDate(dayOfMonth)
    }
  }

  return dates
}

export async function submitBookingAction(formData: FormData): Promise<{ bookingRef?: string; sessions?: number; error?: string }> {
  try {
  // User info passed from client component (already authenticated at page load)
  const userId    = (formData.get('user_id')    as string) || ''
  const userName  = (formData.get('user_name')  as string) || ''
  const userEmail = (formData.get('user_email') as string) || ''

  if (!userId) {
    return { error: 'Missing user information. Please refresh the page.' }
  }

  const supabase = createSupabaseServiceRoleClient()

  // Fetch payment deadline setting
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('payment_deadline_hours')
    .limit(1)
    .single()
  const paymentDeadlineHours: number = settings?.payment_deadline_hours ?? 24

  // Read form fields
  const service_type      = (formData.get('service_type')      as string) || ''
  const patient_condition = (formData.get('patient_condition')  as string) || ''
  const shift             = (formData.get('shift')              as string) || 'Morning (8AM–4PM)'
  const city              = (formData.get('city')               as string) || ''
  const address           = (formData.get('address')            as string) || ''
  const notes             = (formData.get('notes')              as string) || ''
  const start_date        = (formData.get('start_date')         as string) || ''
  const end_date          = (formData.get('end_date')           as string) || ''
  const booking_type      = (formData.get('booking_type')       as string) || 'one_time'
  const nurse_user_id     = (formData.get('nurse_id')           as string) || ''
  const nurse_name        = (formData.get('nurse_name')         as string) || ''
  const duration          = parseInt(formData.get('duration')   as string) || 8
  const days_raw          = formData.getAll('days_of_week') as string[]
  const days_of_week      = days_raw.map(Number)

  if (!start_date)   return { error: 'Start date is required' }
  if (!service_type) return { error: 'Service type is required' }
  if (!city)         return { error: 'City is required' }
  if ((booking_type === 'weekly' || booking_type === 'monthly') && !end_date) {
    return { error: 'End date is required for recurring bookings' }
  }
  if (booking_type === 'weekly' && days_of_week.length === 0) {
    return { error: 'Select at least one day for weekly bookings' }
  }

  // Generate dates
  const dates = generateDates(booking_type, start_date, end_date || null, days_of_week)
  if (dates.length === 0) return { error: 'No valid dates for the selected range' }
  if (dates.length > 60)  return { error: 'Too many sessions (max 60). Shorten the date range.' }

  // Insert parent booking_request
  const { data: request, error: reqErr } = await supabase
    .from('booking_requests')
    .insert({
      patient_id:        userId,
      patient_name:      userName,
      patient_email:     userEmail,
      service_type,
      patient_condition: patient_condition || null,
      shift,
      duration_hours:    duration,
      city,
      address:           address || null,
      notes:             notes || null,
      booking_type,
      start_date,
      end_date:          end_date || start_date,
      days_of_week:      days_of_week.length ? days_of_week : null,
      total_sessions:    dates.length,
      nurse_id:          nurse_user_id || null,
      nurse_name:        nurse_name    || null,
      status:            'pending',
      payment_status:    'unpaid',
      payment_deadline_at: paymentDeadlineHours > 0
        ? new Date(Date.now() + paymentDeadlineHours * 60 * 60 * 1000).toISOString()
        : null,
    })
    .select('id')
    .single()

  if (reqErr || !request) {
    console.error('[submitBooking] booking_requests error:', reqErr?.message, reqErr?.details)
    return { error: reqErr?.message ?? 'Failed to create booking request' }
  }

  // Write shift_bookings for each date (if a nurse was selected)
  if (nurse_user_id) {
    // Get nurse's internal id
    const { data: nurseRow } = await supabase
      .from('nurses')
      .select('id')
      .eq('user_id', nurse_user_id)
      .single()

    if (nurseRow) {
      // Determine shift boundaries
      const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
        morning:            { start: '08:00:00', end: '16:00:00' },
        evening:            { start: '16:00:00', end: '00:00:00' },
        night:              { start: '00:00:00', end: '08:00:00' },
        'morning (8am–4pm)':{ start: '08:00:00', end: '16:00:00' },
        'evening (4pm–12am)':{ start: '16:00:00', end: '00:00:00' },
        'night (12am–8am)': { start: '00:00:00', end: '08:00:00' },
      }
      const shiftKey  = shift.toLowerCase() as string
      const shiftTimes = SHIFT_TIMES[shiftKey] ?? SHIFT_TIMES['morning']
      const shiftNorm  = shiftKey.startsWith('morning') ? 'morning'
                       : shiftKey.startsWith('evening') ? 'evening'
                       : shiftKey.startsWith('night')   ? 'night'
                       : 'morning'

      const shiftBookingRows = dates.map(date => ({
        nurse_id:          nurseRow.id,
        patient_id:        userId,
        patient_name:      userName,
        booking_request_id: request.id,
        date,
        shift:             shiftNorm,
        start_time:        shiftTimes.start,
        end_time:          shiftTimes.end,
        booked_hours:      duration,
        booking_type:      'patient',
        status:            'pending',
      }))

      await supabase.from('shift_bookings').insert(shiftBookingRows)

      // Recalculate shift_availability for each date
      for (const date of dates) {
        await recalcShiftAvailability(nurseRow.id, date, shiftNorm as ShiftKey)
      }
    }
  }

  // Send notifications
  const deadlineFmt = paymentDeadlineHours > 0
    ? ` Please complete payment within ${paymentDeadlineHours} hour${paymentDeadlineHours !== 1 ? 's' : ''} to confirm your booking.`
    : ''

  const notifPayloads = [
    {
      userId: userId,
      type: 'payment_reminder' as const,
      title: '📋 Booking Submitted',
      body: `Your booking for ${nurse_name || 'a nurse'} on ${start_date} has been submitted.${deadlineFmt}`,
      data: { bookingId: request.id, deadlineHours: paymentDeadlineHours },
    },
  ]

  if (nurse_user_id) {
    notifPayloads.push({
      userId: nurse_user_id,
      type: 'booking_accepted' as const,
      title: '🔔 New Booking Request',
      body: `You have a new booking request from ${userName} for ${start_date}. Awaiting payment confirmation.`,
      data: { bookingId: request.id },
    })
  }

  await sendNotifications(notifPayloads)

  return { bookingRef: request.id, sessions: dates.length }
  } catch (e: any) {
    console.error('[submitBooking] unexpected error:', e?.message, e?.stack)
    return { error: e?.message ?? 'Unexpected error. Please try again.' }
  }
}
