import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import LeaveClient from './LeaveClient'

export const dynamic = 'force-dynamic'

export default async function ProviderLeavePage() {
  const user    = await requireRole('provider')
  const supabase = createSupabaseServiceRoleClient()

  const [{ data: leaves }, { data: nurseRow }] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('id, leave_date, leave_start_date, leave_end_date, leave_type, reason, status, admin_note, has_bookings, auto_approved, conflict_count, is_blocked, created_at')
      .eq('nurse_user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('nurses')
      .select('is_paused, pause_until')
      .eq('user_id', user.id)
      .single(),
  ])

  return (
    <LeaveClient
      leaves={leaves ?? []}
      isPaused={nurseRow?.is_paused ?? false}
      pauseUntil={nurseRow?.pause_until ?? null}
    />
  )
}
