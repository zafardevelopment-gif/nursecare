'use server'

import { createSupabaseServiceRoleClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logActivity } from '@/lib/activity'
import { getDisputeComplaintSettings } from '@/lib/platform-settings'

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch { return null }
}

async function getUserName(userId: string): Promise<string> {
  try {
    const supabase = createSupabaseServiceRoleClient()
    const { data } = await supabase.from('users').select('full_name').eq('id', userId).single()
    return data?.full_name ?? 'Unknown'
  } catch { return 'Unknown' }
}

function revalidateBookingPaths(bookingId: string) {
  revalidatePath(`/patient/bookings/${bookingId}`)
  revalidatePath('/patient/bookings')
  revalidatePath('/patient/dashboard')
  revalidatePath(`/provider/bookings/${bookingId}`)
  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath('/admin/disputes')
  revalidatePath('/admin/bookings')
}

// ─── Patient reports nurse didn't show up ─────────────────────────────────────
export async function reportProviderNoShow(formData: FormData): Promise<{ error?: string }> {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }

  const bookingId = formData.get('booking_id') as string
  const reason    = (formData.get('reason') as string)?.trim() || 'Provider did not show up'
  const supabase  = createSupabaseServiceRoleClient()

  // Get platform settings
  const settings = await getDisputeComplaintSettings()
  if (!settings.disputes_enabled) {
    return { error: 'Disputes are currently disabled by the platform administrator.' }
  }

  // Verify this booking belongs to the patient
  const { data: booking } = await supabase
    .from('booking_requests')
    .select('id, status, patient_id, nurse_id, nurse_name, patient_name, start_date, service_type, dispute_status, completed_at')
    .eq('id', bookingId)
    .eq('patient_id', userId)
    .single()

  if (!booking) return { error: 'Booking not found' }
  if (booking.dispute_status && booking.dispute_status !== 'none') return { error: 'A dispute already exists for this booking' }

  // Only allow reporting if booking was accepted/confirmed/in_progress
  const allowedStatuses = ['accepted', 'confirmed', 'in_progress']
  if (!allowedStatuses.includes(booking.status)) return { error: 'This booking cannot be disputed at its current status' }

  await supabase
    .from('booking_requests')
    .update({
      status:            'no_show',
      dispute_type:      'provider_no_show',
      dispute_reason:    reason,
      dispute_raised_by: userId,
      dispute_raised_at: new Date().toISOString(),
      dispute_status:    'open',
    })
    .eq('id', bookingId)

  const actorName = await getUserName(userId)
  void logActivity({
    actorId:     userId,
    actorName,
    actorRole:   'patient',
    action:      'dispute_created',
    module:      'dispute',
    entityType:  'booking',
    entityId:    bookingId,
    description: `Patient ${actorName} raised a dispute (provider no-show) for booking with ${booking.nurse_name ?? 'nurse'}`,
    meta:        { dispute_type: 'provider_no_show', booking_id: bookingId, reason },
  })

  revalidateBookingPaths(bookingId)
  return {}
}

// ─── Provider reports patient absent / access denied ─────────────────────────
export async function reportPatientIssue(formData: FormData): Promise<{ error?: string }> {
  const userId   = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }

  const bookingId  = formData.get('booking_id') as string
  const issueType  = (formData.get('issue_type') as string) || 'patient_absent'
  const reason     = (formData.get('reason') as string)?.trim() || 'Patient was not present'
  const supabase   = createSupabaseServiceRoleClient()

  // Get platform settings
  const settings = await getDisputeComplaintSettings()
  if (!settings.disputes_enabled) {
    return { error: 'Disputes are currently disabled by the platform administrator.' }
  }

  // Verify this booking belongs to this nurse
  const { data: booking } = await supabase
    .from('booking_requests')
    .select('id, status, nurse_id, nurse_name, patient_name, dispute_status')
    .eq('id', bookingId)
    .eq('nurse_id', userId)
    .single()

  if (!booking) return { error: 'Booking not found' }
  if (booking.dispute_status && booking.dispute_status !== 'none') return { error: 'A dispute already exists for this booking' }

  const allowedStatuses = ['accepted', 'confirmed', 'in_progress']
  if (!allowedStatuses.includes(booking.status)) return { error: 'This booking cannot be disputed at its current status' }

  const validIssueTypes = ['patient_absent', 'access_denied', 'quality_issue', 'other']
  const safeIssueType = validIssueTypes.includes(issueType) ? issueType : 'other'

  await supabase
    .from('booking_requests')
    .update({
      status:            'disputed',
      dispute_type:      safeIssueType,
      dispute_reason:    reason,
      dispute_raised_by: userId,
      dispute_raised_at: new Date().toISOString(),
      dispute_status:    'open',
    })
    .eq('id', bookingId)

  const actorName = await getUserName(userId)
  void logActivity({
    actorId:     userId,
    actorName,
    actorRole:   'provider',
    action:      'dispute_created',
    module:      'dispute',
    entityType:  'booking',
    entityId:    bookingId,
    description: `Nurse ${actorName} raised a dispute (${safeIssueType.replace(/_/g, ' ')}) for booking with ${booking.patient_name ?? 'patient'}`,
    meta:        { dispute_type: safeIssueType, booking_id: bookingId, reason },
  })

  revalidateBookingPaths(bookingId)
  return {}
}

