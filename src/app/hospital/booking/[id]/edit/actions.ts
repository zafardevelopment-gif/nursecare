'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function updateHospitalBookingAction(formData: FormData): Promise<void> {
  const user = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  const bookingId   = formData.get('booking_id') as string
  const start_date  = formData.get('start_date') as string
  const end_date    = formData.get('end_date') as string
  const total_nurses = parseInt(formData.get('total_nurses') as string) || 1
  const duration_days = Math.max(1, Math.round((new Date(end_date).getTime() - new Date(start_date).getTime()) / 86400000))
  const gender_preference   = (formData.get('gender_preference') as string) || 'any'
  const special_instructions = (formData.get('special_instructions') as string) || null

  let shifts: string[] = []
  let specializations: string[] = []
  let lang_pref: string[] = []
  let dept_rows: any[] = []

  try { shifts          = JSON.parse(formData.get('shifts') as string) } catch {}
  try { specializations = JSON.parse(formData.get('specializations') as string) } catch {}
  try { lang_pref       = JSON.parse(formData.get('language_preference') as string) } catch {}
  try { dept_rows       = JSON.parse(formData.get('dept_breakdown') as string) } catch {}

  // Verify ownership
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!hospital) return

  const { data: booking } = await supabase
    .from('hospital_booking_requests')
    .select('id, status')
    .eq('id', bookingId)
    .eq('hospital_id', hospital.id)
    .single()

  if (!booking) return
  if (booking.status !== 'pending' && booking.status !== 'reviewing') return

  await supabase
    .from('hospital_booking_requests')
    .update({
      start_date,
      end_date,
      duration_days,
      shifts,
      specializations,
      total_nurses,
      language_preference: lang_pref,
      gender_preference,
      special_instructions,
      dept_breakdown: dept_rows,
      // Reset nurse selections when requirements change
      nurse_selections: [],
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  redirect(`/hospital/booking/${bookingId}`)
}
