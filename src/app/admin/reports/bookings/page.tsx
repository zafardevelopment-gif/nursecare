import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import BookingsReportClient from './BookingsReportClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ status?: string; payment?: string; q?: string; city?: string; date_from?: string; date_to?: string; page?: string }>
}

export default async function AdminBookingsReportPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const page     = Math.max(1, parseInt(params.page ?? '1'))
  const offset   = (page - 1) * PAGE_SIZE
  const status   = params.status ?? ''
  const payment  = params.payment ?? ''
  const q        = params.q?.trim() ?? ''
  const city     = params.city?.trim() ?? ''
  const dateFrom = params.date_from ?? ''
  const dateTo   = params.date_to ?? ''

  // Narrow column list — only what the report grid renders
  const REPORT_COLS = 'id, patient_name, nurse_name, service_type, start_date, city, status, payment_status, total_amount, created_at'

  let query = supabase
    .from('booking_requests')
    .select(REPORT_COLS, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status)   query = query.eq('status', status)
  if (payment)  query = query.eq('payment_status', payment)
  if (city)     query = query.ilike('city', `%${city}%`)
  if (dateFrom) query = query.gte('start_date', dateFrom)
  if (dateTo)   query = query.lte('start_date', dateTo)
  if (q)        query = query.or(`patient_name.ilike.%${q}%,nurse_name.ilike.%${q}%,service_type.ilike.%${q}%`)

  // Parallelize page query + unfiltered summary RPC (single round-trip instead of 4 COUNT + 1 SUM-in-JS)
  const [
    { data, count },
    { data: summaryRows },
  ] = await Promise.all([
    query.range(offset, offset + PAGE_SIZE - 1),
    supabase.rpc('booking_report_summary'),
  ])

  const rows = data ?? []
  const sum = (summaryRows ?? [])[0] as { total: number; completed: number; pending: number; cancelled: number; total_revenue: number } | undefined

  return (
    <BookingsReportClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{
        total:        Number(sum?.total ?? 0),
        completed:    Number(sum?.completed ?? 0),
        pending:      Number(sum?.pending ?? 0),
        cancelled:    Number(sum?.cancelled ?? 0),
        totalRevenue: Number(sum?.total_revenue ?? 0),
      }}
      initialFilters={{ status, payment, q, city, date_from: dateFrom, date_to: dateTo }}
    />
  )
}
