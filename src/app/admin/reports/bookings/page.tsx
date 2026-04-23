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

  let query = supabase
    .from('booking_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status)   query = query.eq('status', status)
  if (payment)  query = query.eq('payment_status', payment)
  if (city)     query = query.ilike('city', `%${city}%`)
  if (dateFrom) query = query.gte('start_date', dateFrom)
  if (dateTo)   query = query.lte('start_date', dateTo)
  if (q)        query = query.or(`patient_name.ilike.%${q}%,nurse_name.ilike.%${q}%,service_type.ilike.%${q}%`)

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []

  // Summary counts (unfiltered for top cards)
  const [
    { count: total },
    { count: completed },
    { count: pending },
    { count: cancelled },
    { data: paidRows },
  ] = await Promise.all([
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).in('status', ['cancelled', 'declined']),
    supabase.from('booking_requests').select('total_amount').eq('payment_status', 'paid'),
  ])

  const totalRevenue = (paidRows ?? []).reduce((s, r: any) => s + (parseFloat(r.total_amount) || 0), 0)

  return (
    <BookingsReportClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{ total: total ?? 0, completed: completed ?? 0, pending: pending ?? 0, cancelled: cancelled ?? 0, totalRevenue }}
      initialFilters={{ status, payment, q, city, date_from: dateFrom, date_to: dateTo }}
    />
  )
}
