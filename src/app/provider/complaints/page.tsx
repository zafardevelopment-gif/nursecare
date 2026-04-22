import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import ComplaintsClient from '@/app/components/ComplaintsClient'

export const dynamic = 'force-dynamic'

export default async function ProviderComplaintsPage() {
  const user    = await requireRole('provider')
  const supabase = createSupabaseServiceRoleClient()

  const [{ data: complaints }, { data: bookings }] = await Promise.all([
    supabase
      .from('complaints')
      .select('id, complaint_type, description, status, admin_note, booking_id, created_at')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('booking_requests')
      .select('id, service_type, start_date, patient_name')
      .eq('nurse_id', user.id)
      .in('status', ['accepted', 'confirmed', 'completed', 'in_progress'])
      .order('start_date', { ascending: false })
      .limit(30),
  ])

  const bookingOptions = (bookings ?? []).map(b => ({
    id:    b.id,
    label: `${b.service_type ?? 'Booking'} — ${b.start_date}${b.patient_name ? ` (${b.patient_name})` : ''}`,
  }))

  return (
    <ComplaintsClient
      complaints={complaints ?? []}
      reporterRole="provider"
      bookingOptions={bookingOptions}
    />
  )
}
