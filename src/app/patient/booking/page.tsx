import PatientBookingClient from './PatientBookingClient'
import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function PatientBookingPage() {
  const user = await requireRole('patient')
  const supabase = await createSupabaseServerClient()

  // Fetch available nurses for Browse & Book mode
  const { data: nursesRaw } = await supabase
    .from('nurses')
    .select('user_id, specialization, city, hourly_rate, nurse_documents(doc_type, file_url)')
    .eq('status', 'approved')
    .eq('is_available', true)
    .limit(20)

  // Fetch user names for each nurse
  const nurseUserIds = (nursesRaw ?? []).map((n: any) => n.user_id)
  const { data: nurseUsers } = nurseUserIds.length > 0
    ? await supabase.from('users').select('id, full_name').in('id', nurseUserIds)
    : { data: [] }

  const userMap = Object.fromEntries((nurseUsers ?? []).map((u: any) => [u.id, u.full_name]))

  const nurseList = (nursesRaw ?? []).map((n: any) => ({
    id: n.user_id,
    name: userMap[n.user_id] ?? 'Unknown',
    specialization: n.specialization ?? 'General Nursing',
    city: n.city ?? 'Riyadh',
    hourlyRate: n.hourly_rate ?? 80,
    photoUrl: (n.nurse_documents as any[])?.find((d: any) => d.doc_type === 'photo')?.file_url ?? null,
  }))

  return <PatientBookingClient userId={user.id} userName={user.full_name} nurses={nurseList} />
}
