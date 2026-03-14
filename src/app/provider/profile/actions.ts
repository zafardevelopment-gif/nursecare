'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

// Fields that require admin approval when changed
const SENSITIVE_FIELDS = [
  'hourly_rate',
  'daily_rate',
  'specialization',
  'experience_years',
  'license_no',
] as const

export async function updateProfileAction(formData: FormData) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  // Fetch current nurse record
  const { data: nurse, error: fetchError } = await supabase
    .from('nurses')
    .select('id, status, hourly_rate, daily_rate, specialization, experience_years, license_no, phone, city, bio, nationality, gender')
    .eq('user_id', user.id)
    .single()

  if (fetchError || !nurse) {
    redirect('/provider/profile?error=Profile+not+found')
  }

  // Parse submitted values
  const submitted: Record<string, any> = {
    phone:            formData.get('phone') as string,
    city:             formData.get('city') as string,
    bio:              formData.get('bio') as string,
    nationality:      formData.get('nationality') as string,
    gender:           formData.get('gender') as string,
    specialization:   (formData.get('specialization') as string) || null,
    experience_years: parseInt(formData.get('experience_years') as string) || 0,
    license_no:       (formData.get('license_no') as string) || null,
    hourly_rate:      parseFloat(formData.get('hourly_rate') as string) || null,
    daily_rate:       parseFloat(formData.get('daily_rate') as string) || null,
  }

  // Detect which sensitive fields actually changed
  const changedSensitive = SENSITIVE_FIELDS.filter(field => {
    const current = nurse[field as keyof typeof nurse]
    const next = submitted[field]
    return String(current ?? '') !== String(next ?? '')
  })

  if (changedSensitive.length > 0) {
    // Build old/new value snapshots only for changed fields
    const old_values: Record<string, any> = {}
    const new_values: Record<string, any> = {}
    for (const field of changedSensitive) {
      old_values[field] = nurse[field as keyof typeof nurse]
      new_values[field] = submitted[field]
    }

    // Save update request
    const { error: reqError } = await supabase.from('nurse_update_requests').insert({
      nurse_id:       nurse.id,
      changed_fields: changedSensitive,
      old_values,
      new_values,
    })

    if (reqError) {
      redirect(`/provider/profile?error=${encodeURIComponent(reqError.message)}`)
    }

    // Set nurse status to update_pending
    await supabase
      .from('nurses')
      .update({ status: 'update_pending' })
      .eq('id', nurse.id)

    redirect('/provider/profile?notice=sensitive')
  }

  // No sensitive fields changed — apply non-sensitive fields directly
  const { error: updateError } = await supabase
    .from('nurses')
    .update({
      phone:       submitted.phone,
      city:        submitted.city,
      bio:         submitted.bio,
      nationality: submitted.nationality,
      gender:      submitted.gender,
    })
    .eq('id', nurse.id)

  if (updateError) {
    redirect(`/provider/profile?error=${encodeURIComponent(updateError.message)}`)
  }

  redirect('/provider/profile?message=Profile+updated+successfully')
}
