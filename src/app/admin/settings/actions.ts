'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

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

export async function savePlatformSettings(formData: FormData) {
  const admin = await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const values = {
    platform_name:            (formData.get('platform_name') as string)?.trim() || 'NurseCare+',
    logo_url:                 (formData.get('logo_url') as string)?.trim() || null,
    default_commission:       parseFloat(formData.get('default_commission') as string) || 10,
    vat_rate:                 parseFloat(formData.get('vat_rate') as string) || 15,
    free_cancellation_hours:  parseInt(formData.get('free_cancellation_hours') as string) || 24,
    auto_complete_hours:      parseInt(formData.get('auto_complete_hours') as string) || 24,
    allow_emergency_bookings: formData.get('allow_emergency_bookings') === 'true',
    email_notifications:      formData.get('email_notifications') === 'true',
    whatsapp_notifications:   formData.get('whatsapp_notifications') === 'true',
    sms_notifications:        formData.get('sms_notifications') === 'true',
    updated_by:               admin.id,
    updated_at:               new Date().toISOString(),
  }

  // Upsert single row — fetch existing id first
  const { data: existing } = await supabase
    .from('platform_settings')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    await supabase.from('platform_settings').update(values).eq('id', existing.id)
  } else {
    await supabase.from('platform_settings').insert(values)
  }

  revalidatePath('/admin/settings')
}

/* ── Profession Commissions ────────────────────────────────────── */

export async function saveProfessionCommission(formData: FormData) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

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
  const supabase = await createSupabaseServerClient()

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
  const supabase = await createSupabaseServerClient()

  const id = formData.get('id') as string
  if (!id) return

  await supabase.from('profession_commissions').delete().eq('id', id)
  revalidatePath('/admin/settings')
}

/* ── Promo Codes ────────────────────────────────────────────────── */

export async function createPromoCode(formData: FormData) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

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
  const supabase = await createSupabaseServerClient()

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
  const supabase = await createSupabaseServerClient()

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
  const supabase = await createSupabaseServerClient()

  const id = formData.get('id') as string
  if (!id) return

  await supabase
    .from('promo_codes')
    .update({ status: 'active' })
    .eq('id', id)

  revalidatePath('/admin/settings')
}
