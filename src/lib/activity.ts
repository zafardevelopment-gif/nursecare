/**
 * Activity logging helper for NurseCare+
 * Inserts rows into activity_logs via service role (bypasses RLS).
 * Call from server actions — never blocks the main action on failure.
 */

import { createSupabaseServiceRoleClient } from './supabase-server'

export type ActivityAction =
  // Bookings
  | 'booking_created'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_cancel_requested'
  | 'booking_reschedule_requested'
  | 'booking_on_the_way'
  | 'booking_in_progress'
  | 'booking_work_done'
  | 'booking_completed'
  | 'booking_payment_done'
  // Nurses / Providers
  | 'nurse_registered'
  | 'nurse_approved'
  | 'nurse_rejected'
  | 'nurse_profile_updated'
  | 'nurse_availability_updated'
  // Leave
  | 'leave_requested'
  | 'leave_approved'
  | 'leave_rejected'
  // Complaints
  | 'complaint_raised'
  | 'complaint_resolved'
  | 'complaint_rejected'
  | 'complaint_closed'
  | 'complaint_expired_blocked'
  // Disputes
  | 'dispute_created'
  | 'dispute_resolved'
  | 'dispute_expired_blocked'
  // Agreements
  | 'agreement_created'
  | 'agreement_signed'
  | 'agreement_rejected'
  // Hospital
  | 'hospital_approved'
  | 'hospital_rejected'
  | 'hospital_booking_created'
  | 'hospital_booking_updated'
  // Payments
  | 'payment_received'
  | 'payment_reminder_sent'
  // Admin / System
  | 'admin_settings_changed'
  | 'developer_settings_changed'
  | 'homepage_settings_changed'
  | 'user_created'
  | 'user_updated'
  | 'notification_sent'

export type ActivityModule =
  | 'booking'
  | 'nurse'
  | 'patient'
  | 'leave'
  | 'complaint'
  | 'dispute'
  | 'agreement'
  | 'hospital'
  | 'payment'
  | 'settings'
  | 'homepage'
  | 'auth'
  | 'system'

interface LogPayload {
  actorId:     string
  actorName:   string
  actorRole:   string
  action:      ActivityAction
  module?:     ActivityModule
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
      entity_type: payload.entityType ?? payload.module ?? null,
      entity_id:   payload.entityId ?? null,
      description: payload.description,
      meta:        { module: payload.module, ...(payload.meta ?? {}) },
    })
  } catch {
    // Never let logging failures break the main action
  }
}
