'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity'
import { requireRoleAction } from '@/lib/auth'

const REVALIDATE_PROVIDER = () => {
  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
}
const REVALIDATE_PATIENT = () => {
  revalidatePath('/patient/bookings')
  revalidatePath('/patient/dashboard')
}

export async function acceptBooking(requestId: string) {
  let user: { id: string }
  try { user = await requireRoleAction('provider') } catch { return }
  const userId = user.id

  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single(),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  // Only claim a booking that's still pending AND unassigned — prevents hijacking
  await serviceSupabase
    .from('booking_requests')
    .update({
      status:     'accepted',
      nurse_id:   userId,
      nurse_name: nurse?.full_name ?? '',
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .is('nurse_id', null)

  await serviceSupabase
    .from('nurses')
    .update({ is_available: false })
    .eq('user_id', userId)

  void logActivity({
    actorId: userId, actorName: nurse?.full_name ?? 'Nurse', actorRole: 'provider',
    action: 'booking_accepted', module: 'booking',
    entityType: 'booking', entityId: requestId,
    description: `Nurse ${nurse?.full_name ?? '—'} accepted booking from ${booking?.patient_name ?? '—'} for ${booking?.service_type ?? 'care'} on ${booking?.start_date ?? '—'}`,
    meta: { patient_name: booking?.patient_name, service_type: booking?.service_type, start_date: booking?.start_date },
  })

  REVALIDATE_PROVIDER()
  REVALIDATE_PATIENT()
}

export async function declineBooking(requestId: string) {
  let user: { id: string }
  try { user = await requireRoleAction('provider') } catch { return }
  const userId = user.id

  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single(),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  // Decline only a pending booking that was offered to this nurse (or open pool, i.e. nurse_id null OR this nurse)
  // We allow declining either an open pending booking or one already claimed by this nurse.
  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (error) console.error('[declineBooking]', error.message)

  void logActivity({
    actorId: userId, actorName: nurse?.full_name ?? 'Nurse', actorRole: 'provider',
    action: 'booking_declined', module: 'booking',
    entityType: 'booking', entityId: requestId,
    description: `Nurse ${nurse?.full_name ?? '—'} declined booking from ${booking?.patient_name ?? '—'} for ${booking?.service_type ?? 'care'} on ${booking?.start_date ?? '—'}`,
    meta: { patient_name: booking?.patient_name, service_type: booking?.service_type },
  })

  REVALIDATE_PROVIDER()
}

export async function markOnTheWay(requestId: string) {
  let user: { id: string }
  try { user = await requireRoleAction('provider') } catch { return }
  const userId = user.id

  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single(),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ status: 'on_the_way' })
    .eq('id', requestId)
    .eq('nurse_id', userId)
    .in('status', ['accepted', 'confirmed'])

  if (error) console.error('[markOnTheWay]', error.message)

  if (!error) {
    void logActivity({
      actorId: userId, actorName: nurse?.full_name ?? 'Nurse', actorRole: 'provider',
      action: 'booking_on_the_way', module: 'booking',
      entityType: 'booking', entityId: requestId,
      description: `Nurse ${nurse?.full_name ?? '—'} is on the way to ${booking?.patient_name ?? '—'} for ${booking?.service_type ?? 'care'}`,
      meta: { patient_name: booking?.patient_name, start_date: booking?.start_date },
    })
  }

  REVALIDATE_PROVIDER()
  revalidatePath('/patient/bookings')
}

