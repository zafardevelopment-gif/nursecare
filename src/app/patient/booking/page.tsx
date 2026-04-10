import PatientBookingClient from './PatientBookingClient'
import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function PatientBookingPage() {
  const user    = await requireRole('patient')

  // ── service role client — bypasses RLS for public data reads ─────────────
  const serviceSupabase = createSupabaseServiceRoleClient()

  const { data: settings } = await serviceSupabase
    .from('platform_settings')
    .select('vat_rate, default_commission, min_booking_hours, min_advance_hours, max_advance_days, payment_deadline_hours')
    .limit(1)
    .single()

  const vatRate         = settings?.vat_rate ?? 15
  const minBookingHours = settings?.min_booking_hours ?? 2
  const commission      = settings?.default_commission ?? 10
  const minAdvanceHours       = settings?.min_advance_hours ?? 2
  const maxAdvanceDays        = settings?.max_advance_days ?? 30
  const paymentDeadlineHours  = settings?.payment_deadline_hours ?? 24

  // ── 2. Fetch nurses with photo ────────────────────────────────────────────
  const { data: nursesRaw } = await serviceSupabase
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
      status,
      nurse_documents ( doc_type, file_url )
    `)
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

  // ── 4. Derive dynamic filter options from actual available nurses ─────────
  const genders = Array.from(new Set(nurseList.map(n => n.gender).filter(Boolean))).sort()

  const nationalities = Array.from(new Set(
    nurseList.map(n => n.nationality).filter(Boolean)
  )).sort() as string[]

  // Languages — from the nurse's own languages field in DB
  const languageSet = new Set<string>()
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
