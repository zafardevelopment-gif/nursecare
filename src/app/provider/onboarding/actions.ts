'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function onboardingAction(formData: FormData) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const bio          = formData.get('bio') as string
  const city         = formData.get('city') as string
  const phone        = formData.get('phone') as string
  const experience   = parseInt(formData.get('experience') as string) || 0
  const shift_rate   = parseInt(formData.get('shift_rate') as string) || 0
  const license_no   = formData.get('license_no') as string
  const specialties  = formData.get('specialties') as string

  const { error } = await supabase.from('nurses').upsert({
    user_id:    user.id,
    full_name:  user.full_name,
    email:      user.email,
    bio,
    city,
    phone,
    experience_years: experience,
    shift_rate,
    license_no,
    specialties,
    status:     'pending',
  }, { onConflict: 'user_id' })

  if (error) {
    redirect(`/provider/onboarding?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/provider/dashboard?message=Profile+submitted+for+review')
}
