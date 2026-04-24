'use server'

import { createSupabaseServiceRoleClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendNotifications } from '@/lib/notifications'
import { logActivity } from '@/lib/activity'
import { getDisputeComplaintSettings } from '@/lib/platform-settings'

async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getAdminUserIds(): Promise<string[]> {
  const supabase = createSupabaseServiceRoleClient()
  const { data } = await supabase.from('users').select('id').eq('role', 'admin')
  return (data ?? []).map(r => r.id)
}

function revalidateComplaints() {
  revalidatePath('/admin/complaints')
  revalidatePath('/patient/complaints')
  revalidatePath('/provider/complaints')
  revalidatePath('/hospital/complaints')
}

const VALID_TYPES = ['no_show','late_arrival','misbehavior','service_quality','payment_issue','wrong_cancellation','safety_issue','other']
const VALID_ROLES = ['patient','provider','hospital']

/* ── Submit complaint ────────────────────────────────────────── */

export async function submitComplaint(formData: FormData): Promise<{ error?: string; id?: string }> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase        = createSupabaseServiceRoleClient()
  const complaint_type  = (formData.get('complaint_type')  as string)?.trim()
  const description     = (formData.get('description')      as string)?.trim()
  const booking_id      = (formData.get('booking_id')       as string)?.trim() || null
  const reporter_role   = (formData.get('reporter_role')    as string)?.trim()
  const image_url       = (formData.get('image_url')        as string)?.trim() || null

  if (!complaint_type)               return { error: 'Complaint type is required' }
  if (!description)                  return { error: 'Description is required' }
  if (description.length < 20)       return { error: 'Please provide more detail (at least 20 characters)' }
  if (!VALID_TYPES.includes(complaint_type)) return { error: 'Invalid complaint type' }
  if (!VALID_ROLES.includes(reporter_role))  return { error: 'Invalid reporter role' }

  // Get platform settings (complaints enabled + window)
  const settings = await getDisputeComplaintSettings()

  if (!settings.complaints_enabled) {
    return { error: 'Complaints are currently disabled by the platform administrator.' }
  }

  // Get reporter name
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // If booking_id provided, verify it belongs to this user
  if (booking_id) {
    let ownershipCheck
    if (reporter_role === 'patient') {
      const { data } = await supabase
        .from('booking_requests')
        .select('id, status, completed_at')
        .eq('id', booking_id)
        .eq('patient_id', user.id)
        .single()
      ownershipCheck = data

      // Time-limit check: if booking is completed, enforce window
      if (ownershipCheck && ownershipCheck.status === 'completed' && ownershipCheck.completed_at) {
        const completedMs  = new Date(ownershipCheck.completed_at).getTime()
        const windowMs     = settings.complaint_window_hours * 60 * 60 * 1000
        const expiredAt    = new Date(completedMs + windowMs)
        if (Date.now() > expiredAt.getTime()) {
          // Log the blocked attempt
          void logActivity({
            actorId:     user.id,
            actorName:   profile?.full_name ?? 'Unknown',
            actorRole:   reporter_role,
            action:      'complaint_expired_blocked',
            module:      'complaint',
            entityType:  'complaint',
            entityId:    booking_id,
            description: `Complaint submission blocked — window expired for booking (${complaint_type.replace(/_/g, ' ')})`,
            meta:        { complaint_type, booking_id, expired_at: expiredAt.toISOString() },
          })
          return { error: 'Complaint submission period has expired. The allowed window after booking completion has passed.' }
        }
      }
    } else if (reporter_role === 'provider') {
      const { data } = await supabase
        .from('booking_requests')
        .select('id, status, completed_at')
        .eq('id', booking_id)
        .eq('nurse_id', user.id)
        .single()
      ownershipCheck = data

      if (ownershipCheck && ownershipCheck.status === 'completed' && ownershipCheck.completed_at) {
        const completedMs = new Date(ownershipCheck.completed_at).getTime()
        const windowMs    = settings.complaint_window_hours * 60 * 60 * 1000
        const expiredAt   = new Date(completedMs + windowMs)
        if (Date.now() > expiredAt.getTime()) {
          void logActivity({
            actorId:     user.id,
            actorName:   profile?.full_name ?? 'Unknown',
            actorRole:   reporter_role,
            action:      'complaint_expired_blocked',
            module:      'complaint',
            entityType:  'complaint',
            entityId:    booking_id,
            description: `Complaint submission blocked — window expired for booking (${complaint_type.replace(/_/g, ' ')})`,
            meta:        { complaint_type, booking_id, expired_at: expiredAt.toISOString() },
          })
          return { error: 'Complaint submission period has expired. The allowed window after booking completion has passed.' }
        }
      }
    } else {
      // hospital — check hospital_booking_requests
      const { data: hospital } = await supabase
        .from('hospitals')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (hospital) {
        const { data } = await supabase
          .from('hospital_booking_requests')
          .select('id')
          .eq('id', booking_id)
          .eq('hospital_id', hospital.id)
          .single()
        ownershipCheck = data
      }
    }
    if (!ownershipCheck) return { error: 'Booking not found or does not belong to you' }
  }

  // Calculate expires_at for this complaint
  const now       = new Date()
  const expiresAt = new Date(now.getTime() + settings.complaint_window_hours * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('complaints')
    .insert({
      reporter_id:   user.id,
      reporter_role,
      reporter_name: profile?.full_name ?? '',
      booking_id:    booking_id || null,
      complaint_type,
      description,
      image_url,
      status:        'open',
      expires_at:    expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Notify reporter + admins
  const adminIds = await getAdminUserIds()
  const notifs: Parameters<typeof sendNotifications>[0] = [
    {
      userId: user.id,
      type:   'booking_new' as const,
      title:  '📣 Complaint Submitted',
      body:   'Your complaint has been received. Our admin team will review it shortly.',
      data:   { complaintId: data.id },
    },
    ...adminIds.map(adminId => ({
      userId: adminId,
      type:   'booking_new' as const,
      title:  '📣 New Complaint',
      body:   `${profile?.full_name ?? 'A user'} (${reporter_role}) submitted a complaint: ${complaint_type.replace(/_/g, ' ')}.`,
      data:   { complaintId: data.id },
    })),
  ]

  await sendNotifications(notifs)
  void logActivity({
    actorId:     user.id,
    actorName:   profile?.full_name ?? 'Unknown',
    actorRole:   reporter_role,
    action:      'complaint_raised',
    module:      'complaint',
    entityType:  'complaint',
    entityId:    data.id,
    description: `${profile?.full_name ?? 'A user'} (${reporter_role}) raised a complaint: ${complaint_type.replace(/_/g, ' ')}`,
    meta:        { complaint_type, booking_id },
  })
  revalidateComplaints()
  return { id: data.id }
}

/* ── Update complaint status (admin) ─────────────────────────── */

export async function updateComplaintStatus(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase   = createSupabaseServiceRoleClient()
  const id         = (formData.get('complaint_id') as string)?.trim()
  const status     = (formData.get('status')        as string)?.trim()
  const admin_note = (formData.get('admin_note')    as string)?.trim() || null

  if (!id) return { error: 'Missing complaint ID' }

  const validStatuses = ['open', 'resolved', 'rejected']
  if (!validStatuses.includes(status)) return { error: 'Invalid status' }

  const { data: complaint } = await supabase
    .from('complaints')
    .select('id, status, reporter_id, complaint_type')
    .eq('id', id)
    .single()

  if (!complaint) return { error: 'Complaint not found' }

  const { error } = await supabase
    .from('complaints')
    .update({
      status,
      admin_note,
      reviewed_by:  user.id,
      reviewed_at:  new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  // Notify reporter of status change
  const statusLabels: Record<string, string> = {
    resolved: '✅ Your complaint has been resolved.',
    rejected: '❌ Your complaint has been reviewed and closed.',
    open:     '🔄 Your complaint status has been updated.',
  }
  await sendNotifications([{
    userId: complaint.reporter_id,
    type:   'booking_change_resolved' as const,
    title:  '📣 Complaint Update',
    body:   `${statusLabels[status] ?? 'Status updated.'}${admin_note ? ` Admin note: ${admin_note}` : ''}`,
    data:   { complaintId: id },
  }])

  // Get admin name for log
  const { data: adminProfile } = await supabase.from('users').select('full_name').eq('id', user.id).single()
  const action = status === 'resolved' ? 'complaint_resolved' : status === 'rejected' ? 'complaint_rejected' : 'complaint_closed'
  void logActivity({
    actorId:     user.id,
    actorName:   adminProfile?.full_name ?? 'Admin',
    actorRole:   'admin',
    action,
    module:      'complaint',
    entityType:  'complaint',
    entityId:    id,
    description: `Admin ${status} complaint (${complaint.complaint_type?.replace(/_/g, ' ') ?? ''})${admin_note ? ': ' + admin_note : ''}`,
    meta:        { complaint_id: id, status, admin_note },
  })
  revalidateComplaints()
  return {}
}
