'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    redirect(`/auth/login?error=${encodeURIComponent(error?.message ?? 'Login failed')}`)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user!.id)
    .single()

  if (!profile) {
    redirect('/auth/login?error=Account-not-found')
  }

  if (profile.role === 'admin')    redirect('/admin/dashboard')
  if (profile.role === 'patient')  redirect('/patient/dashboard')
  if (profile.role === 'provider') redirect('/provider/dashboard')

  redirect('/')
}