// ─── Admin: update dispute status (under_review / resolved) ──────────────────
export async function updateDisputeStatus(formData: FormData) {
  const bookingId       = formData.get('booking_id') as string
  const disputeStatus   = formData.get('dispute_status') as string
  const resolution      = (formData.get('resolution') as string)?.trim() || null
  const bookingStatus   = formData.get('booking_status') as string
  const userId          = await getCurrentUserId()
  if (!userId) return

  const validDisputeStatuses = ['open', 'under_review', 'resolved']
  const validBookingStatuses = ['no_show', 'disputed', 'cancelled', 'completed', 'in_progress', 'accepted', 'confirmed']
  if (!validDisputeStatuses.includes(disputeStatus)) return
  if (!validBookingStatuses.includes(bookingStatus)) return

  const supabase = createSupabaseServiceRoleClient()

  const { data: booking } = await supabase
    .from('booking_requests')
    .select('patient_name, nurse_name, dispute_type')
    .eq('id', bookingId)
    .single()

  const update: Record<string, unknown> = {
    dispute_status: disputeStatus,
    status:         bookingStatus,
  }
  if (disputeStatus === 'resolved') {
    update.dispute_resolution  = resolution
    update.dispute_resolved_by = userId
    update.dispute_resolved_at = new Date().toISOString()
    // Stamp completed_at if booking is being marked completed via dispute resolution
    if (bookingStatus === 'completed') {
      update.completed_at = new Date().toISOString()
    }
  }

  await supabase
    .from('booking_requests')
    .update(update)
    .eq('id', bookingId)

  if (disputeStatus === 'resolved') {
    const adminName = await getUserName(userId)
    void logActivity({
      actorId:     userId,
      actorName:   adminName,
      actorRole:   'admin',
      action:      'dispute_resolved',
      module:      'dispute',
      entityType:  'booking',
      entityId:    bookingId,
      description: `Admin ${adminName} resolved dispute (${(booking?.dispute_type ?? 'dispute').replace(/_/g, ' ')}) — outcome: ${bookingStatus}${resolution ? `: ${resolution}` : ''}`,
      meta:        { dispute_type: booking?.dispute_type, booking_id: bookingId, resolution, booking_status: bookingStatus },
    })
  }

  revalidateBookingPaths(bookingId)
  redirect('/admin/disputes')
}

// ─── Check dispute eligibility (used by patient/provider booking detail pages) ─
export async function checkDisputeEligibility(
  bookingId: string,
  role: 'patient' | 'provider'
): Promise<{ allowed: boolean; reason?: string; windowHours?: number; expiresAt?: string }> {
  const settings = await getDisputeComplaintSettings()

  if (!settings.disputes_enabled) {
    return { allowed: false, reason: 'Disputes are currently disabled by the platform administrator.' }
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data: booking } = await supabase
    .from('booking_requests')
    .select('status, completed_at, dispute_status')
    .eq('id', bookingId)
    .single()

  if (!booking) return { allowed: false, reason: 'Booking not found' }
  if (booking.dispute_status && booking.dispute_status !== 'none') {
    return { allowed: false, reason: 'A dispute already exists for this booking' }
  }

  // For completed bookings, check window
  if (booking.status === 'completed' && booking.completed_at) {
    const completedMs = new Date(booking.completed_at).getTime()
    const windowMs    = settings.dispute_window_hours * 60 * 60 * 1000
    const expiresAt   = new Date(completedMs + windowMs)
    if (Date.now() > expiresAt.getTime()) {
      return {
        allowed:      false,
        reason:       'Dispute window has expired.',
        windowHours:  settings.dispute_window_hours,
        expiresAt:    expiresAt.toISOString(),
      }
    }
    return { allowed: true, windowHours: settings.dispute_window_hours, expiresAt: expiresAt.toISOString() }
  }

  return { allowed: true }
}
