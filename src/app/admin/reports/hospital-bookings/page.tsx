import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import HospitalBookingsReportClient from './HospitalBookingsReportClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ status?: string; q?: string; date_from?: string; date_to?: string; page?: string; city?: string }>
}

export default async function AdminHospitalBookingsReportPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams

  const page     = Math.max(1, parseInt(params.page ?? '1'))
  const offset   = (page - 1) * PAGE_SIZE
  const status   = params.status ?? ''
  const q        = params.q?.trim() ?? ''
  const dateFrom = params.date_from ?? ''
  const dateTo   = params.date_to ?? ''
  const city     = params.city?.trim() ?? ''

  let query = supabase
    .from('hospital_booking_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (city)   query = query.ilike('city', `%${city}%`)
  if (dateFrom) query = query.gte('start_date', dateFrom)
  if (dateTo)   query = query.lte('start_date', dateTo)
  if (q)        query = query.or(`hospital_name.ilike.%${q}%,department.ilike.%${q}%`)

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []

  const [
    { count: total },
    { count: pending },
    { count: approved },
    { count: completed },
  ] = await Promise.all([
    supabase.from('hospital_booking_requests').select('*', { count: 'exact', head: true }),
    supabase.from('hospital_booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('hospital_booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('hospital_booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
  ])

  return (
    <HospitalBookingsReportClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{ total: total ?? 0, pending: pending ?? 0, approved: approved ?? 0, completed: completed ?? 0 }}
      initialFilters={{ status, q, date_from: dateFrom, date_to: dateTo, city }}
    />
  )
}
