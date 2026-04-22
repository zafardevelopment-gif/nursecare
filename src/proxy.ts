import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase-middleware'

// Routes that require authentication, keyed by path prefix → allowed roles
const PROTECTED_ROUTES: Record<string, string[]> = {
  '/patient':  ['patient'],
  '/provider': ['provider'],
  '/admin':    ['admin'],
  '/hospital': ['hospital'],
}

// Routes that logged-in users should NOT visit (auth pages)
const AUTH_ROUTES = ['/auth/login', '/auth/signup']

const DASHBOARD_MAP: Record<string, string> = {
  patient:  '/patient/dashboard',
  provider: '/provider/dashboard',
  admin:    '/admin/dashboard',
  hospital: '/hospital/dashboard',
}

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = await createSupabaseMiddlewareClient(request)
  const pathname = request.nextUrl.pathname

  // Pass pathname header for active sidebar highlighting on every request
  supabaseResponse.headers.set('x-pathname', pathname)

  // Skip heavy auth checks for POST server actions — already authenticated when page loaded
  if (request.method === 'POST') {
    await supabase.auth.getUser()
    return supabaseResponse
  }

  // Refresh session — must always run to keep cookies fresh
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = Object.keys(PROTECTED_ROUTES).some(p => pathname.startsWith(p))
  const isAuthPage  = AUTH_ROUTES.some(r => pathname.startsWith(r))

  // Neither protected nor auth page — pass through immediately, no DB query
  if (!isProtected && !isAuthPage) {
    return supabaseResponse
  }

  // Fetch user role once — used for both redirect and protection checks
  let userRole: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role ?? null

    // Pass user-id and role in headers so server components can skip re-querying
    supabaseResponse.headers.set('x-user-id', user.id)
    if (userRole) supabaseResponse.headers.set('x-user-role', userRole)
  }

  // Logged-in user visiting an auth page → redirect to their dashboard
  if (user && isAuthPage) {
    const dest = userRole ? (DASHBOARD_MAP[userRole] ?? '/') : '/'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Protected route checks
  if (isProtected) {
    // Not authenticated → login
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Wrong role → unauthorized
    const allowedRoles = Object.entries(PROTECTED_ROUTES).find(([p]) => pathname.startsWith(p))?.[1] ?? []
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
