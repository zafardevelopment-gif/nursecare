'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function generateUniqueCode(seq: number): string {
  const year = new Date().getFullYear()
  return `NC-${year}-${String(seq).padStart(5, '0')}`
}

export async function generateIdCard(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const nurse_id    = formData.get('nurse_id') as string
  const expiry_date = formData.get('expiry_date') as string

  if (!nurse_id || !expiry_date) return { error: 'Nurse ID and expiry date are required' }

  // Ensure nurse is approved
  const { data: nurse } = await supabase
    .from('nurses').select('id, status, full_name').eq('id', nurse_id).single()
  if (!nurse) return { error: 'Nurse not found' }
  if (nurse.status !== 'approved') return { error: 'Only approved nurses can receive an ID card' }

  // Check if there's already an active card — revoke it first
  const { data: existing } = await supabase
    .from('nurse_id_cards').select('id').eq('nurse_id', nurse_id).eq('status', 'active').single()

  if (existing) {
    await supabase.from('nurse_id_cards').update({
      status: 'revoked',
      revoked_by: admin.id,
      revoked_at: new Date().toISOString(),
    }).eq('id', existing.id)
  }

  // Generate a unique code using the sequence
  // Use count of all cards for the sequence number
  const { count } = await supabase
    .from('nurse_id_cards').select('*', { count: 'exact', head: true })
  const seq = (count ?? 0) + 1000
  const unique_id_code = generateUniqueCode(seq)

  const { data: card, error } = await supabase
    .from('nurse_id_cards')
    .insert({
      nurse_id,
      unique_id_code,
      issue_date:   new Date().toISOString().split('T')[0],
      expiry_date,
      generated_by: admin.id,
    })
    .select('id, unique_id_code')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/admin/nurses/${nurse_id}`)
  revalidatePath('/admin/nurses/id-cards')
  return { success: true, card }
}

export async function revokeIdCard(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const id = formData.get('id') as string
  if (!id) return { error: 'Card ID required' }

  const { error } = await supabase
    .from('nurse_id_cards')
    .update({ status: 'revoked', revoked_by: admin.id, revoked_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/nurses/id-cards')
  return { success: true }
}

export async function renewIdCard(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const id          = formData.get('id') as string
  const expiry_date = formData.get('expiry_date') as string
  if (!id || !expiry_date) return { error: 'Card ID and expiry date required' }

  const { error } = await supabase
    .from('nurse_id_cards')
    .update({ expiry_date, status: 'active', revoked_by: null, revoked_at: null })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/nurses/id-cards')
  return { success: true }
}
