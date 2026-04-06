'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function acceptBooking(requestId: string) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const serviceSupabase = createSupabaseServiceRoleClient()

  // Get nurse's full name
  const { data: nurse } = await serviceSupabase
    .from('nurses')
    .select('full_name, user_id')
    .eq('user_id', user.id)
    .single()

  // Accept the booking and record which nurse accepted it
  await serviceSupabase
    .from('booking_requests')
    .update({
      status:     'accepted',
      nurse_id:   user.id,
      nurse_name: nurse?.full_name ?? user.full_name,
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  // Mark nurse as unavailable
  await serviceSupabase
    .from('nurses')
    .update({ is_available: false })
    .eq('user_id', user.id)

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath('/patient/bookings')
  revalidatePath('/patient/dashboard')
}

export async function declineBooking(requestId: string) {
  await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  await supabase
    .from('booking_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)

  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
}
