import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import PatientReportsClient from './PatientReportsClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ status?: string; payment?: string; q?: string; date_from?: string; date_to?: string; page?: string }>
}

export default async function PatientReportsPage({ searchParams }: Props) {
  const user     = await requireRole('patient')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams

  const page     = Math.max(1, parseInt(params.page ?? '1'))
  const offset   = (page - 1) * PAGE_SIZE
  const status   = params.status ?? ''
  const payment  = params.payment ?? ''
  const q        = params.q?.trim() ?? ''
  const dateFrom = params.date_from ?? ''
  const dateTo   = params.date_to ?? ''

  let query = supabase
    .from('booking_requests')
    .select('*', { count: 'exact' })
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  if (status)   query = query.eq('status', status)
  if (payment)  query = query.eq('payment_status', payment)
  if (dateFrom) query = query.gte('start_date', dateFrom)
  if (dateTo)   query = query.lte('start_date', dateTo)
  if (q)        query = query.or(`nurse_name.ilike.%${q}%,service_type.ilike.%${q}%,city.ilike.%${q}%`)

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []

  const [
    { count: totalBookings },
    { count: completedBookings },
    { count: pendingBookings },
    { count: cancelledBookings },
    { data: paidRows },
  ] = await Promise.all([
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('patient_id', user.id),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).eq('status', 'completed'),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).in('status', ['pending', 'accepted', 'confirmed', 'in_progress']),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('patient_id', user.id).in('status', ['cancelled', 'declined']),
    supabase.from('booking_requests').select('total_amount').eq('patient_id', user.id).eq('payment_status', 'paid'),
  ])

  const totalSpent = (paidRows ?? []).reduce((s, r: any) => s + (parseFloat(r.total_amount) || 0), 0)

  return (
    <PatientReportsClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{ total: totalBookings ?? 0, completed: completedBookings ?? 0, pending: pendingBookings ?? 0, cancelled: cancelledBookings ?? 0, totalSpent }}
      initialFilters={{ status, payment, q, date_from: dateFrom, date_to: dateTo }}
    />
  )
}
