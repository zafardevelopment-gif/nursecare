import PatientBookingClient from './PatientBookingClient'
import ServiceMasterBookingClient from './ServiceMasterBookingClient'
import type { SMCategory, SMService, SMNurse } from './ServiceMasterBookingClient'
import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { getServiceMasterEnabled } from '@/lib/platform-settings'

export const dynamic = 'force-dynamic'

export default async function PatientBookingPage() {
  const user          = await requireRole('patient')
  const supabase      = createSupabaseServiceRoleClient()
  const flagEnabled   = await getServiceMasterEnabled()

  // ── Common settings ───────────────────────────────────────────────────────
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('vat_rate, default_commission, min_booking_hours, min_advance_hours, max_advance_days, payment_deadline_hours')
    .limit(1)
    .single()

  const vatRate              = settings?.vat_rate              ?? 15
  const commission           = settings?.default_commission    ?? 10
  const minBookingHours      = settings?.min_booking_hours     ?? 2
  const minAdvanceHours      = settings?.min_advance_hours     ?? 2
  const maxAdvanceDays       = settings?.max_advance_days      ?? 30
  const paymentDeadlineHours = settings?.payment_deadline_hours ?? 24

  // ── SERVICE MASTER PATH (flag ON) ─────────────────────────────────────────
  if (flagEnabled) {
    const [
      { data: rawCategories },
      { data: rawServices },
      { data: rawNurseServices },
    ] = await Promise.all([
      supabase
        .from('service_categories')
        .select('id, name, icon, description')
        .eq('is_active', true)
        .order('sort_order')
        .order('name'),

      supabase
        .from('services')
        .select('id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, category_id')
        .eq('is_active', true)
        .order('sort_order')
        .order('name'),

      // Step 1: active nurse_services rows
      supabase
        .from('nurse_services')
        .select('id, nurse_id, service_id, my_price')
        .eq('is_active', true),
    ])

    // Step 2: fetch approved nurses whose IDs appear in nurse_services
    const nurseIds = [...new Set((rawNurseServices ?? []).map((ns: any) => ns.nurse_id))]
    const { data: rawNurses } = nurseIds.length > 0
      ? await supabase
          .from('nurses')
          .select('id, user_id, full_name, specialization, city, experience_years, gender, nationality, languages, is_available, is_paused, status, nurse_documents(doc_type, file_url)')
          .in('id', nurseIds)
          .eq('status', 'approved')
          .eq('is_paused', false)
      : { data: [] }

    // Index nurses by their internal id for fast lookup
    const nurseMap: Record<string, any> = {}
    for (const n of rawNurses ?? []) nurseMap[n.id] = n

    const categories: SMCategory[] = (rawCategories ?? []).map(c => ({
      id:          c.id,
      name:        c.name,
      icon:        c.icon,
      description: c.description,
    }))

    const services: SMService[] = (rawServices ?? []).map(s => ({
      id:                 s.id,
      name:               s.name,
      description:        s.description,
      base_price:         Number(s.base_price),
      min_price:          Number(s.min_price),
      max_price:          s.max_price !== null ? Number(s.max_price) : null,
      duration_minutes:   s.duration_minutes,
      requires_equipment: s.requires_equipment,
      category_id:        s.category_id,
    }))

    // Build nursesByService map: service_id → SMNurse[]
    const nursesByService: Record<string, SMNurse[]> = {}

    for (const ns of rawNurseServices ?? []) {
      const nurse = nurseMap[(ns as any).nurse_id]
      if (!nurse) continue   // nurse not approved or not found

      const photoUrl = (nurse.nurse_documents as any[])?.find((d: any) => d.doc_type === 'photo')?.file_url ?? null

      const smNurse: SMNurse = {
        nurseServiceId:  (ns as any).id,
        nurseUserId:     nurse.user_id,
        nurseDbId:       nurse.id,
        name:            nurse.full_name ?? 'Unknown',
        photoUrl,
        specialization:  nurse.specialization ?? 'General Nursing',
        city:            nurse.city ?? '',
        experienceYears: nurse.experience_years ?? 0,
        gender:          (nurse.gender as string)?.toLowerCase() ?? 'female',
        nationality:     nurse.nationality ?? '',
        languages:       Array.isArray(nurse.languages) ? nurse.languages : [],
        myPrice:         Number((ns as any).my_price),
        avgRating:       null,   // Phase 3: join ratings table
        isAvailable:     nurse.is_available ?? true,
      }

      const sid = (ns as any).service_id
      if (!nursesByService[sid]) nursesByService[sid] = []
      nursesByService[sid].push(smNurse)
    }

    return (
      <ServiceMasterBookingClient
        userId={user.id}
        userName={user.full_name}
        userEmail={user.email}
        categories={categories}
        services={services}
        nursesByService={nursesByService}
        vatRate={vatRate}
        paymentDeadlineHours={paymentDeadlineHours}
      />
    )
  }

  // ── LEGACY PATH (flag OFF) ────────────────────────────────────────────────
  const { data: nursesRaw } = await supabase
    .from('nurses')
    .select(`
      user_id,
      full_name,
      specialization,
      city,
      hourly_rate,
      daily_rate,
      gender,
      nationality,
      experience_years,
      bio,
      languages,
      is_available,
      is_paused,
      status,
      nurse_documents ( doc_type, file_url )
    `)
    .eq('status', 'approved')
    .eq('is_paused', false)
    .limit(50)

  const nurseList = (nursesRaw ?? []).map((n: any) => ({
    id:              n.user_id,
    name:            n.full_name ?? 'Unknown',
    specialization:  n.specialization  ?? 'General Nursing',
    city:            n.city            ?? 'Riyadh',
    hourlyRate:      Number(n.hourly_rate)    || 0,
    dailyRate:       Number(n.daily_rate)     || 0,
    gender:          (n.gender as string)?.toLowerCase() ?? 'female',
    nationality:     n.nationality     ?? '',
    experienceYears: n.experience_years ?? 0,
    bio:             n.bio             ?? '',
    languages:       Array.isArray(n.languages) ? n.languages : [],
    photoUrl:        (n.nurse_documents as any[])?.find((d: any) => d.doc_type === 'photo')?.file_url ?? null,
  }))

  const genders       = Array.from(new Set(nurseList.map(n => n.gender).filter(Boolean))).sort()
  const nationalities = Array.from(new Set(nurseList.map(n => n.nationality).filter(Boolean))).sort() as string[]
  const languageSet   = new Set<string>()
  nurseList.forEach(n => n.languages.forEach((l: string) => languageSet.add(l)))
  const languages = Array.from(languageSet).sort()

  return (
    <PatientBookingClient
      userId={user.id}
      userName={user.full_name}
      userEmail={user.email}
      nurses={nurseList}
      vatRate={vatRate}
      commission={commission}
      minBookingHours={minBookingHours}
      minAdvanceHours={minAdvanceHours}
      maxAdvanceDays={maxAdvanceDays}
      paymentDeadlineHours={paymentDeadlineHours}
      availableGenders={genders}
      availableNationalities={nationalities}
      availableLanguages={languages}
    />
  )
}
