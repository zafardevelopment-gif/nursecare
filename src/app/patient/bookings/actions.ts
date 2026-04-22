'use server'

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendNotifications } from '@/lib/notifications'

const REVALIDATE = () => {
  revalidatePath('/patient/bookings')
  revalidatePath('/patient/dashboard')
  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath('/admin/bookings')
}

/* ── helpers ─────────────────────────────────────────────────── */

async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getAdminUserIds(): Promise<string[]> {
  const supabase = createSupabaseServiceRoleClient()
  const { data } = await supabase.from('users').select('id').eq('role', 'admin')
  return (data ?? []).map(r => r.id)
}

/* ── Cancel booking ─────────────────────────────────────────── */

export async function cancelBooking(requestId: string): Promise<{ error?: string }> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase = createSupabaseServiceRoleClient()

  const [{ data: booking }, { data: settings }] = await Promise.all([
    supabase
      .from('booking_requests')
      .select('id, status, start_date, shift, patient_id, nurse_id, nurse_name, service_type, patient_name')
      .eq('id', requestId)
      .single(),
    supabase.from('platform_settings').select('free_cancellation_hours').limit(1).single(),
  ])

  if (!booking)                    return { error: 'Booking not found' }
  if (booking.patient_id !== user.id) return { error: 'Not authorized' }

  const cancellable = ['pending', 'accepted', 'confirmed']
  if (!cancellable.includes(booking.status)) {
    return { error: 'Booking cannot be cancelled at this stage' }
  }

  const freeCancelHours: number = (settings as any)?.free_cancellation_hours ?? 24
  if (freeCancelHours > 0 && booking.start_date) {
    const SHIFT_H: Record<string, number> = { morning: 8, evening: 16, night: 0 }
    const sh = SHIFT_H[(booking.shift ?? '').toLowerCase()] ?? 0
    const shiftStart = new Date(`${booking.start_date}T${String(sh).padStart(2,'0')}:00:00`)
    const deadline   = new Date(shiftStart.getTime() - freeCancelHours * 60 * 60 * 1000)
    if (new Date() > deadline) {
      return { error: `Cancellation window has passed (must cancel at least ${freeCancelHours}h before shift start)` }
    }
  }

  const { error } = await supabase
    .from('booking_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return { error: error.message }

  // Notifications: patient confirmation + nurse alert + admin alert
  const notifs: Parameters<typeof sendNotifications>[0] = [
    {
      userId: user.id,
      type:   'booking_cancelled',
      title:  '✕ Booking Cancelled',
      body:   `Your booking for ${booking.service_type ?? 'nursing care'} on ${booking.start_date} has been cancelled.`,
      data:   { bookingId: requestId },
    },
  ]

  if (booking.nurse_id) {
    notifs.push({
      userId: booking.nurse_id,
      type:   'booking_cancelled',
      title:  '📋 Booking Cancelled',
      body:   `${booking.patient_name ?? 'A patient'} cancelled their booking for ${booking.service_type ?? 'care'} on ${booking.start_date}.`,
      data:   { bookingId: requestId },
    })
  }

  const adminIds = await getAdminUserIds()
  for (const adminId of adminIds) {
    notifs.push({
      userId: adminId,
      type:   'booking_cancelled',
      title:  '📋 Booking Cancelled',
      body:   `Patient ${booking.patient_name ?? '—'} cancelled booking for ${booking.service_type ?? 'care'} on ${booking.start_date}.`,
      data:   { bookingId: requestId },
    })
  }

  await sendNotifications(notifs)
  REVALIDATE()
  return {}
}

/* ── Mark payment done (simulated) ─────────────────────────── */

export async function markPaymentDone(requestId: string) {
  const supabase = createSupabaseServiceRoleClient()

  const { error } = await supabase
    .from('booking_requests')
    .update({ payment_status: 'paid' })
    .eq('id', requestId)

  if (error) console.error('[markPaymentDone]', error.message)
  REVALIDATE()
}

/* ── Submit reschedule request ──────────────────────────────── */

