'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'

export async function submitBookingAction(formData: FormData): Promise<{ error?: string }> {
  let user
  try {
    user = await requireRole('patient')
  } catch {
    return { error: 'Not authenticated' }
  }

  const supabase = await createSupabaseServerClient()

  const service_type      = formData.get('service_type') as string
  const patient_condition = formData.get('patient_condition') as string
  const shift             = formData.get('shift') as string
  const duration          = parseInt(formData.get('duration') as string) || 8
  const city              = formData.get('city') as string
  const address           = formData.get('address') as string
  const notes             = formData.get('notes') as string
  const booking_type      = (formData.get('booking_type') as string) || 'one_time'
  const start_date        = formData.get('start_date') as string

  if (!start_date) return { error: 'Start date is required' }
  if (!service_type) return { error: 'Service type is required' }
  if (!shift) return { error: 'Shift is required' }
  if (!address) return { error: 'Address is required' }
  if (!city) return { error: 'City is required' }

  const { data: request, error: reqError } = await supabase
    .from('booking_requests')
    .insert({
      patient_id:        user.id,
      patient_name:      user.full_name,
      patient_email:     user.email,
      service_type,
      patient_condition: patient_condition || 'General care',
      shift,
      duration_hours:    duration,
      city,
      address,
      notes: notes || '',
      booking_type,
      start_date,
      end_date:          start_date,
      days_of_week:      null,
      total_sessions:    1,
      status:            'pending',
    })
    .select('id')
    .single()

  if (reqError || !request) {
    return { error: reqError?.message ?? 'Failed to create booking request' }
  }

  const { error: bookingsError } = await supabase.from('bookings').insert([{
    patient_id:         user.id,
    patient_name:       user.full_name,
    patient_email:      user.email,
    booking_request_id: request.id,
    session_number:     1,
    service_type,
    patient_condition:  patient_condition || 'General care',
    date:               start_date,
    shift,
    duration_hours:     duration,
    city,
    address,
    notes: notes || '',
    status:             'pending',
  }])

  if (bookingsError) {
    await supabase.from('booking_requests').delete().eq('id', request.id)
    return { error: bookingsError.message }
  }

  return {}
}
