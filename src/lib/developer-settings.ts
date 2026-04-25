import { createSupabaseServiceRoleClient } from './supabase-server'

export interface DeveloperSetting {
  id:           string
  category:     string
  key_name:     string
  key_value:    string
  description:  string
  is_sensitive: boolean
  is_active:    boolean
  updated_by:   string | null
  updated_at:   string
}

export type DeveloperSettingsMap = Record<string, Record<string, DeveloperSetting>>

export async function getAllDeveloperSettings(): Promise<DeveloperSettingsMap> {
  try {
    const supabase = createSupabaseServiceRoleClient()
    const { data } = await supabase
      .from('developer_settings')
      .select('*')
      .order('category')
      .order('key_name')

    const map: DeveloperSettingsMap = {}
    for (const row of data ?? []) {
      if (!map[row.category]) map[row.category] = {}
      map[row.category][row.key_name] = row
    }
    return map
  } catch {
    return {}
  }
}

export async function getDeveloperSettingsByCategory(category: string): Promise<Record<string, DeveloperSetting>> {
  try {
    const supabase = createSupabaseServiceRoleClient()
    const { data } = await supabase
      .from('developer_settings')
      .select('*')
      .eq('category', category)

    const map: Record<string, DeveloperSetting> = {}
    for (const row of data ?? []) {
      map[row.key_name] = row
    }
    return map
  } catch {
    return {}
  }
}

export function getVal(map: Record<string, DeveloperSetting>, key: string, fallback = ''): string {
  return map[key]?.key_value ?? fallback
}

export function getBool(map: Record<string, DeveloperSetting>, key: string, fallback = false): boolean {
  const v = map[key]?.key_value
  if (v === undefined) return fallback
  return v === 'true'
}
