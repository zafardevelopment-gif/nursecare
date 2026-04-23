import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import LeaveReportClient from './LeaveReportClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ status?: string; q?: string; date_from?: string; date_to?: string; page?: string }>
}

export default async function AdminLeaveReportPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams

  const page     = Math.max(1, parseInt(params.page ?? '1'))
  const offset   = (page - 1) * PAGE_SIZE
  const status   = params.status ?? ''
  const q        = params.q?.trim() ?? ''
  const dateFrom = params.date_from ?? ''
  const dateTo   = params.date_to ?? ''

  let query = supabase
    .from('leave_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (dateFrom) query = query.gte('leave_date', dateFrom)
  if (dateTo)   query = query.lte('leave_date', dateTo)
  if (q) query = (query as any).or(`nurse_name.ilike.%${q}%,reason.ilike.%${q}%`)

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)

  // Normalize column names (leave_requests uses leave_date not start_date)
  const rows = (data ?? []).map((r: any) => ({
    ...r,
    nurse_name: r.nurse_name ?? '—',
    nurse_city: r.city ?? '—',
    start_date: r.leave_date ?? r.start_date,
    end_date:   r.leave_date ?? r.end_date,
  }))

  const [
    { count: totalLeave },
    { count: pendingLeave },
    { count: approvedLeave },
    { count: rejectedLeave },
  ] = await Promise.all([
    supabase.from('leave_requests').select('*', { count: 'exact', head: true }),
    supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ])

  return (
    <LeaveReportClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{ total: totalLeave ?? 0, pending: pendingLeave ?? 0, approved: approvedLeave ?? 0, rejected: rejectedLeave ?? 0 }}
      initialFilters={{ status, q, date_from: dateFrom, date_to: dateTo }}
    />
  )
}
