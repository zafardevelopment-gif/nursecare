/**
 * In-app notification helper for NurseCare+
 * Inserts rows into the `notifications` table via service role client.
 * Used by server actions and cron jobs.
 */

import { createSupabaseServiceRoleClient } from './supabase-server'

export type NotificationType =
  | 'payment_reminder'
  | 'booking_cancelled_unpaid'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_completed'
  | 'booking_in_progress'
  | 'payment_received'
  | 'booking_new'
  | 'booking_cancelled'
  | 'booking_change_requested'
  | 'booking_change_resolved'

interface NotifPayload {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function sendNotification(payload: NotifPayload): Promise<void> {
  const supabase = createSupabaseServiceRoleClient()
  await supabase.from('notifications').insert({
    user_id:    payload.userId,
    type:       payload.type,
    title:      payload.title,
    body:       payload.body,
    data:       payload.data ?? {},
    is_read:    false,
    created_at: new Date().toISOString(),
  })
}

export async function sendNotifications(payloads: NotifPayload[]): Promise<void> {
  if (!payloads.length) return
  const supabase = createSupabaseServiceRoleClient()
  await supabase.from('notifications').insert(
    payloads.map(p => ({
      user_id:    p.userId,
      type:       p.type,
      title:      p.title,
      body:       p.body,
      data:       p.data ?? {},
      is_read:    false,
      created_at: new Date().toISOString(),
    }))
  )
}
