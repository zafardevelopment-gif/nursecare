'use server'

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRoleAction } from '@/lib/auth'
import { redirect } from 'next/navigation'

export interface AddressPayload {
  // Step 1 — location
  latitude:     number | null
  longitude:    number | null
  full_address: string
  building:     string
  street:       string
  area:         string
  city:         string
  state:        string
  country:      string
  postal_code:  string
  // Step 2 — label
  label:        string
  custom_label: string
  // Step 3 — contact
  person_name:  string
  mobile:       string
  alternate_mobile: string
  relationship: string
}

export async function savePatientAddress(payload: AddressPayload): Promise<{ error?: string }> {
  const user = await requireRoleAction('patient')
  const serviceClient = createSupabaseServiceRoleClient()

  if (!payload.full_address?.trim()) return { error: 'Address is required' }
  if (!payload.label) return { error: 'Please select an address label' }
  if (!payload.person_name?.trim()) return { error: 'Contact person name is required' }
  if (!payload.mobile?.trim()) return { error: 'Mobile number is required' }
  if (payload.label === 'other' && !payload.custom_label?.trim()) return { error: 'Please enter a custom label' }

  // Insert address (first address is always default)
  const { data: existingAddresses } = await serviceClient
    .from('patient_addresses')
    .select('id')
    .eq('patient_id', user.id)
    .limit(1)

  const isFirst = !existingAddresses || existingAddresses.length === 0

  const { error: addrError } = await serviceClient
    .from('patient_addresses')
    .insert({
      patient_id:       user.id,
      label:            payload.label,
      custom_label:     payload.custom_label || null,
      person_name:      payload.person_name,
      mobile:           payload.mobile,
      alternate_mobile: payload.alternate_mobile || null,
      relationship:     payload.relationship || null,
      latitude:         payload.latitude,
      longitude:        payload.longitude,
      full_address:     payload.full_address,
      building:         payload.building || null,
      street:           payload.street || null,
      area:             payload.area || null,
      city:             payload.city || null,
      state:            payload.state || null,
      country:          payload.country || null,
      postal_code:      payload.postal_code || null,
      is_default:       isFirst,
    })

  if (addrError) return { error: addrError.message }

  // Mark onboarding complete (upsert)
  const { error: profileError } = await serviceClient
    .from('patient_profiles')
    .upsert({ user_id: user.id, onboarding_completed: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (profileError) return { error: profileError.message }

  redirect('/patient/dashboard?message=Welcome+to+NurseCare%2B!')
}

export async function skipOnboarding(): Promise<void> {
  const user = await requireRoleAction('patient')
  const serviceClient = createSupabaseServiceRoleClient()
  await serviceClient
    .from('patient_profiles')
    .upsert({ user_id: user.id, onboarding_completed: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  redirect('/patient/dashboard')
}

export async function checkOnboardingStatus(): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const serviceClient = createSupabaseServiceRoleClient()
  const { data } = await serviceClient
    .from('patient_profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()

  return data?.onboarding_completed === true
}
