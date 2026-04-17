'use server'

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function cancelBooking(requestId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const serviceSupabase = createSupabaseServiceRoleClient()

  // Get booking + cancellation hours setting together
  const [{ data: booking }, { data: settings }] = await Promise.all([
    serviceSupabase.from('booking_requests').select('id, status, start_date, shift, patient_id').eq('id', requestId).single(),
    serviceSupabase.from('platform_settings').select('free_cancellation_hours').limit(1).single(),
  ])

  if (!booking) return { error: 'Booking not found' }
  if (booking.patient_id !== user.id) return { error: 'Not authorized' }

  const cancellableStatuses = ['pending', 'accepted', 'confirmed']
  if (!cancellableStatuses.includes(booking.status)) return { error: 'Booking cannot be cancelled at this stage' }

  // Check if within cancellation window
  const freeCancelHours: number = (settings as any)?.free_cancellation_hours ?? 24
  if (freeCancelHours > 0 && booking.start_date) {
    const SHIFT_HOURS: Record<string, number> = { morning: 8, evening: 16, night: 0 }
    const shiftHour = SHIFT_HOURS[booking.shift?.toLowerCase() ?? ''] ?? 0
    const shiftStart = new Date(`${booking.start_date}T${String(shiftHour).padStart(2, '0')}:00:00`)
    const cancelDeadline = new Date(shiftStart.getTime() - freeCancelHours * 60 * 60 * 1000)
    if (new Date() > cancelDeadline) {
      return { error: `Cancellation window has passed (must cancel at least ${freeCancelHours}h before shift start)` }
    }
  }

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath('/patient/bookings')
  revalidatePath('/patient/dashboard')
  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  return {}
}

export async function markPaymentDone(requestId: string) {
  const serviceSupabase = createSupabaseServiceRoleClient()

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ payment_status: 'paid' })
    .eq('id', requestId)

  if (error) console.error('[markPaymentDone]', error.message)

  revalidatePath('/patient/bookings')
  revalidatePath('/admin/bookings')
}
