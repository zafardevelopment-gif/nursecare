import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { getDisputeComplaintSettings } from '@/lib/platform-settings'
import ComplaintsClient from '@/app/components/ComplaintsClient'

export const dynamic = 'force-dynamic'

export default async function PatientComplaintsPage() {
  const user    = await requireRole('patient')
  const supabase = createSupabaseServiceRoleClient()

  const [{ data: complaints }, { data: bookings }, settings] = await Promise.all([
    supabase
      .from('complaints')
      .select('id, complaint_type, description, status, admin_note, booking_id, created_at')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('booking_requests')
      .select('id, service_type, start_date, nurse_name')
      .eq('patient_id', user.id)
      .in('status', ['accepted', 'confirmed', 'completed', 'in_progress'])
      .order('start_date', { ascending: false })
      .limit(30),
    getDisputeComplaintSettings(),
  ])

  const bookingOptions = (bookings ?? []).map(b => ({
    id:    b.id,
    label: `${b.service_type ?? 'Booking'} — ${b.start_date}${b.nurse_name ? ` (${b.nurse_name})` : ''}`,
  }))

  return (
    <ComplaintsClient
      complaints={complaints ?? []}
      reporterRole="patient"
      bookingOptions={bookingOptions}
      complaintsEnabled={settings.complaints_enabled}
      complaintWindowHours={settings.complaint_window_hours}
    />
  )
}
