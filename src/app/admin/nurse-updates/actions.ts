'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function approveUpdateRequest(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const requestId = formData.get('requestId') as string

  // Fetch the update request
  const { data: req, error } = await supabase
    .from('nurse_update_requests')
    .select('nurse_id, new_values')
    .eq('id', requestId)
    .single()

  if (error || !req) throw new Error('Update request not found')

  // Apply new values to nurses table
  await supabase
    .from('nurses')
    .update({
      ...req.new_values,
      status: 'approved',
    })
    .eq('id', req.nurse_id)

  // Mark request as approved
  await supabase
    .from('nurse_update_requests')
    .update({
      status:      'approved',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  revalidatePath('/admin/nurse-updates')
}

export async function rejectUpdateRequest(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const requestId = formData.get('requestId') as string

  // Fetch nurse_id to restore status
  const { data: req } = await supabase
    .from('nurse_update_requests')
    .select('nurse_id')
    .eq('id', requestId)
    .single()

  if (req) {
    // Restore nurse to approved (reject = keep current values, just unblock)
    await supabase
      .from('nurses')
      .update({ status: 'approved' })
      .eq('id', req.nurse_id)
  }

  await supabase
    .from('nurse_update_requests')
    .update({
      status:      'rejected',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  revalidatePath('/admin/nurse-updates')
}
