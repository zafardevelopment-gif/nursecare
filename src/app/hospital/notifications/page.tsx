import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import NotificationsPageClient from '@/app/components/NotificationsPageClient'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const user = await requireRole('hospital')
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, is_read, created_at, data')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const notifications = data ?? []
  const unreadCount = notifications.filter(n => !n.is_read).length

  return <NotificationsPageClient initialNotifications={notifications} initialUnread={unreadCount} />
}
