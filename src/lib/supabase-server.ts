import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Module-level singleton — reused across requests in the same serverless instance.
// Using the Transaction pooler URL (port 6543) avoids exhausting Postgres connections
// on Supabase's connection limit; set SUPABASE_DB_URL in env to the pooler endpoint.
let _serviceClient: ReturnType<typeof createClient> | null = null

export function createSupabaseServiceRoleClient() {
  if (_serviceClient) return _serviceClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  _serviceClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      // keepalive reuses TCP connections across requests on the same serverless instance
      fetch: (input, init) => fetch(input, { ...init, keepalive: true }),
    },
  })
  return _serviceClient
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}