export async function submitRescheduleRequest(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase    = createSupabaseServiceRoleClient()
  const booking_id  = (formData.get('booking_id')  as string)?.trim()
  const reason      = (formData.get('reason')       as string)?.trim() || null
  const new_date    = (formData.get('new_date')      as string)?.trim() || null
  const new_shift   = (formData.get('new_shift')     as string)?.trim() || null

  if (!booking_id) return { error: 'Missing booking ID' }
  if (!new_date)   return { error: 'New date is required' }

  // B5: server-side date validation — fetch platform settings
  const [{ data: booking }, { data: rescheduleSettings }] = await Promise.all([
    supabase
      .from('booking_requests')
      .select('id, status, patient_id, nurse_id, nurse_name, service_type, patient_name, start_date')
      .eq('id', booking_id)
      .single(),
    supabase.from('platform_settings').select('min_advance_hours, max_advance_days').limit(1).single(),
  ])

  if (!booking)                       return { error: 'Booking not found' }
  if (booking.patient_id !== user.id) return { error: 'Not authorized' }

  // Validate new_date is a real future date respecting platform advance limits
  const minAdvanceHours: number = (rescheduleSettings as any)?.min_advance_hours ?? 2
  const maxAdvanceDays:  number = (rescheduleSettings as any)?.max_advance_days  ?? 30
  const now        = new Date()
  const newDateObj = new Date(new_date + 'T00:00:00')

  if (isNaN(newDateObj.getTime())) {
    return { error: 'Invalid date format' }
  }
  const diffMs  = newDateObj.getTime() - now.getTime()
  const minMs   = minAdvanceHours * 60 * 60 * 1000
  const maxMs   = maxAdvanceDays * 24 * 60 * 60 * 1000
  if (diffMs < minMs) {
    return { error: `Reschedule date must be at least ${minAdvanceHours} hour${minAdvanceHours !== 1 ? 's' : ''} from now.` }
  }
  if (diffMs > maxMs) {
    return { error: `Reschedule date cannot be more than ${maxAdvanceDays} days in advance.` }
  }

  // Validate shift value if provided
  const validShifts = ['morning', 'evening', 'night', '']
  if (new_shift && !validShifts.includes(new_shift)) {
    return { error: 'Invalid shift value' }
  }

  const reschedulable = ['pending', 'accepted', 'confirmed']
  if (!reschedulable.includes(booking.status)) {
    return { error: 'This booking cannot be rescheduled at this stage' }
  }

  // Block duplicate pending request
  const { count } = await supabase
    .from('booking_change_requests')
    .select('*', { count: 'exact', head: true })
    .eq('booking_id', booking_id)
    .eq('request_type', 'reschedule')
    .eq('status', 'pending')

  if (count && count > 0) {
    return { error: 'You already have a pending reschedule request for this booking' }
  }

  const { error } = await supabase.from('booking_change_requests').insert({
    booking_id,
    patient_id:   user.id,
    request_type: 'reschedule',
    reason,
    new_date,
    new_shift:    new_shift || null,
    status:       'pending',
  })

  if (error) return { error: error.message }

  // Notify nurse + admins
  const notifs: Parameters<typeof sendNotifications>[0] = []

  if (booking.nurse_id) {
    notifs.push({
      userId: booking.nurse_id,
      type:   'booking_change_requested',
      title:  '📅 Reschedule Request',
      body:   `${booking.patient_name ?? 'A patient'} requested to reschedule their ${booking.service_type ?? 'booking'} from ${booking.start_date} to ${new_date}.`,
      data:   { bookingId: booking_id },
    })
  }

  const adminIds = await getAdminUserIds()
  for (const adminId of adminIds) {
    notifs.push({
      userId: adminId,
      type:   'booking_change_requested',
      title:  '📅 Reschedule Request',
      body:   `Patient ${booking.patient_name ?? '—'} requested reschedule from ${booking.start_date} → ${new_date}. Booking: ${booking.service_type ?? '—'}.`,
      data:   { bookingId: booking_id },
    })
  }

  if (notifs.length) await sendNotifications(notifs)

  revalidatePath(`/patient/bookings/${booking_id}`)
  revalidatePath('/patient/bookings')
  revalidatePath('/admin/bookings')
  return {}
}

/* ── Submit cancel request (soft — goes to admin review) ────── */

export async function submitCancelRequest(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase   = createSupabaseServiceRoleClient()
  const booking_id = (formData.get('booking_id') as string)?.trim()
  const reason     = (formData.get('reason')      as string)?.trim() || null

  if (!booking_id) return { error: 'Missing booking ID' }

  const { data: booking } = await supabase
    .from('booking_requests')
    .select('id, status, patient_id, nurse_id, nurse_name, service_type, patient_name, start_date')
    .eq('id', booking_id)
    .single()

  if (!booking)                       return { error: 'Booking not found' }
  if (booking.patient_id !== user.id) return { error: 'Not authorized' }

  const requestable = ['pending', 'accepted', 'confirmed', 'in_progress']
  if (!requestable.includes(booking.status)) {
    return { error: 'Cannot request cancellation at this stage' }
  }

  // Block duplicate pending
  const { count } = await supabase
    .from('booking_change_requests')
    .select('*', { count: 'exact', head: true })
    .eq('booking_id', booking_id)
    .eq('request_type', 'cancel')
    .eq('status', 'pending')

  if (count && count > 0) {
    return { error: 'You already have a pending cancellation request for this booking' }
  }

  const { error } = await supabase.from('booking_change_requests').insert({
    booking_id,
    patient_id:   user.id,
    request_type: 'cancel',
    reason,
    status:       'pending',
  })

  if (error) return { error: error.message }

  const notifs: Parameters<typeof sendNotifications>[0] = []

  if (booking.nurse_id) {
    notifs.push({
      userId: booking.nurse_id,
      type:   'booking_change_requested',
      title:  '⚠️ Cancellation Requested',
      body:   `${booking.patient_name ?? 'A patient'} has requested to cancel their booking for ${booking.service_type ?? 'care'} on ${booking.start_date}. Awaiting admin review.`,
      data:   { bookingId: booking_id },
    })
  }

  const adminIds = await getAdminUserIds()
  for (const adminId of adminIds) {
    notifs.push({
      userId: adminId,
      type:   'booking_change_requested',
      title:  '⚠️ Cancellation Requested',
      body:   `Patient ${booking.patient_name ?? '—'} requested cancellation of ${booking.service_type ?? 'booking'} on ${booking.start_date}. Requires admin review.`,
      data:   { bookingId: booking_id },
    })
  }

  if (notifs.length) await sendNotifications(notifs)

  revalidatePath(`/patient/bookings/${booking_id}`)
  revalidatePath('/patient/bookings')
  revalidatePath('/admin/bookings')
  return {}
}
