'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function hospitalOnboardingAction(formData: FormData) {
  const user = await requireRole('hospital')
  const supabase = await createSupabaseServerClient()

  // Check if already submitted
  const { data: existing } = await supabase
    .from('hospitals')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    if (existing.status === 'pending') {
      return { error: 'Your profile is already under review.' }
    }
    if (existing.status === 'approved' || existing.status === 'active') {
      redirect('/hospital/dashboard')
    }
  }

  const hospital_name     = (formData.get('hospital_name') as string)?.trim()
  const license_cr        = (formData.get('license_cr') as string)?.trim() || null
  const contact_person    = (formData.get('contact_person') as string)?.trim()
  const designation       = (formData.get('designation') as string)?.trim() || null
  const email             = (formData.get('email') as string)?.trim()
  const phone             = (formData.get('phone') as string)?.trim()
  const city              = (formData.get('city') as string)?.trim()
  const address           = (formData.get('address') as string)?.trim() || null
  const scope_of_services = (formData.get('scope_of_services') as string)?.trim() || null

  if (!hospital_name || !contact_person || !email || !phone || !city) {
    return { error: 'Please fill in all required fields.' }
  }

  const { error } = await supabase.from('hospitals').insert({
    user_id: user.id,
    hospital_name,
    license_cr,
    contact_person,
    designation,
    email,
    phone,
    city,
    address,
    scope_of_services,
    status: 'pending',
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/hospital/onboarding?success=1')
}

export async function updateHospitalProfileAction(formData: FormData) {
  const user = await requireRole('hospital')
  const supabase = await createSupabaseServerClient()

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  if (!hospital) redirect('/hospital/onboarding')

  const contact_person    = (formData.get('contact_person') as string)?.trim()
  const designation       = (formData.get('designation') as string)?.trim() || null
  const email             = (formData.get('email') as string)?.trim()
  const phone             = (formData.get('phone') as string)?.trim()
  const address           = (formData.get('address') as string)?.trim() || null
  const scope_of_services = (formData.get('scope_of_services') as string)?.trim() || null

  const { error } = await supabase
    .from('hospitals')
    .update({ contact_person, designation, email, phone, address, scope_of_services, updated_at: new Date().toISOString() })
    .eq('id', hospital.id)

  if (error) redirect(`/hospital/profile?error=${encodeURIComponent(error.message)}`)

  redirect('/hospital/profile?message=Profile+updated+successfully')
}
