'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function toggleAvailability(isAvailable: boolean): Promise<{ error?: string }> {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('nurses')
    .update({ is_available: isAvailable })
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/provider/dashboard')
  return {}
}
