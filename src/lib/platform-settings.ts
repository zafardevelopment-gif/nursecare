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

export interface DisputeComplaintSettings {
  disputes_enabled:       boolean
  complaints_enabled:     boolean
  dispute_window_hours:   number
  complaint_window_hours: number
}

export async function getDisputeComplaintSettings(): Promise<DisputeComplaintSettings> {
  try {
    const supabase = createSupabaseServiceRoleClient()
    const { data } = await supabase
      .from('platform_settings')
      .select('disputes_enabled, complaints_enabled, dispute_window_hours, complaint_window_hours')
      .limit(1)
      .single()
    return {
      disputes_enabled:       data?.disputes_enabled       ?? true,
      complaints_enabled:     data?.complaints_enabled     ?? true,
      dispute_window_hours:   data?.dispute_window_hours   ?? 48,
      complaint_window_hours: data?.complaint_window_hours ?? 168,
    }
  } catch {
    return {
      disputes_enabled:       true,
      complaints_enabled:     true,
      dispute_window_hours:   48,
      complaint_window_hours: 168,
    }
  }
}
