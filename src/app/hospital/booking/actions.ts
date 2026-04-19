'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function submitHospitalBookingAction(formData: FormData) {
  const user = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  const hospital_id   = formData.get('hospital_id') as string
  const start_date    = formData.get('start_date') as string
  const end_date      = formData.get('end_date') as string
  const total_nurses  = parseInt(formData.get('total_nurses') as string) || 1
  const duration_days = parseInt(formData.get('duration_days') as string) || 7
  const gender_pref   = formData.get('gender_preference') as string
  const special_instructions = (formData.get('special_instructions') as string) || null
  const booking_mode  = (formData.get('booking_mode') as string) || 'smart'

  let shifts: string[] = []
  let specializations: string[] = []
  let lang_pref: string[] = []
  let dept_rows: any[] = []
  let nurse_selections: any[] = []

  try { shifts           = JSON.parse(formData.get('shifts') as string) } catch {}
  try { specializations  = JSON.parse(formData.get('specializations') as string) } catch {}
  try { lang_pref        = JSON.parse(formData.get('language_preference') as string) } catch {}
  try { dept_rows        = JSON.parse(formData.get('dept_breakdown') as string) } catch {}
  try { nurse_selections = JSON.parse(formData.get('nurse_selections') as string) } catch {}

  if (!hospital_id) return { error: 'Hospital not found' }
  if (!start_date || !end_date) return { error: 'Start and end dates are required' }
  const custom_start_time = (formData.get('custom_start_time') as string) || null
  const custom_end_time   = (formData.get('custom_end_time') as string) || null
  const isCustomTime = shifts.length === 1 && shifts[0] === 'custom'

  if (shifts.length === 0) return { error: 'At least one shift must be selected' }
  if (isCustomTime && (!custom_start_time || !custom_end_time)) return { error: 'Custom time start and end are required' }

  const { data, error } = await supabase
    .from('hospital_booking_requests')
    .insert({
      hospital_id,
      requested_by_user_id: user.id,
      booking_mode,
      start_date,
      end_date,
      duration_days,
      shifts: isCustomTime ? ['custom'] : shifts,
      custom_start_time: isCustomTime ? custom_start_time : null,
      custom_end_time:   isCustomTime ? custom_end_time : null,
      specializations,
      total_nurses,
      language_preference: lang_pref,
      gender_preference: gender_pref,
      special_instructions,
      dept_breakdown: dept_rows,
      nurse_selections,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/hospital/booking')
  revalidatePath('/hospital/dashboard')
  return { success: true, id: data?.id }
}
