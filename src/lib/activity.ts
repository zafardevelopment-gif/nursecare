/**
 * Activity logging helper for NurseCare+
 * Inserts rows into activity_logs via service role (bypasses RLS).
 * Call from server actions — never blocks the main action on failure.
 */

import { createSupabaseServiceRoleClient } from './supabase-server'

export type ActivityAction =
  | 'booking_created'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_in_progress'
  | 'booking_work_done'
  | 'booking_completed'
  | 'nurse_approved'
  | 'nurse_rejected'
  | 'nurse_profile_updated'
  | 'complaint_raised'
  | 'complaint_resolved'
  | 'complaint_rejected'
  | 'leave_requested'
  | 'leave_approved'
  | 'leave_rejected'
  | 'agreement_created'
  | 'agreement_signed'
  | 'agreement_rejected'
  | 'hospital_approved'
  | 'hospital_rejected'
  | 'payment_received'
  | 'payment_reminder_sent'
  | 'admin_settings_changed'
  | 'user_created'
  | 'user_updated'
  | 'notification_sent'

interface LogPayload {
  actorId:     string
  actorName:   string
  actorRole:   string
  action:      ActivityAction
  entityType?: string
  entityId?:   string
  description: string
  meta?:       Record<string, unknown>
}

export async function logActivity(payload: LogPayload): Promise<void> {
  try {
    const supabase = createSupabaseServiceRoleClient()
    await supabase.from('activity_logs').insert({
      actor_id:    payload.actorId,
      actor_name:  payload.actorName,
      actor_role:  payload.actorRole,
      action:      payload.action,
      entity_type: payload.entityType ?? null,
      entity_id:   payload.entityId ?? null,
      description: payload.description,
      meta:        payload.meta ?? {},
    })
  } catch {
    // Never let logging failures break the main action
  }
}
