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

  // eslint-disable-next-line react-hooks/purity -- server component, computing "30 days ago" cutoff
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

  const [{ data, count }, { data: summaryRow }] = await Promise.all([
    query.range(offset, offset + PAGE_SIZE - 1),
    // Single RPC replaces 5 separate count queries — one DB round-trip
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('user_summary_counts', { active_since: thirtyDaysAgo }),
  ])
  const rows = data ?? []

  type SummaryRow = { total_users: number; total_patients: number; total_nurses: number; total_hospitals: number; active_users: number }
  const s = (summaryRow as unknown as SummaryRow[] | null)?.[0] ?? { total_users: 0, total_patients: 0, total_nurses: 0, total_hospitals: 0, active_users: 0 }

  return (
    <UsersReportClient
      initialData={rows}
      initialCount={count ?? 0}
      initialPage={page}
      summary={{ totalUsers: s.total_users, totalPatients: s.total_patients, totalNurses: s.total_nurses, totalHospitals: s.total_hospitals, activeUsers: s.active_users }}
      initialFilters={{ role, q, active, city }}
    />
  )
}
