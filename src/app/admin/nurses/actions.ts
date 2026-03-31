'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function approveNurse(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const nurseId      = formData.get('nurseId') as string
  const hourly_rate  = parseFloat(formData.get('hourly_rate') as string) || null
  const daily_rate   = parseFloat(formData.get('daily_rate') as string) || null

  // Fetch commission from platform_settings (first row)
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('commission_percent')
    .limit(1)
    .single()

  const commission = settings?.commission_percent ?? 10

  const final_hourly = hourly_rate ? parseFloat((hourly_rate + (hourly_rate * commission / 100)).toFixed(2)) : null
  const final_daily  = daily_rate  ? parseFloat((daily_rate  + (daily_rate  * commission / 100)).toFixed(2)) : null

  const { error } = await supabase
    .from('nurses')
    .update({
      status:             'approved',
      hourly_rate,
      daily_rate,
      final_hourly_price: final_hourly,
      final_daily_price:  final_daily,
      commission_percent: commission,
      approved_by:        admin.id,
      approved_at:        new Date().toISOString(),
      reviewed_at:        new Date().toISOString(),
      rejection_reason:   null,
    })
    .eq('id', nurseId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/nurses')
}

export async function rejectNurse(formData: FormData) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const nurseId = formData.get('nurseId') as string
  const reason  = formData.get('reason') as string

  await supabase
    .from('nurses')
    .update({
      status:           'rejected',
      rejection_reason: reason || null,
      reviewed_at:      new Date().toISOString(),
    })
    .eq('id', nurseId)

  revalidatePath('/admin/nurses')
}

export async function updateNursePrice(formData: FormData) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const nurseId     = formData.get('nurseId') as string
  const hourly_rate = parseFloat(formData.get('hourly_rate') as string) || null
  const daily_rate  = parseFloat(formData.get('daily_rate') as string) || null

  const { data: settings } = await supabase
    .from('platform_settings')
    .select('commission_percent')
    .limit(1)
    .single()

  const commission = settings?.commission_percent ?? 10

  const final_hourly = hourly_rate ? parseFloat((hourly_rate + (hourly_rate * commission / 100)).toFixed(2)) : null
  const final_daily  = daily_rate  ? parseFloat((daily_rate  + (daily_rate  * commission / 100)).toFixed(2)) : null

  await supabase
    .from('nurses')
    .update({
      hourly_rate,
      daily_rate,
      final_hourly_price: final_hourly,
      final_daily_price:  final_daily,
      commission_percent: commission,
    })
    .eq('id', nurseId)

  revalidatePath('/admin/nurses')
}

export async function uploadAgreement(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const nurseId = formData.get('nurseId') as string
  const file    = formData.get('agreement') as File | null

  if (!file || file.size === 0) throw new Error('No file provided')
  if (file.type !== 'application/pdf') throw new Error('Only PDF files allowed')
  if (file.size > 10 * 1024 * 1024) throw new Error('File exceeds 10MB limit')

  const storagePath = `${nurseId}/agreement.pdf`

  const { error: storageError } = await supabase.storage
    .from('nurse-documents')
    .upload(storagePath, file, { upsert: true, contentType: 'application/pdf' })

  if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`)

  const { data: urlData } = supabase.storage
    .from('nurse-documents')
    .getPublicUrl(storagePath)

  const publicUrl = urlData.publicUrl

  // Replace any existing agreement for this nurse
  await supabase.from('nurse_agreements').delete().eq('nurse_id', nurseId)

  await supabase.from('nurse_agreements').insert({
    nurse_id:    nurseId,
    file_url:    publicUrl,
    file_name:   file.name,
    uploaded_by: admin.id,
  })

  revalidatePath('/admin/nurses')
}
