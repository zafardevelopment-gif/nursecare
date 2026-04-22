import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import ComplaintsClient from '@/app/components/ComplaintsClient'

export const dynamic = 'force-dynamic'

export default async function HospitalComplaintsPage() {
  const user    = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  // Get hospital row for booking lookup
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const [{ data: complaints }, { data: hBookings }] = await Promise.all([
    supabase
      .from('complaints')
      .select('id, complaint_type, description, status, admin_note, booking_id, created_at')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false }),
    hospital
      ? supabase
          .from('hospital_booking_requests')
          .select('id, start_date, end_date, status')
          .eq('hospital_id', hospital.id)
          .in('status', ['matched', 'confirmed'])
          .order('start_date', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ])

  const bookingOptions = (hBookings ?? []).map((b: any) => ({
    id:    b.id,
    label: `Hospital Booking — ${b.start_date} to ${b.end_date} (${b.status})`,
  }))

  return (
    <ComplaintsClient
      complaints={complaints ?? []}
      reporterRole="hospital"
      bookingOptions={bookingOptions}
    />
  )
}
