'use server'

import { createSupabaseServiceRoleClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

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

  const { data: nurse } = await serviceSupabase
    .from('nurses')
    .select('full_name')
    .eq('user_id', userId)
    .single()

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

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath('/patient/bookings')
  revalidatePath('/patient/dashboard')
}

export async function declineBooking(requestId: string) {
  const serviceSupabase = createSupabaseServiceRoleClient()

  await serviceSupabase
    .from('booking_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
}

export async function markWorkStarted(requestId: string) {
  const serviceSupabase = createSupabaseServiceRoleClient()

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ status: 'in_progress' })
    .eq('id', requestId)
    .in('status', ['accepted', 'confirmed'])

  if (error) console.error('[markWorkStarted]', error.message)

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath('/patient/bookings')
}

export async function markWorkDone(requestId: string) {
  const serviceSupabase = createSupabaseServiceRoleClient()

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

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({
      status:          newStatus,
      work_done_at:    now.toISOString(),
      auto_confirm_at: autoConfirmAt,
    })
    .eq('id', requestId)
    .eq('status', 'in_progress')

  if (error) console.error('[markWorkDone]', error.message)

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath('/patient/bookings')
}

export async function confirmWorkCompletion(requestId: string) {
  const userId = await getProviderUserId()
  const serviceSupabase = createSupabaseServiceRoleClient()

  const { error } = await serviceSupabase
    .from('booking_requests')
    .update({ status: 'completed' })
    .eq('id', requestId)
    .eq('status', 'work_done')

  if (error) console.error('[confirmWorkCompletion]', error.message)

  revalidatePath('/patient/bookings')
  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
}
