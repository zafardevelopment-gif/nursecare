'use server'

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity'

/* ── Logo Upload ────────────────────────────────────────────────── */

export async function uploadLogo(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const file = formData.get('logo') as File
  if (!file || file.size === 0) return { error: 'No file selected' }
  if (file.size > 512 * 1024) return { error: 'File too large. Max 512 KB allowed' }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return { error: 'Only PNG, JPG, or WebP allowed' }

  const ext = file.name.split('.').pop()
  const path = `platform/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data } = supabase.storage.from('assets').getPublicUrl(path)
  const url = data.publicUrl + '?t=' + Date.now() // cache-bust

  // Persist url in platform_settings
  const { data: existing } = await supabase.from('platform_settings').select('id').limit(1).single()
  if (existing) {
    await supabase.from('platform_settings').update({ logo_url: url }).eq('id', existing.id)
  } else {
    await supabase.from('platform_settings').insert({ logo_url: url })
  }

  revalidatePath('/admin/settings')
  return { url }
}

/* ── Platform Settings ─────────────────────────────────────────── */

export type PlatformSettingsInput = {
  platform_name: string
  logo_url: string | null
  default_commission: number
  vat_rate: number
  free_cancellation_hours: number
  auto_complete_hours: number
  min_booking_hours: number
  min_advance_hours: number
  max_advance_days: number
  payment_deadline_hours: number
  work_start_enable_hours_before: number
  allow_emergency_bookings: boolean
  require_work_start_confirmation: boolean
  require_work_completion_confirmation: boolean
  chat_enabled: boolean
  email_notifications: boolean
  whatsapp_notifications: boolean
  sms_notifications: boolean
  share_provider_phone_with_patient: boolean
  show_hospital_contracts: boolean
  show_price_with_commission: boolean
  require_nurse_approval: boolean
  on_the_way_enabled: boolean
  disputes_enabled: boolean
  complaints_enabled: boolean
  dispute_window_hours: number
  complaint_window_hours: number
}

export async function savePlatformSettings(input: PlatformSettingsInput) {
  const admin = await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const values = {
    ...input,
    updated_by: admin.id,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('platform_settings')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    const { error } = await supabase.from('platform_settings').update(values).eq('id', existing.id)
    if (error) console.error('[savePlatformSettings] error:', error.message)
  } else {
    const { error } = await supabase.from('platform_settings').insert(values)
    if (error) console.error('[savePlatformSettings] insert error:', error.message)
  }

  void logActivity({
    actorId: admin.id, actorName: admin.full_name ?? 'Admin', actorRole: 'admin',
    action: 'admin_settings_changed', module: 'settings',
    entityType: 'settings',
    description: `Admin updated platform settings`,
    meta: { platform_name: input.platform_name, commission: input.default_commission },
  })

  revalidatePath('/admin/settings')
}

/* ── Profession Commissions ────────────────────────────────────── */

export async function saveProfessionCommission(formData: FormData) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const id                 = formData.get('id') as string
  const commission_percent = parseFloat(formData.get('commission_percent') as string)

  if (!id || isNaN(commission_percent)) return

  await supabase
    .from('profession_commissions')
    .update({ commission_percent })
    .eq('id', id)

  revalidatePath('/admin/settings')
}

export async function addProfessionCommission(formData: FormData): Promise<{ error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const profession         = (formData.get('profession') as string)?.trim()
  const commission_percent = parseFloat(formData.get('commission_percent') as string)

  if (!profession) return { error: 'Profession name is required' }
  if (isNaN(commission_percent) || commission_percent < 0 || commission_percent > 100) return { error: 'Commission must be 0–100' }

  const { error } = await supabase
    .from('profession_commissions')
    .insert({ profession, commission_percent })

  if (error) return { error: error.message.includes('unique') ? 'Profession already exists' : error.message }

  revalidatePath('/admin/settings')
  return {}
}

export async function deleteProfessionCommission(formData: FormData) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const id = formData.get('id') as string
  if (!id) return

  await supabase.from('profession_commissions').delete().eq('id', id)
  revalidatePath('/admin/settings')
}

/* ── Promo Codes ────────────────────────────────────────────────── */

export async function createPromoCode(formData: FormData) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const code           = (formData.get('code') as string)?.trim().toUpperCase()
  const discount_type  = formData.get('discount_type') as string
  const discount_value = parseFloat(formData.get('discount_value') as string)
  const max_uses       = parseInt(formData.get('max_uses') as string) || null
  const expires_at_raw = formData.get('expires_at') as string

  if (!code || !discount_type || isNaN(discount_value)) return

  await supabase.from('promo_codes').insert({
    code,
    discount_type,
    discount_value,
    max_uses,
    expires_at: expires_at_raw ? new Date(expires_at_raw).toISOString() : null,
    status: 'active',
  })

  revalidatePath('/admin/settings')
}

export async function updatePromoCode(formData: FormData) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const id             = formData.get('id') as string
  const discount_value = parseFloat(formData.get('discount_value') as string)
  const max_uses       = parseInt(formData.get('max_uses') as string) || null
  const expires_at_raw = formData.get('expires_at') as string

  if (!id) return

  await supabase
    .from('promo_codes')
    .update({
      discount_value,
      max_uses,
      expires_at: expires_at_raw ? new Date(expires_at_raw).toISOString() : null,
    })
    .eq('id', id)

  revalidatePath('/admin/settings')
}

export async function disablePromoCode(formData: FormData) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const id = formData.get('id') as string
  if (!id) return

  await supabase
    .from('promo_codes')
    .update({ status: 'disabled' })
    .eq('id', id)

  revalidatePath('/admin/settings')
}

export async function enablePromoCode(formData: FormData) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const id = formData.get('id') as string
  if (!id) return

  await supabase
    .from('promo_codes')
    .update({ status: 'active' })
    .eq('id', id)

  revalidatePath('/admin/settings')
}
