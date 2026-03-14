'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function approveNurse(nurseId: string) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  await supabase
    .from('nurses')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', nurseId)

  revalidatePath('/admin/nurses')
}

export async function rejectNurse(nurseId: string) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  await supabase
    .from('nurses')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', nurseId)

  revalidatePath('/admin/nurses')
}
