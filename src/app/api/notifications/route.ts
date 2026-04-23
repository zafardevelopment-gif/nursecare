import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET — fetch notifications for the logged-in user
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ notifications: [], unreadCount: 0 })

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, is_read, created_at, data')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ notifications: [], unreadCount: 0 })

  const notifications = data ?? []
  const unreadCount = notifications.filter(n => !n.is_read).length

  return NextResponse.json({ notifications, unreadCount })
}

// PATCH — mark one or all as read
export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const serviceSupabase = createSupabaseServiceRoleClient()

  if (body.markAll) {
    await serviceSupabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    return NextResponse.json({ ok: true })
  }

  if (body.id) {
    await serviceSupabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
