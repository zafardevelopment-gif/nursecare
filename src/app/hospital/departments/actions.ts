'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

async function getHospitalId(userId: string) {
  const supabase = createSupabaseServiceRoleClient()
  const { data } = await supabase
    .from('hospitals')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data?.id ?? null
}

export async function addDepartmentAction(formData: FormData) {
  const user = await requireRole('hospital')
  const hospitalId = await getHospitalId(user.id)
  if (!hospitalId) return { error: 'Hospital not found' }

  const name   = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Department name is required' }

  const supabase = createSupabaseServiceRoleClient()
  const { error } = await supabase.from('hospital_departments').insert({
    hospital_id:     hospitalId,
    name,
    icon:            (formData.get('icon') as string) || '🏥',
    color:           (formData.get('color') as string) || '#0E7B8C',
    bg_color:        (formData.get('bg_color') as string) || '#E8F4FD',
    department_head: (formData.get('department_head') as string) || null,
    total_beds:      parseInt(formData.get('total_beds') as string) || 0,
    nurses_needed:   parseInt(formData.get('nurses_needed') as string) || 0,
    nurses_active:   0,
    status:          'active',
  })

  if (error) return { error: error.message }
  revalidatePath('/hospital/departments')
  return { success: true }
}

export async function updateDepartmentAction(formData: FormData) {
  const user = await requireRole('hospital')
  const hospitalId = await getHospitalId(user.id)
  if (!hospitalId) return { error: 'Hospital not found' }

  const id   = formData.get('id') as string
  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Department name is required' }

  const supabase = createSupabaseServiceRoleClient()
  const { error } = await supabase
    .from('hospital_departments')
    .update({
      name,
      icon:            (formData.get('icon') as string) || '🏥',
      color:           (formData.get('color') as string) || '#0E7B8C',
      bg_color:        (formData.get('bg_color') as string) || '#E8F4FD',
      department_head: (formData.get('department_head') as string) || null,
      total_beds:      parseInt(formData.get('total_beds') as string) || 0,
      nurses_needed:   parseInt(formData.get('nurses_needed') as string) || 0,
      status:          (formData.get('status') as string) || 'active',
      updated_at:      new Date().toISOString(),
    })
    .eq('id', id)
    .eq('hospital_id', hospitalId)

  if (error) return { error: error.message }
  revalidatePath('/hospital/departments')
  return { success: true }
}

export async function deleteDepartmentAction(formData: FormData) {
  const user = await requireRole('hospital')
  const hospitalId = await getHospitalId(user.id)
  if (!hospitalId) return { error: 'Hospital not found' }

  const id = formData.get('id') as string
  const supabase = createSupabaseServiceRoleClient()
  const { error } = await supabase
    .from('hospital_departments')
    .delete()
    .eq('id', id)
    .eq('hospital_id', hospitalId)

  if (error) return { error: error.message }
  revalidatePath('/hospital/departments')
  return { success: true }
}
