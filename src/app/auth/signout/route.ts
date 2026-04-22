import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  // Use request origin so redirect works in any environment (local, Vercel, custom domain)
  const origin = request.nextUrl.origin
  return NextResponse.redirect(new URL('/', origin))
}
