'use server'

import { createSupabaseServiceRoleClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch { return null }
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
export async function reportProviderNoShow(formData: FormData) {
  const userId    = await getCurrentUserId()
  if (!userId) return
  const bookingId = formData.get('booking_id') as string
  const reason    = (formData.get('reason') as string)?.trim() || 'Provider did not show up'
  const supabase  = createSupabaseServiceRoleClient()

  // Verify this booking belongs to the patient
  const { data: booking } = await supabase
    .from('booking_requests')
    .select('id, status, patient_id, nurse_id, nurse_name, start_date, service_type, dispute_status')
    .eq('id', bookingId)
    .eq('patient_id', userId)
    .single()

  if (!booking) return
  if (booking.dispute_status && booking.dispute_status !== 'none') return // already disputed

  // Only allow reporting if booking was accepted/confirmed/in_progress
  const allowedStatuses = ['accepted', 'confirmed', 'in_progress']
  if (!allowedStatuses.includes(booking.status)) return

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

  revalidateBookingPaths(bookingId)
}

// ─── Provider reports patient absent / access denied ─────────────────────────
export async function reportPatientIssue(formData: FormData) {
  const userId    = await getCurrentUserId()
  if (!userId) return
  const bookingId  = formData.get('booking_id') as string
  const issueType  = (formData.get('issue_type') as string) || 'patient_absent'
  const reason     = (formData.get('reason') as string)?.trim() || 'Patient was not present'
  const supabase   = createSupabaseServiceRoleClient()

  // Verify this booking belongs to this nurse
  const { data: booking } = await supabase
    .from('booking_requests')
    .select('id, status, nurse_id, dispute_status')
    .eq('id', bookingId)
    .eq('nurse_id', userId)
    .single()

  if (!booking) return
  if (booking.dispute_status && booking.dispute_status !== 'none') return

  const allowedStatuses = ['accepted', 'confirmed', 'in_progress']
  if (!allowedStatuses.includes(booking.status)) return

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

  revalidateBookingPaths(bookingId)
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

  const update: Record<string, unknown> = {
    dispute_status: disputeStatus,
    status:         bookingStatus,
  }
  if (disputeStatus === 'resolved') {
    update.dispute_resolution  = resolution
    update.dispute_resolved_by = userId
    update.dispute_resolved_at = new Date().toISOString()
  }

  await supabase
    .from('booking_requests')
    .update(update)
    .eq('id', bookingId)

  revalidateBookingPaths(bookingId)
  redirect('/admin/disputes')
}
