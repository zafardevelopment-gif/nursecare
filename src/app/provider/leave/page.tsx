import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import LeaveClient from './LeaveClient'

export const dynamic = 'force-dynamic'

export default async function ProviderLeavePage() {
  const user    = await requireRole('provider')
  const supabase = createSupabaseServiceRoleClient()

  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('id, leave_date, leave_type, reason, status, admin_note, has_bookings, created_at')
    .eq('nurse_user_id', user.id)
    .order('created_at', { ascending: false })

  return <LeaveClient leaves={leaves ?? []} />
}
