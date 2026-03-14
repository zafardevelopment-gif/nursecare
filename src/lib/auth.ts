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

// Role → dashboard URL map
export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  patient:  '/patient/dashboard',
  provider: '/provider/dashboard',
  admin:    '/admin/dashboard',
  hospital: '/hospital/dashboard',
}

/**
 * Returns the current authenticated user merged with the users table row.
 * Returns null if no session exists.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: sessionError } = await supabase.auth.getUser()
  if (sessionError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return null

  return profile as AuthUser
}

/**
 * Asserts that a user is authenticated.
 * Redirects to /auth/login if not.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  return user
}

/**
 * Asserts that a user is authenticated AND has one of the allowed roles.
 * Redirects to /auth/login if unauthenticated, or /unauthorized if wrong role.
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) redirect('/unauthorized')
  return user
}

/**
 * Returns the dashboard path for a given role.
 */
export function getDashboardPath(role: UserRole): string {
  return ROLE_DASHBOARDS[role] ?? '/'
}
