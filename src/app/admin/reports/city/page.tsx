import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import CityReportClient from './CityReportClient'

export const dynamic = 'force-dynamic'

export default async function AdminCityReportPage() {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const [
    { data: bookingCities },
    { data: nurseCities },
    { count: totalBookings },
  ] = await Promise.all([
    supabase.from('booking_requests').select('city, status, total_amount, payment_status'),
    supabase.from('nurses').select('city, status'),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }),
  ])

  // Aggregate by city
  const cityMap: Record<string, { city: string; bookings: number; completed: number; revenue: number; nurses: number }> = {}

  ;(bookingCities ?? []).forEach((r: any) => {
    const c = r.city ?? 'Unknown'
    if (!cityMap[c]) cityMap[c] = { city: c, bookings: 0, completed: 0, revenue: 0, nurses: 0 }
    cityMap[c].bookings++
    if (r.status === 'completed') cityMap[c].completed++
    if (r.payment_status === 'paid') cityMap[c].revenue += parseFloat(r.total_amount) || 0
  })

  ;(nurseCities ?? []).forEach((r: any) => {
    const c = r.city ?? 'Unknown'
    if (!cityMap[c]) cityMap[c] = { city: c, bookings: 0, completed: 0, revenue: 0, nurses: 0 }
    if (r.status === 'approved') cityMap[c].nurses++
  })

  const cityData = Object.values(cityMap).sort((a, b) => b.bookings - a.bookings)

  return (
    <CityReportClient
      cityData={cityData}
      totalBookings={totalBookings ?? 0}
    />
  )
}
