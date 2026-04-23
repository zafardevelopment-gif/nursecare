import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import HomepageSettingsClient from './HomepageSettingsClient'

export const dynamic = 'force-dynamic'

export default async function AdminHomepagePage() {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const [
    { data: settingsRows },
    { data: features },
    { data: howItWorks },
    { data: services },
    { data: testimonials },
    { data: faqs },
    { data: featuredRows },
    { data: allNurses },
  ] = await Promise.all([
    supabase.from('homepage_settings').select('key, value'),
    supabase.from('homepage_sections').select('*').eq('section_key', 'features').order('sort_order'),
    supabase.from('homepage_sections').select('*').eq('section_key', 'how_it_works').order('sort_order'),
    supabase.from('homepage_services').select('*').order('sort_order'),
    supabase.from('homepage_testimonials').select('*').order('sort_order'),
    supabase.from('homepage_faqs').select('*').order('sort_order'),
    supabase.from('homepage_featured_providers').select('nurse_id, priority, enabled').order('priority'),
    supabase.from('nurses').select('user_id, full_name, specialization, city, status').eq('status', 'approved').order('full_name'),
  ])

  // Build settings map
  const settings: Record<string, string> = {}
  ;(settingsRows ?? []).forEach((r: any) => { settings[r.key] = r.value ?? '' })

  const featuredNurseIds = new Set((featuredRows ?? []).map((r: any) => r.nurse_id))

  return (
    <HomepageSettingsClient
      settings={settings}
      features={features ?? []}
      howItWorks={howItWorks ?? []}
      services={services ?? []}
      testimonials={testimonials ?? []}
      faqs={faqs ?? []}
      featuredProviders={featuredRows ?? []}
      allNurses={allNurses ?? []}
      featuredNurseIds={Array.from(featuredNurseIds)}
    />
  )
}
