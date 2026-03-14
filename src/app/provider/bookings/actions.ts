'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function acceptBooking(bookingId: string) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  await supabase
    .from('bookings')
    .update({
      status:     'accepted',
      nurse_id:   user.id,
      nurse_name: user.full_name,
    })
    .eq('id', bookingId)
    .eq('status', 'pending') // safety: only accept pending ones

  revalidatePath('/provider/bookings')
}

export async function declineBooking(bookingId: string) {
  await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  await supabase
    .from('bookings')
    .update({ status: 'declined' })
    .eq('id', bookingId)

  revalidatePath('/provider/bookings')
}
