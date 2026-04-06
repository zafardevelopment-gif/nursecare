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

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = await createSupabaseMiddlewareClient(request)
  const pathname = request.nextUrl.pathname

  // Skip auth redirect for server actions — they are POST requests from the client
  // and the user was already authenticated when the page loaded.
  if (request.method === 'POST') {
    await supabase.auth.getUser()
    return supabaseResponse
  }

  // Refresh session — critical, must always run
  const { data: { user } } = await supabase.auth.getUser()

  // If visiting an auth page while already logged in → redirect to dashboard
  if (user && AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role) {
      const dashboardMap: Record<string, string> = {
        patient:  '/patient/dashboard',
        provider: '/provider/dashboard',
        admin:    '/admin/dashboard',
        hospital: '/hospital/dashboard',
      }
      const dest = dashboardMap[profile.role] ?? '/'
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  // Check protected routes
  for (const [prefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      // Not authenticated → login
      if (!user) {
        const loginUrl = new URL('/auth/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }

      // Authenticated but wrong role → unauthorized
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !allowedRoles.includes(profile.role)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }

      break
    }
  }

  // Pass pathname to layouts via request headers for active menu highlighting
  supabaseResponse.headers.set('x-pathname', pathname)
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, public files
     * - API routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
