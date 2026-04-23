import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import ComplaintsReportClient from './ComplaintsReportClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ status?: string; type?: string; q?: string; date_from?: string; date_to?: string; page?: string }>
}

export default async function AdminComplaintsReportPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams

  const page     = Math.max(1, parseInt(params.page ?? '1'))
  const offset   = (page - 1) * PAGE_SIZE
  const status   = params.status ?? ''
  const type     = params.type ?? ''
  const q        = params.q?.trim() ?? ''
  const dateFrom = params.date_from ?? ''
  const dateTo   = params.date_to ?? ''

  let query = supabase
    .from('complaints')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (type)   query = query.eq('complaint_type', type)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo)   query = query.lte('created_at', dateTo)
  if (q)        query = query.ilike('description', `%${q}%`)

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []

  const [
    { count: totalComplaints },
    { count: openComplaints },
    { count: resolvedComplaints },
    { count: rejectedComplaints },
  ] = await Promise.all([
    supabase.from('complaints').select('*', { count: 'exact', head: true }),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ])

  return (
    <ComplaintsReportClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{ total: totalComplaints ?? 0, open: openComplaints ?? 0, resolved: resolvedComplaints ?? 0, rejected: rejectedComplaints ?? 0 }}
      initialFilters={{ status, type, q, date_from: dateFrom, date_to: dateTo }}
    />
  )
}
