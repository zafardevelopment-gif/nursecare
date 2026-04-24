'use server'

import { createSupabaseServiceRoleClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity'

async function getProviderUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function acceptBooking(requestId: string) {
  const userId = await getProviderUserId()
  if (!userId) return

  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single(),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  await serviceSupabase
    .from('booking_requests')
    .update({
      status:     'accepted',
      nurse_id:   userId,
      nurse_name: nurse?.full_name ?? '',
    })
    .eq('id', requestId)
    .eq('status', 'pending')

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

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath('/patient/bookings')
  revalidatePath('/patient/dashboard')
}

export async function declineBooking(requestId: string) {
  const userId = await getProviderUserId()
  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    userId ? serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single() : Promise.resolve({ data: null }),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  await serviceSupabase
    .from('booking_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)

  if (userId) {
    void logActivity({
      actorId: userId, actorName: nurse?.full_name ?? 'Nurse', actorRole: 'provider',
      action: 'booking_declined', module: 'booking',
      entityType: 'booking', entityId: requestId,
      description: `Nurse ${nurse?.full_name ?? '—'} declined booking from ${booking?.patient_name ?? '—'} for ${booking?.service_type ?? 'care'} on ${booking?.start_date ?? '—'}`,
      meta: { patient_name: booking?.patient_name, service_type: booking?.service_type },
    })
  }

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
}

export async function markOnTheWay(requestId: string) {
  const userId = await getProviderUserId()
  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    userId ? serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single() : Promise.resolve({ data: null }),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ status: 'on_the_way' })
    .eq('id', requestId)
    .in('status', ['accepted', 'confirmed'])

  if (error) console.error('[markOnTheWay]', error.message)

  if (userId && !error) {
    void logActivity({
      actorId: userId, actorName: nurse?.full_name ?? 'Nurse', actorRole: 'provider',
      action: 'booking_on_the_way', module: 'booking',
      entityType: 'booking', entityId: requestId,
      description: `Nurse ${nurse?.full_name ?? '—'} is on the way to ${booking?.patient_name ?? '—'} for ${booking?.service_type ?? 'care'}`,
      meta: { patient_name: booking?.patient_name, start_date: booking?.start_date },
    })
  }

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath('/patient/bookings')
}

export async function markWorkStarted(requestId: string) {
  const userId = await getProviderUserId()
  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    userId ? serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single() : Promise.resolve({ data: null }),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ status: 'in_progress' })
    .eq('id', requestId)
    .in('status', ['accepted', 'confirmed', 'on_the_way'])

  if (error) console.error('[markWorkStarted]', error.message)

  if (userId && !error) {
    void logActivity({
      actorId: userId, actorName: nurse?.full_name ?? 'Nurse', actorRole: 'provider',
      action: 'booking_in_progress', module: 'booking',
      entityType: 'booking', entityId: requestId,
      description: `Nurse ${nurse?.full_name ?? '—'} started work for ${booking?.patient_name ?? '—'} — ${booking?.service_type ?? 'care'}`,
      meta: { patient_name: booking?.patient_name, service_type: booking?.service_type, start_date: booking?.start_date },
    })
  }

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath('/patient/bookings')
}

export async function markWorkDone(requestId: string) {
  const userId = await getProviderUserId()
  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    userId ? serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single() : Promise.resolve({ data: null }),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  const { data: settings } = await serviceSupabase
    .from('platform_settings')
    .select('require_work_completion_confirmation, auto_complete_hours')
    .limit(1)
    .single()

  const requirePatient   = settings?.require_work_completion_confirmation ?? true
  const autoCompleteHours: number = (settings as any)?.auto_complete_hours ?? 24
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
  // Stamp completed_at immediately if no patient confirmation required
  if (!requirePatient) {
    updatePayload.completed_at = now.toISOString()
  }

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update(updatePayload)
    .eq('id', requestId)
    .eq('status', 'in_progress')

  if (error) console.error('[markWorkDone]', error.message)

  if (userId && !error) {
    void logActivity({
      actorId: userId, actorName: nurse?.full_name ?? 'Nurse', actorRole: 'provider',
      action: 'booking_work_done', module: 'booking',
      entityType: 'booking', entityId: requestId,
      description: `Nurse ${nurse?.full_name ?? '—'} marked work done for ${booking?.patient_name ?? '—'} — ${booking?.service_type ?? 'care'}`,
      meta: { patient_name: booking?.patient_name, service_type: booking?.service_type, new_status: newStatus },
    })
  }

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath('/patient/bookings')
}

export async function confirmWorkCompletion(requestId: string) {
  const userId = await getProviderUserId()
  const serviceSupabase = createSupabaseServiceRoleClient()

  const [{ data: nurse }, { data: booking }] = await Promise.all([
    userId ? serviceSupabase.from('nurses').select('full_name').eq('user_id', userId).single() : Promise.resolve({ data: null }),
    serviceSupabase.from('booking_requests').select('patient_name, service_type, start_date').eq('id', requestId).single(),
  ])

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'work_done')

  if (error) console.error('[confirmWorkCompletion]', error.message)

  if (userId && !error) {
    void logActivity({
      actorId: userId, actorName: nurse?.full_name ?? 'Nurse', actorRole: 'provider',
      action: 'booking_completed', module: 'booking',
      entityType: 'booking', entityId: requestId,
      description: `Booking completed — Nurse ${nurse?.full_name ?? '—'} / Patient ${booking?.patient_name ?? '—'} — ${booking?.service_type ?? 'care'} on ${booking?.start_date ?? '—'}`,
      meta: { patient_name: booking?.patient_name, service_type: booking?.service_type, start_date: booking?.start_date },
    })
  }

  revalidatePath('/patient/bookings')
  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
}
