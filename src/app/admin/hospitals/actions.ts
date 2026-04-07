'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function approveHospitalAction(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const hospitalId = formData.get('hospitalId') as string

  const { error } = await supabase
    .from('hospitals')
    .update({
      status:       'approved',
      approved_by:  admin.id,
      approved_at:  new Date().toISOString(),
      reviewed_at:  new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', hospitalId)

  if (error) throw new Error(error.message)

  // Audit log
  await supabase.from('hospital_audit_log').insert({
    hospital_id: hospitalId,
    actor_id:    admin.id,
    actor_role:  'admin',
    action:      'admin_approved_hospital',
    details:     { approved_by: admin.full_name },
  })

  revalidatePath('/admin/hospitals')
  revalidatePath(`/admin/hospitals/${hospitalId}`)
}

export async function rejectHospitalAction(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const hospitalId = formData.get('hospitalId') as string
  const reason     = (formData.get('reason') as string)?.trim() || null

  await supabase
    .from('hospitals')
    .update({
      status:           'rejected',
      rejection_reason: reason,
      reviewed_at:      new Date().toISOString(),
    })
    .eq('id', hospitalId)

  await supabase.from('hospital_audit_log').insert({
    hospital_id: hospitalId,
    actor_id:    admin.id,
    actor_role:  'admin',
    action:      'admin_rejected_hospital',
    details:     { reason },
  })

  revalidatePath('/admin/hospitals')
  revalidatePath(`/admin/hospitals/${hospitalId}`)
}
