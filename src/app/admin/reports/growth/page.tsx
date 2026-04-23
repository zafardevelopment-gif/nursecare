import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import GrowthReportClient from './GrowthReportClient'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ period?: string }>
}

export default async function AdminGrowthReportPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams
  const period   = params.period ?? 'monthly'

  // Get last 12 months of bookings aggregated by month
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const [
    { data: bookingRows },
    { data: userRows },
    { count: totalBookings },
    { count: totalUsers },
    { data: revenueRows },
  ] = await Promise.all([
    supabase.from('booking_requests')
      .select('created_at, status')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true }),
    supabase.from('users')
      .select('created_at, role')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true }),
    supabase.from('booking_requests').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('booking_requests')
      .select('created_at, total_amount')
      .eq('payment_status', 'paid')
      .gte('created_at', twelveMonthsAgo.toISOString()),
  ])

  // Aggregate by month
  const monthMap: Record<string, { bookings: number; users: number; revenue: number; completed: number }> = {}

  function getMonthKey(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  ;(bookingRows ?? []).forEach((r: any) => {
    const k = getMonthKey(r.created_at)
    if (!monthMap[k]) monthMap[k] = { bookings: 0, users: 0, revenue: 0, completed: 0 }
    monthMap[k].bookings++
    if (r.status === 'completed') monthMap[k].completed++
  })

  ;(userRows ?? []).forEach((r: any) => {
    const k = getMonthKey(r.created_at)
    if (!monthMap[k]) monthMap[k] = { bookings: 0, users: 0, revenue: 0, completed: 0 }
    monthMap[k].users++
  })

  ;(revenueRows ?? []).forEach((r: any) => {
    const k = getMonthKey(r.created_at)
    if (!monthMap[k]) monthMap[k] = { bookings: 0, users: 0, revenue: 0, completed: 0 }
    monthMap[k].revenue += parseFloat(r.total_amount) || 0
  })

  const monthlyData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, stats]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      ...stats,
    }))

  return (
    <GrowthReportClient
      monthlyData={monthlyData}
      totalBookings={totalBookings ?? 0}
      totalUsers={totalUsers ?? 0}
      period={period}
    />
  )
}
