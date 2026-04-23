import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { Metadata } from 'next'
import HomePageClient from './HomePageClient'

export const revalidate = 60 // ISR — revalidate every 60 seconds

async function getHomepageData() {
  const supabase = createSupabaseServiceRoleClient()

  const [
    { data: settingsRows },
    { data: features },
    { data: howItWorks },
    { data: services },
    { data: testimonials },
    { data: faqs },
    { data: featuredRows },
    { data: liveNurses },
    { count: totalNurses },
    { count: totalBookings },
    { count: totalPatients },
  ] = await Promise.all([
    supabase.from('homepage_settings').select('key, value'),
    supabase.from('homepage_sections').select('*').eq('section_key', 'features').eq('enabled', true).order('sort_order'),
    supabase.from('homepage_sections').select('*').eq('section_key', 'how_it_works').eq('enabled', true).order('sort_order'),
    supabase.from('homepage_services').select('*').eq('enabled', true).order('sort_order'),
    supabase.from('homepage_testimonials').select('*').eq('enabled', true).order('sort_order'),
    supabase.from('homepage_faqs').select('*').eq('enabled', true).order('sort_order'),
    supabase.from('homepage_featured_providers')
      .select('nurse_id, priority')
      .eq('enabled', true)
      .order('priority'),
    supabase.from('nurses')
      .select('user_id, full_name, specialization, city, hourly_rate, is_available, status, nurse_documents(doc_type, file_url)')
      .eq('status', 'approved')
      .eq('is_available', true)
      .limit(20),
    supabase.from('nurses').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
  ])

  const settings: Record<string, string> = {}
  ;(settingsRows ?? []).forEach((r: any) => { settings[r.key] = r.value ?? '' })

  // Attach live nurses to featured slots
  const featuredNurseIds = (featuredRows ?? []).map((f: any) => f.nurse_id)
  const nurseMap: Record<string, any> = {}
  ;(liveNurses ?? []).forEach((n: any) => { nurseMap[n.user_id] = n })
  const featuredNurses = featuredNurseIds
    .map((id: string) => nurseMap[id])
    .filter(Boolean)
    .slice(0, 6)

  // If no featured set, show top available nurses
  const displayFeatured = featuredNurses.length > 0
    ? featuredNurses
    : (liveNurses ?? []).slice(0, 4)

  return {
    settings,
    features: features ?? [],
    howItWorks: howItWorks ?? [],
    services: services ?? [],
    testimonials: testimonials ?? [],
    faqs: faqs ?? [],
    liveNurses: liveNurses ?? [],
    featuredNurses: displayFeatured,
    stats: {
      nurses: totalNurses ?? 0,
      bookings: totalBookings ?? 0,
      patients: totalPatients ?? 0,
    },
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createSupabaseServiceRoleClient()
  const { data } = await supabase.from('homepage_settings').select('key, value').in('key', ['site_title', 'meta_description', 'meta_keywords', 'og_image'])
  const s: Record<string, string> = {}
  ;(data ?? []).forEach((r: any) => { s[r.key] = r.value ?? '' })
  return {
    title: s.site_title || "NurseCare+ | Saudi Arabia's Home Healthcare Platform",
    description: s.meta_description || 'Book verified, MOH-licensed nurses for home care across Saudi Arabia.',
    keywords: s.meta_keywords || 'home nursing, healthcare, nurse booking',
    openGraph: s.og_image ? { images: [s.og_image] } : undefined,
  }
}

export default async function HomePage() {
  const data = await getHomepageData()
  return <HomePageClient {...data} />
}
