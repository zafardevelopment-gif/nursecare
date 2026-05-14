import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import CityReportClient from './CityReportClient'

export const dynamic = 'force-dynamic'

export default async function AdminCityReportPage() {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  // Single RPC does GROUP BY city in Postgres — replaces 2 full-table scans + JS aggregation
  const [
    { data: cityRows },
    { count: totalBookings },
  ] = await Promise.all([
    supabase.rpc('city_aggregates'),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }),
  ])

  const cityData = ((cityRows ?? []) as Array<{
    city: string; bookings: number; completed: number; revenue: number; nurses: number
  }>).map(r => ({
    city: r.city,
    bookings: Number(r.bookings),
    completed: Number(r.completed),
    revenue: Number(r.revenue),
    nurses: Number(r.nurses),
  }))

  return (
    <CityReportClient
      cityData={cityData}
      totalBookings={totalBookings ?? 0}
    />
  )
}
