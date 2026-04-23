import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import HospitalReportsClient from './HospitalReportsClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ status?: string; q?: string; date_from?: string; date_to?: string; page?: string; department?: string }>
}

export default async function HospitalReportsPage({ searchParams }: Props) {
  const user     = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams

  const page       = Math.max(1, parseInt(params.page ?? '1'))
  const offset     = (page - 1) * PAGE_SIZE
  const status     = params.status ?? ''
  const q          = params.q?.trim() ?? ''
  const dateFrom   = params.date_from ?? ''
  const dateTo     = params.date_to ?? ''
  const department = params.department?.trim() ?? ''

  // Get hospital record
  const { data: hospitalRecord } = await supabase
    .from('hospitals')
    .select('id, name, city')
    .eq('user_id', user.id)
    .single()

  let query = supabase
    .from('hospital_booking_requests')
    .select('*', { count: 'exact' })
    .eq('hospital_id', hospitalRecord?.id ?? user.id)
    .order('created_at', { ascending: false })

  if (status)     query = query.eq('status', status)
  if (department) query = query.ilike('department', `%${department}%`)
  if (dateFrom)   query = query.gte('start_date', dateFrom)
  if (dateTo)     query = query.lte('start_date', dateTo)
  if (q)          query = query.ilike('department', `%${q}%`)

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []

  const [
    { count: totalRequests },
    { count: pendingRequests },
    { count: approvedRequests },
    { count: completedRequests },
  ] = await Promise.all([
    supabase.from('hospital_booking_requests').select('*', { count: 'exact', head: true }).eq('hospital_id', hospitalRecord?.id ?? user.id),
    supabase.from('hospital_booking_requests').select('*', { count: 'exact', head: true }).eq('hospital_id', hospitalRecord?.id ?? user.id).eq('status', 'pending'),
    supabase.from('hospital_booking_requests').select('*', { count: 'exact', head: true }).eq('hospital_id', hospitalRecord?.id ?? user.id).eq('status', 'approved'),
    supabase.from('hospital_booking_requests').select('*', { count: 'exact', head: true }).eq('hospital_id', hospitalRecord?.id ?? user.id).eq('status', 'completed'),
  ])

  // Department breakdown from all rows
  const { data: allRows } = await supabase
    .from('hospital_booking_requests')
    .select('department, nurses_required, status')
    .eq('hospital_id', hospitalRecord?.id ?? user.id)

  const deptMap: Record<string, { requests: number; nurses: number; completed: number }> = {}
  ;(allRows ?? []).forEach((r: any) => {
    const d = r.department ?? 'Unknown'
    if (!deptMap[d]) deptMap[d] = { requests: 0, nurses: 0, completed: 0 }
    deptMap[d].requests++
    deptMap[d].nurses += r.nurses_required ?? 0
    if (r.status === 'completed') deptMap[d].completed++
  })
  const deptBreakdown = Object.entries(deptMap)
    .sort((a, b) => b[1].requests - a[1].requests)
    .map(([dept, stats]) => ({ dept, ...stats }))

  return (
    <HospitalReportsClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{ total: totalRequests ?? 0, pending: pendingRequests ?? 0, approved: approvedRequests ?? 0, completed: completedRequests ?? 0 }}
      deptBreakdown={deptBreakdown}
      hospitalName={hospitalRecord?.name ?? user.full_name ?? 'Hospital'}
      initialFilters={{ status, q, date_from: dateFrom, date_to: dateTo, department }}
    />
  )
}
