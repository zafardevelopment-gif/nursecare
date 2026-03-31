'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireRole('admin')

  if (newPassword.length < 6) return { error: 'Password must be at least 6 characters' }

  // Admin client using service role key to update any user's password
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)
  if (error) return { error: error.message }
  return { success: true }
}
