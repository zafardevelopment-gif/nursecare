'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logActivity } from '@/lib/activity'

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

  const { data: hosp } = await supabase.from('hospitals').select('hospital_name').eq('id', hospitalId).single()
  await logActivity({
    actorId: admin.id, actorName: admin.full_name, actorRole: 'admin',
    action: 'hospital_approved', entityType: 'hospital', entityId: hospitalId,
    description: `Admin approved hospital: ${hosp?.hospital_name ?? hospitalId}`,
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

  const { data: hosp } = await supabase.from('hospitals').select('hospital_name').eq('id', hospitalId).single()
  await logActivity({
    actorId: admin.id, actorName: admin.full_name, actorRole: 'admin',
    action: 'hospital_rejected', entityType: 'hospital', entityId: hospitalId,
    description: `Admin rejected hospital: ${hosp?.hospital_name ?? hospitalId}${reason ? ' — Reason: ' + reason : ''}`,
    meta: { reason },
  })

  revalidatePath('/admin/hospitals')
  revalidatePath(`/admin/hospitals/${hospitalId}`)
}
