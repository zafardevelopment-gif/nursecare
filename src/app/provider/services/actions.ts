'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type NurseServiceRow = {
  id: string
  nurse_id: string
  service_id: string
  my_price: number
  is_active: boolean
  created_at: string
  updated_at: string
  services: {
    id: string
    name: string
    description: string | null
    base_price: number
    min_price: number
    max_price: number | null
    duration_minutes: number | null
    requires_equipment: boolean
    category_id: string | null
    service_categories: { name: string; icon: string } | null
  } | null
}

export type MasterServiceOption = {
  id: string
  name: string
  description: string | null
  base_price: number
  min_price: number
  max_price: number | null
  duration_minutes: number | null
  requires_equipment: boolean
  category_id: string | null
  service_categories: { id: string; name: string; icon: string } | null
}

/* ── Add a service the nurse offers ────────────────────────── */

export async function addNurseService(formData: FormData): Promise<{ error?: string }> {
  const user = await requireRole('provider')
  const supabase = createSupabaseServiceRoleClient()

  const service_id = (formData.get('service_id') as string)?.trim()
  const my_price   = parseFloat(formData.get('my_price') as string)

  if (!service_id) return { error: 'Please select a service' }
  if (isNaN(my_price) || my_price < 0) return { error: 'Enter a valid price' }

  // Fetch nurse row to get nurse.id
  const { data: nurse } = await supabase
    .from('nurses')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  if (!nurse) return { error: 'Nurse profile not found' }
  if (nurse.status !== 'approved') return { error: 'Your profile must be approved before adding services' }

  // Validate price against master service bounds
  const { data: svc } = await supabase
    .from('services')
    .select('min_price, max_price, is_active, name')
    .eq('id', service_id)
    .single()

  if (!svc || !svc.is_active) return { error: 'This service is no longer available' }
  if (my_price < svc.min_price) return { error: `Price cannot be less than the minimum SAR ${svc.min_price}` }
  if (svc.max_price !== null && my_price > svc.max_price) return { error: `Price cannot exceed the maximum SAR ${svc.max_price}` }

  // Check already added
  const { data: existing } = await supabase
    .from('nurse_services')
    .select('id, is_active')
    .eq('nurse_id', nurse.id)
    .eq('service_id', service_id)
    .single()

  if (existing) {
    // Re-activate with new price if it was deactivated
    const { error } = await supabase
      .from('nurse_services')
      .update({ my_price, is_active: true, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('nurse_services')
      .insert({ nurse_id: nurse.id, service_id, my_price, is_active: true })
    if (error) return { error: error.message }
  }

  revalidatePath('/provider/services')
  return {}
}

/* ── Update price for an existing nurse_service ────────────── */

export async function updateNurseServicePrice(formData: FormData): Promise<{ error?: string }> {
  const user = await requireRole('provider')
  const supabase = createSupabaseServiceRoleClient()

  const id       = (formData.get('id') as string)?.trim()
  const my_price = parseFloat(formData.get('my_price') as string)

  if (!id)                      return { error: 'Missing record ID' }
  if (isNaN(my_price) || my_price < 0) return { error: 'Enter a valid price' }

  // Ownership check
  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!nurse) return { error: 'Nurse profile not found' }

  const { data: row } = await supabase
    .from('nurse_services')
    .select('nurse_id, service_id')
    .eq('id', id)
    .single()

  if (!row || row.nurse_id !== nurse.id) return { error: 'Not authorised' }

  // Re-validate against current master bounds (admin may have changed them)
  const { data: svc } = await supabase
    .from('services')
    .select('min_price, max_price, is_active, name')
    .eq('id', row.service_id)
    .single()

  if (!svc || !svc.is_active) return { error: 'This service is no longer active in the catalog' }
  if (my_price < svc.min_price) return { error: `Price cannot be less than the minimum SAR ${svc.min_price}` }
  if (svc.max_price !== null && my_price > svc.max_price) return { error: `Price cannot exceed the maximum SAR ${svc.max_price}` }

  const { error } = await supabase
    .from('nurse_services')
    .update({ my_price, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/provider/services')
  return {}
}

/* ── Toggle active/inactive ─────────────────────────────────── */

export async function toggleNurseService(id: string, is_active: boolean): Promise<{ error?: string }> {
  const user = await requireRole('provider')
  const supabase = createSupabaseServiceRoleClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!nurse) return { error: 'Nurse profile not found' }

  const { data: row } = await supabase
    .from('nurse_services')
    .select('nurse_id')
    .eq('id', id)
    .single()

  if (!row || row.nurse_id !== nurse.id) return { error: 'Not authorised' }

  const { error } = await supabase
    .from('nurse_services')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/provider/services')
  return {}
}

/* ── Remove a nurse_service entirely ───────────────────────── */

export async function removeNurseService(id: string): Promise<{ error?: string }> {
  const user = await requireRole('provider')
  const supabase = createSupabaseServiceRoleClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!nurse) return { error: 'Nurse profile not found' }

  const { data: row } = await supabase
    .from('nurse_services')
    .select('nurse_id')
    .eq('id', id)
    .single()

  if (!row || row.nurse_id !== nurse.id) return { error: 'Not authorised' }

  // Block delete if service has booking history
  const { count } = await supabase
    .from('booking_service_items')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', (await supabase.from('nurse_services').select('service_id').eq('id', id).single()).data?.service_id)

  if (count && count > 0) {
    return { error: 'Cannot remove — this service has booking history. Deactivate instead.' }
  }

  const { error } = await supabase.from('nurse_services').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/provider/services')
  return {}
}
