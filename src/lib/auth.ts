import { createSupabaseServerClient } from './supabase-server'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'provider' | 'patient' | 'hospital'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  city: string | null
  avatar_url: string | null
  is_active: boolean
  preferred_lang: 'ar' | 'en'
}

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  patient:  '/patient/dashboard',
  provider: '/provider/dashboard',
  admin:    '/admin/dashboard',
  hospital: '/hospital/dashboard',
}

/**
 * Returns the current authenticated user merged with the users table row.
 * Fetches session + profile in parallel for minimum latency.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient()

  // getUser() validates the JWT with the Supabase Auth server — must be first
  const { data: { user }, error: sessionError } = await supabase.auth.getUser()
  if (sessionError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, full_name, phone, role, city, avatar_url, is_active, preferred_lang')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return null

  return profile as AuthUser
}

/**
 * Asserts authenticated. Redirects to /auth/login if not.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  return user
}

/**
 * Asserts authenticated with one of the given roles.
 * Middleware already validated the session at the edge, so this is a
 * lightweight profile-only check on protected routes.
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) redirect('/unauthorized')
  return user
}

/**
 * For use inside server actions — throws instead of redirecting.
 */
export async function requireRoleAction(...roles: UserRole[]): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error('NOT_AUTHENTICATED')
  if (!roles.includes(user.role)) throw new Error('UNAUTHORIZED')
  return user
}

export function getDashboardPath(role: UserRole): string {
  return ROLE_DASHBOARDS[role] ?? '/'
}
