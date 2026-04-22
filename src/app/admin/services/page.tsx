import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import ServiceMasterClient from './ServiceMasterClient'

export default async function AdminServicesPage() {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const [
    { data: categories },
    { data: services },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('service_categories')
      .select('id, name, description, icon, sort_order, is_active, created_at')
      .order('sort_order')
      .order('name'),
    supabase
      .from('services')
      .select('id, category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order, created_at, service_categories(name, icon)')
      .order('sort_order')
      .order('name'),
    supabase
      .from('platform_settings')
      .select('service_master_enabled')
      .limit(1)
      .single(),
  ])

  const flagEnabled = settings?.service_master_enabled === true

  // Supabase returns service_categories as array; cast to match ServiceRow type
  const castServices = (services ?? []).map(s => ({
    ...s,
    service_categories: Array.isArray(s.service_categories)
      ? (s.service_categories[0] ?? null)
      : s.service_categories,
  }))

  return (
    <ServiceMasterClient
      initialCategories={categories ?? []}
      initialServices={castServices as any}
      flagEnabled={flagEnabled}
    />
  )
}
