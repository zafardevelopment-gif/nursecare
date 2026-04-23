import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import UsersReportClient from './UsersReportClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ role?: string; q?: string; active?: string; page?: string; city?: string }>
}

export default async function AdminUsersReportPage({ searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const params   = await searchParams

  const page   = Math.max(1, parseInt(params.page ?? '1'))
  const offset = (page - 1) * PAGE_SIZE
  const role   = params.role ?? ''
  const q      = params.q?.trim() ?? ''
  const active = params.active ?? ''
  const city   = params.city?.trim() ?? ''

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (role)   query = query.eq('role', role)
  if (city)   query = query.ilike('city', `%${city}%`)
  if (q)      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  if (active === 'true')  query = query.gte('last_sign_in_at', thirtyDaysAgo)
  if (active === 'false') query = query.or(`last_sign_in_at.is.null,last_sign_in_at.lt.${thirtyDaysAgo}`)

  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []

  const [
    { count: totalUsers },
    { count: totalPatients },
    { count: totalNurses },
    { count: totalHospitals },
    { count: activeUsers },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'provider'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'hospital'),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_sign_in_at', thirtyDaysAgo),
  ])

  return (
    <UsersReportClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{ totalUsers: totalUsers ?? 0, totalPatients: totalPatients ?? 0, totalNurses: totalNurses ?? 0, totalHospitals: totalHospitals ?? 0, activeUsers: activeUsers ?? 0 }}
      initialFilters={{ role, q, active, city }}
    />
  )
}
