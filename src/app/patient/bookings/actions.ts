'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

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
