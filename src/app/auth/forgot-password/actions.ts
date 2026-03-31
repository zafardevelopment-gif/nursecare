'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function forgotPasswordAction(formData: FormData) {
  const email    = formData.get('email') as string
  const supabase = await createSupabaseServerClient()

  const siteUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  })

  if (error) {
    redirect(`/auth/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/forgot-password?message=Reset+link+sent!+Check+your+email+inbox.')
}
