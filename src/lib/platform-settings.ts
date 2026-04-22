import { createSupabaseServiceRoleClient } from './supabase-server'

export async function getServiceMasterEnabled(): Promise<boolean> {
  try {
    const supabase = createSupabaseServiceRoleClient()
    const { data } = await supabase
      .from('platform_settings')
      .select('service_master_enabled')
      .limit(1)
      .single()
    return data?.service_master_enabled === true
  } catch {
    return false
  }
}
