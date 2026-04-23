import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import ProviderReportsClient from './ProviderReportsClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ status?: string; payment?: string; q?: string; date_from?: string; date_to?: string; page?: string }>
}

export default async function ProviderReportsPage({ searchParams }: Props) {
  const user     = await requireRole('provider')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams

  const page     = Math.max(1, parseInt(params.page ?? '1'))
  const offset   = (page - 1) * PAGE_SIZE
  const status   = params.status ?? ''
  const payment  = params.payment ?? ''
  const q        = params.q?.trim() ?? ''
  const dateFrom = params.date_from ?? ''
  const dateTo   = params.date_to ?? ''

  // Get nurse record to match by name (booking_requests stores nurse_name text)
  const { data: nurseRecord } = await supabase
    .from('nurses')
    .select('full_name, city, hourly_rate')
    .eq('user_id', user.id)
    .single()

  const nurseName = nurseRecord?.full_name ?? user.full_name ?? ''

  let query = supabase
    .from('booking_requests')
    .select('*', { count: 'exact' })
    .eq('nurse_id', user.id)
    .order('created_at', { ascending: false })

  if (status)   query = query.eq('status', status)
  if (payment)  query = query.eq('payment_status', payment)
  if (dateFrom) query = query.gte('start_date', dateFrom)
  if (dateTo)   query = query.lte('start_date', dateTo)
  if (q)        query = query.or(`patient_name.ilike.%${q}%,service_type.ilike.%${q}%,city.ilike.%${q}%`)

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []

  const COMMISSION = 0.15

  const [
    { count: totalJobs },
    { count: completedJobs },
    { count: pendingJobs },
    { count: cancelledJobs },
    { data: earnedRows },
    { data: pendingPayRows },
    { data: leaveRows },
  ] = await Promise.all([
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('nurse_id', user.id),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('nurse_id', user.id).eq('status', 'completed'),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('nurse_id', user.id).in('status', ['accepted', 'confirmed', 'in_progress']),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('nurse_id', user.id).in('status', ['cancelled', 'declined']),
    supabase.from('booking_requests').select('total_amount').eq('nurse_id', user.id).eq('payment_status', 'paid').eq('status', 'completed'),
    supabase.from('booking_requests').select('total_amount').eq('nurse_id', user.id).eq('payment_status', 'unpaid').eq('status', 'completed'),
    supabase.from('leave_requests').select('id, status').eq('nurse_id', user.id),
  ])

  const totalEarned  = (earnedRows ?? []).reduce((s, r: any) => s + (parseFloat(r.total_amount) || 0) * (1 - COMMISSION), 0)
  const pendingPay   = (pendingPayRows ?? []).reduce((s, r: any) => s + (parseFloat(r.total_amount) || 0) * (1 - COMMISSION), 0)
  const totalLeave   = leaveRows?.length ?? 0

  return (
    <ProviderReportsClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{ totalJobs: totalJobs ?? 0, completedJobs: completedJobs ?? 0, pendingJobs: pendingJobs ?? 0, cancelledJobs: cancelledJobs ?? 0, totalEarned, pendingPay, totalLeave }}
      initialFilters={{ status, payment, q, date_from: dateFrom, date_to: dateTo }}
    />
  )
}
