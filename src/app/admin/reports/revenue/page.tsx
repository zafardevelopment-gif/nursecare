import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import RevenueReportClient from './RevenueReportClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ filter?: string; q?: string; date_from?: string; date_to?: string; page?: string; nurse?: string }>
}

export default async function AdminRevenueReportPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params = await searchParams

  const page     = Math.max(1, parseInt(params.page ?? '1'))
  const offset   = (page - 1) * PAGE_SIZE
  const filter   = params.filter ?? ''
  const q        = params.q?.trim() ?? ''
  const dateFrom = params.date_from ?? ''
  const dateTo   = params.date_to ?? ''
  const nurse    = params.nurse?.trim() ?? ''

  let query = supabase
    .from('booking_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filter === 'commission')  query = query.eq('payment_status', 'paid')
  if (filter === 'payouts')     query = query.eq('payment_status', 'paid').eq('status', 'completed')
  if (filter === 'refunds')     query = query.eq('payment_status', 'refunded')
  if (filter === 'service')     query = query.not('service_type', 'is', null)
  if (q)     query = query.or(`patient_name.ilike.%${q}%,nurse_name.ilike.%${q}%,service_type.ilike.%${q}%`)
  if (nurse) query = query.ilike('nurse_name', `%${nurse}%`)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo)   query = query.lte('created_at', dateTo)

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []

  const [
    { data: paidRows },
    { data: refundRows },
    { data: allPaidRows },
  ] = await Promise.all([
    supabase.from('booking_requests').select('total_amount').eq('payment_status', 'paid'),
    supabase.from('booking_requests').select('total_amount').eq('payment_status', 'refunded'),
    supabase.from('booking_requests').select('total_amount, service_type').eq('payment_status', 'paid').eq('status', 'completed'),
  ])

  const totalRevenue   = (paidRows ?? []).reduce((s, r: any) => s + (parseFloat(r.total_amount) || 0), 0)
  const totalRefunds   = (refundRows ?? []).reduce((s, r: any) => s + (parseFloat(r.total_amount) || 0), 0)
  const COMMISSION_PCT = 0.15
  const totalCommission = (allPaidRows ?? []).reduce((s, r: any) => s + (parseFloat(r.total_amount) || 0) * COMMISSION_PCT, 0)
  const totalPayouts    = (allPaidRows ?? []).reduce((s, r: any) => s + (parseFloat(r.total_amount) || 0) * (1 - COMMISSION_PCT), 0)

  // Service-wise breakdown
  const serviceMap: Record<string, number> = {}
  ;(allPaidRows ?? []).forEach((r: any) => {
    const svc = r.service_type ?? 'Unknown'
    serviceMap[svc] = (serviceMap[svc] ?? 0) + (parseFloat(r.total_amount) || 0)
  })
  const serviceBreakdown = Object.entries(serviceMap)
    .sort((a, b) => b[1] - a[1])
    .map(([service, amount]) => ({ service, amount }))

  return (
    <RevenueReportClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{ totalRevenue, totalCommission, totalPayouts, totalRefunds }}
      serviceBreakdown={serviceBreakdown}
      initialFilters={{ filter, q, date_from: dateFrom, date_to: dateTo, nurse }}
    />
  )
}
