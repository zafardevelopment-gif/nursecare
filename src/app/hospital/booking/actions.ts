'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { sendNotifications } from '@/lib/notifications'

async function getAdminUserIds(supabase: ReturnType<typeof createSupabaseServiceRoleClient>): Promise<string[]> {
  const { data } = await supabase.from('users').select('id').eq('role', 'admin')
  return (data ?? []).map((r: any) => r.id)
}

export async function submitHospitalBookingAction(formData: FormData) {
  const user    = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  const hospital_id   = formData.get('hospital_id') as string
  const start_date    = formData.get('start_date') as string
  const end_date      = formData.get('end_date') as string
  const total_nurses  = parseInt(formData.get('total_nurses') as string) || 1
  const duration_days = parseInt(formData.get('duration_days') as string) || 7
  const gender_pref   = formData.get('gender_preference') as string
  const special_instructions = (formData.get('special_instructions') as string) || null
  const booking_mode  = (formData.get('booking_mode') as string) || 'smart'

  // Service Master fields (present when flag ON)
  const service_id         = (formData.get('service_id') as string) || null
  const service_name       = (formData.get('service_name') as string) || null
  const service_base_price = parseFloat(formData.get('service_base_price') as string) || 0

  // Enhancement fields
  const priority       = (formData.get('priority') as string) || 'normal'
  const internal_notes = (formData.get('internal_notes') as string) || null
  const is_recurring   = formData.get('is_recurring') === 'true'
  const recurrence_type      = is_recurring ? ((formData.get('recurrence_type') as string) || null) : null
  const recurrence_end_date  = is_recurring ? ((formData.get('recurrence_end_date') as string) || null) : null

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

  // Fetch hospital name for notifications
  const { data: hospitalRow } = await supabase
    .from('hospitals')
    .select('hospital_name')
    .eq('id', hospital_id)
    .single()

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
      // Service Master
      service_id: service_id || null,
      // Enhancements
      priority,
      internal_notes,
      is_recurring,
      recurrence_type,
      recurrence_end_date: recurrence_end_date || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const bookingId = data?.id

  // Write ledger snapshot — B12: use authoritative price from DB, not client-submitted value
  if (bookingId && service_id && service_name) {
    const { data: svcRow } = await supabase
      .from('services')
      .select('base_price, is_active, name')
      .eq('id', service_id)
      .single()

    if (svcRow && svcRow.is_active) {
      await supabase.from('booking_service_items').insert({
        booking_id:   bookingId,
        booking_type: 'hospital',
        service_id,
        service_name: svcRow.name,          // use DB name, not client value
        unit_price:   Number(svcRow.base_price), // use DB price, not client value
        quantity:     total_nurses,
      })
    }
    // If service not found or inactive: ledger row silently skipped — booking still valid
  }

  // Notify admins
  const adminIds = await getAdminUserIds(supabase)
  if (adminIds.length > 0) {
    const hospitalName = hospitalRow?.hospital_name ?? 'A hospital'
    const priorityLabel = priority === 'critical' ? '🚨 CRITICAL' : priority === 'urgent' ? '⚡ URGENT' : '📋'
    const serviceLabel  = service_name ? ` for ${service_name}` : ''
    await sendNotifications(
      adminIds.map(adminId => ({
        userId: adminId,
        type:   'booking_new' as const,
        title:  `${priorityLabel} Hospital Booking Request`,
        body:   `${hospitalName} submitted a new staffing request${serviceLabel}: ${total_nurses} nurse${total_nurses !== 1 ? 's' : ''} from ${start_date}${is_recurring ? ' (recurring)' : ''}.`,
        data:   { bookingId, hospitalId: hospital_id, priority },
      }))
    )
  }

  revalidatePath('/hospital/booking')
  revalidatePath('/hospital/dashboard')
  revalidatePath('/admin/bookings')
  return { success: true, id: bookingId }
}
