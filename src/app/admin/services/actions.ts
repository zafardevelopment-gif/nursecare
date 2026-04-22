'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const REVALIDATE = () => revalidatePath('/admin/services')

/* ── Types ──────────────────────────────────────────────────── */

export type CategoryRow = {
  id: string
  name: string
  description: string | null
  icon: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export type ServiceRow = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  base_price: number
  min_price: number
  max_price: number | null
  duration_minutes: number | null
  requires_equipment: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  service_categories?: { name: string; icon: string } | null
}

/* ── Feature Flag ───────────────────────────────────────────── */

export async function toggleServiceMaster(enabled: boolean): Promise<{ error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  if (enabled) {
    const { count } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    if (!count || count === 0) {
      return { error: 'Cannot enable Service Master — no active services exist. Add services first.' }
    }
  }

  const { data: existing } = await supabase
    .from('platform_settings')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    await supabase
      .from('platform_settings')
      .update({ service_master_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('platform_settings')
      .insert({ service_master_enabled: enabled })
  }

  revalidatePath('/admin/settings')
  REVALIDATE()
  return {}
}

/* ── Categories ─────────────────────────────────────────────── */

function sanitizeIcon(raw: string): string {
  // Allow only emoji, plain text, and safe unicode — strip any HTML/script
  return raw.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').slice(0, 10)
}

export async function createCategory(formData: FormData): Promise<{ error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const name        = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const rawIcon     = (formData.get('icon') as string)?.trim() || '🏥'
  const icon        = sanitizeIcon(rawIcon) || '🏥'
  const sort_order  = parseInt(formData.get('sort_order') as string) || 0

  if (!name) return { error: 'Category name is required' }
  if (name.length > 80) return { error: 'Name too long (max 80 chars)' }

  const { error } = await supabase
    .from('service_categories')
    .insert({ name, description, icon, sort_order, is_active: true })

  if (error) {
    return { error: error.message.includes('unique') ? 'A category with that name already exists' : error.message }
  }

  REVALIDATE()
  return {}
}

export async function updateCategory(formData: FormData): Promise<{ error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const id          = formData.get('id') as string
  const name        = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const rawIcon     = (formData.get('icon') as string)?.trim() || '🏥'
  const icon        = sanitizeIcon(rawIcon) || '🏥'
  const sort_order  = parseInt(formData.get('sort_order') as string) || 0

  if (!id)   return { error: 'Missing category ID' }
  if (!name) return { error: 'Category name is required' }

  const { error } = await supabase
    .from('service_categories')
    .update({ name, description, icon, sort_order, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { error: error.message.includes('unique') ? 'A category with that name already exists' : error.message }
  }

  REVALIDATE()
  return {}
}

export async function toggleCategory(id: string, is_active: boolean): Promise<{ error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { error } = await supabase
    .from('service_categories')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  REVALIDATE()
  return {}
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { count } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)

  if (count && count > 0) {
    return { error: `Cannot delete — ${count} service${count > 1 ? 's' : ''} use this category. Deactivate instead.` }
  }

  const { error } = await supabase
    .from('service_categories')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  REVALIDATE()
  return {}
}

/* ── Services ───────────────────────────────────────────────── */

export async function createService(formData: FormData): Promise<{ error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const name               = (formData.get('name') as string)?.trim()
  const description        = (formData.get('description') as string)?.trim() || null
  const category_id        = (formData.get('category_id') as string) || null
  const base_price         = parseFloat(formData.get('base_price') as string)
  const min_price          = parseFloat(formData.get('min_price') as string)
  const max_price_raw      = formData.get('max_price') as string
  const max_price          = max_price_raw ? parseFloat(max_price_raw) : null
  const duration_raw       = formData.get('duration_minutes') as string
  const duration_minutes   = duration_raw ? parseInt(duration_raw) : null
  const requires_equipment = formData.get('requires_equipment') === 'true'
  const sort_order         = parseInt(formData.get('sort_order') as string) || 0

  if (!name)               return { error: 'Service name is required' }
  if (isNaN(base_price))   return { error: 'Base price is required' }
  if (isNaN(min_price))    return { error: 'Min price is required' }
  if (base_price < 0)      return { error: 'Base price cannot be negative' }
  if (min_price < 0)       return { error: 'Min price cannot be negative' }
  if (min_price > base_price) return { error: 'Min price cannot exceed base price' }
  if (max_price !== null && max_price < min_price) return { error: 'Max price cannot be less than min price' }

  const { error } = await supabase
    .from('services')
    .insert({
      name, description, category_id,
      base_price, min_price, max_price,
      duration_minutes, requires_equipment,
      sort_order, is_active: true,
    })

  if (error) return { error: error.message }
  REVALIDATE()
  return {}
}

export async function updateService(formData: FormData): Promise<{ error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const id                 = formData.get('id') as string
  const name               = (formData.get('name') as string)?.trim()
  const description        = (formData.get('description') as string)?.trim() || null
  const category_id        = (formData.get('category_id') as string) || null
  const base_price         = parseFloat(formData.get('base_price') as string)
  const min_price          = parseFloat(formData.get('min_price') as string)
  const max_price_raw      = formData.get('max_price') as string
  const max_price          = max_price_raw ? parseFloat(max_price_raw) : null
  const duration_raw       = formData.get('duration_minutes') as string
  const duration_minutes   = duration_raw ? parseInt(duration_raw) : null
  const requires_equipment = formData.get('requires_equipment') === 'true'
  const sort_order         = parseInt(formData.get('sort_order') as string) || 0

  if (!id)               return { error: 'Missing service ID' }
  if (!name)             return { error: 'Service name is required' }
  if (isNaN(base_price)) return { error: 'Base price is required' }
  if (isNaN(min_price))  return { error: 'Min price is required' }
  if (min_price > base_price) return { error: 'Min price cannot exceed base price' }
  if (max_price !== null && max_price < min_price) return { error: 'Max price cannot be less than min price' }

  const { error } = await supabase
    .from('services')
    .update({
      name, description, category_id,
      base_price, min_price, max_price,
      duration_minutes, requires_equipment,
      sort_order, updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  REVALIDATE()
  return {}
}

export async function toggleService(id: string, is_active: boolean): Promise<{ error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { error } = await supabase
    .from('services')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  REVALIDATE()
  return {}
}

export async function deleteService(id: string): Promise<{ error?: string }> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { count } = await supabase
    .from('nurse_services')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', id)

  if (count && count > 0) {
    return { error: `Cannot delete — ${count} nurse${count > 1 ? 's' : ''} offer this service. Deactivate instead.` }
  }

  const { count: bookingCount } = await supabase
    .from('booking_service_items')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', id)

  if (bookingCount && bookingCount > 0) {
    return { error: 'Cannot delete — this service has booking history. Deactivate instead.' }
  }

  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) return { error: error.message }
  REVALIDATE()
  return {}
}
