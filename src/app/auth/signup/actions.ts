'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function signupAction(formData: FormData) {
  const full_name = (formData.get('full_name') as string).trim()
  const email     = (formData.get('email') as string).trim()
  const password  = formData.get('password') as string
  const role      = formData.get('role') as 'patient' | 'provider'

  if (password.length < 8) {
    redirect('/auth/signup?error=Password+must+be+at+least+8+characters')
  }
  if (!['patient', 'provider'].includes(role)) {
    redirect('/auth/signup?error=Invalid+role+selected')
  }

  const supabase = await createSupabaseServerClient()

  const { data, error: authError } = await supabase.auth.signUp({ email, password })

  if (authError || !data.user) {
    redirect(`/auth/signup?error=${encodeURIComponent(authError?.message ?? 'Sign up failed')}`)
  }

  const { error: insertError } = await supabase.from('users').insert({
    id: data.user!.id,
    email,
    full_name,
    role,
  })

  if (insertError) {
    redirect(`/auth/signup?error=${encodeURIComponent(insertError.message)}`)
  }

  redirect('/auth/login?message=Account+created.+Please+sign+in.')
}