export async function markWorkStarted(requestId: string) {
  let user: { id: string }
  try { user = await requireRoleAction('provider') } catch { return }
  const userId = user.id

  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single(),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ status: 'in_progress' })
    .eq('id', requestId)
    .eq('nurse_id', userId)
    .in('status', ['accepted', 'confirmed', 'on_the_way'])

  if (error) console.error('[markWorkStarted]', error.message)

  if (!error) {
    void logActivity({
      actorId: userId, actorName: nurse?.full_name ?? 'Nurse', actorRole: 'provider',
      action: 'booking_in_progress', module: 'booking',
      entityType: 'booking', entityId: requestId,
      description: `Nurse ${nurse?.full_name ?? '—'} started work for ${booking?.patient_name ?? '—'} — ${booking?.service_type ?? 'care'}`,
      meta: { patient_name: booking?.patient_name, service_type: booking?.service_type, start_date: booking?.start_date },
    })
  }

  REVALIDATE_PROVIDER()
  revalidatePath('/patient/bookings')
}

export async function markWorkDone(requestId: string) {
  let user: { id: string }
  try { user = await requireRoleAction('provider') } catch { return }
  const userId = user.id

  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single(),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  const { data: settings } = await serviceSupabase
    .from('platform_settings')
    .select('require_work_completion_confirmation, auto_complete_hours')
    .limit(1)
    .single()

  const requirePatient   = settings?.require_work_completion_confirmation ?? true
  const autoCompleteHours: number = (settings as { auto_complete_hours?: number } | null)?.auto_complete_hours ?? 24
  const newStatus = requirePatient ? 'work_done' : 'completed'

  const now = new Date()
  const autoConfirmAt = requirePatient && autoCompleteHours > 0
    ? new Date(now.getTime() + autoCompleteHours * 60 * 60 * 1000).toISOString()
    : null

  const updatePayload: Record<string, unknown> = {
    status:          newStatus,
    work_done_at:    now.toISOString(),
    auto_confirm_at: autoConfirmAt,
  }
  if (!requirePatient) {
    updatePayload.completed_at = now.toISOString()
  }

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update(updatePayload)
    .eq('id', requestId)
    .eq('nurse_id', userId)
    .eq('status', 'in_progress')

  if (error) console.error('[markWorkDone]', error.message)

  if (!error) {
    void logActivity({
      actorId: userId, actorName: nurse?.full_name ?? 'Nurse', actorRole: 'provider',
      action: 'booking_work_done', module: 'booking',
      entityType: 'booking', entityId: requestId,
      description: `Nurse ${nurse?.full_name ?? '—'} marked work done for ${booking?.patient_name ?? '—'} — ${booking?.service_type ?? 'care'}`,
      meta: { patient_name: booking?.patient_name, service_type: booking?.service_type, new_status: newStatus },
    })
  }

  REVALIDATE_PROVIDER()
  revalidatePath('/patient/bookings')
}

// Patient confirms the nurse's work-done flag. Despite living under provider/bookings/,
// this transitions work_done → completed and must be done by the patient who owns the booking.
export async function confirmWorkCompletion(requestId: string) {
  let user: { id: string }
  try { user = await requireRoleAction('patient') } catch { return }
  const userId = user.id

  const serviceSupabase = createSupabaseServiceRoleClient()

  const { data: booking } = await serviceSupabase
    .from('booking_requests')
    .select('patient_name, service_type, start_date, nurse_name, patient_id')
    .eq('id', requestId)
    .eq('patient_id', userId)
    .single()

  if (!booking) return

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('patient_id', userId)
    .eq('status', 'work_done')

  if (error) console.error('[confirmWorkCompletion]', error.message)

  if (!error) {
    void logActivity({
      actorId: userId, actorName: booking.patient_name ?? 'Patient', actorRole: 'patient',
      action: 'booking_completed', module: 'booking',
      entityType: 'booking', entityId: requestId,
      description: `Booking completed — Patient ${booking.patient_name ?? '—'} confirmed work by ${booking.nurse_name ?? '—'} — ${booking.service_type ?? 'care'} on ${booking.start_date ?? '—'}`,
      meta: { patient_name: booking.patient_name, service_type: booking.service_type, start_date: booking.start_date },
    })
  }

  REVALIDATE_PATIENT()
  REVALIDATE_PROVIDER()
}
