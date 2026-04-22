'use server'

import { createSupabaseServiceRoleClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendNotifications } from '@/lib/notifications'

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

function revalidateLeave() {
  revalidatePath('/provider/leave')
  revalidatePath('/admin/leave')
}

/* ── Submit leave request (nurse) ───────────────────────────── */

export async function submitLeaveRequest(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase   = createSupabaseServiceRoleClient()
  const leave_date = (formData.get('leave_date') as string)?.trim()
  const leave_type = (formData.get('leave_type') as string)?.trim()
  const reason     = (formData.get('reason') as string)?.trim()

  if (!leave_date) return { error: 'Leave date is required' }
  if (!reason)     return { error: 'Reason is required' }

  const validTypes = ['full_day', 'half_day']
  if (!validTypes.includes(leave_type)) return { error: 'Invalid leave type' }

  // Prevent past dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const leaveDay = new Date(leave_date + 'T00:00:00')
  if (leaveDay < today) return { error: 'Leave date cannot be in the past' }

  // Check for duplicate pending request on same date
  const { count: dupCount } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('nurse_user_id', user.id)
    .eq('leave_date', leave_date)
    .eq('status', 'pending')

  if (dupCount && dupCount > 0) {
    return { error: 'You already have a pending leave request for this date' }
  }

  // Get nurse name
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Check if nurse has bookings on this date
  const { count: bookingCount } = await supabase
    .from('booking_requests')
    .select('*', { count: 'exact', head: true })
    .eq('nurse_id', user.id)
    .eq('start_date', leave_date)
    .in('status', ['pending', 'accepted', 'confirmed', 'in_progress'])

  const has_bookings = (bookingCount ?? 0) > 0

  const { error } = await supabase.from('leave_requests').insert({
    nurse_user_id: user.id,
    nurse_name:    profile?.full_name ?? '',
    leave_date,
    leave_type,
    reason,
    has_bookings,
    status: 'pending',
  })

  if (error) return { error: error.message }

  // Notify admins
  const adminIds = await getAdminUserIds()
  if (adminIds.length > 0) {
    await sendNotifications(
      adminIds.map(adminId => ({
        userId: adminId,
        type:   'booking_new' as const,
        title:  has_bookings ? '⚠️ Leave Request (Has Bookings)' : '📅 Leave Request',
        body:   `${profile?.full_name ?? 'A nurse'} requested leave on ${leave_date}${has_bookings ? ' — they have active bookings on this date' : ''}.`,
        data:   { leaveDate: leave_date },
      }))
    )
  }

  revalidateLeave()
  return {}
}

/* ── Approve leave request (admin) ──────────────────────────── */

export async function approveLeaveRequest(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase  = createSupabaseServiceRoleClient()
  const leaveId   = (formData.get('leave_id') as string)?.trim()
  const adminNote = (formData.get('admin_note') as string)?.trim() || null

  if (!leaveId) return { error: 'Missing leave ID' }

  const { data: leave } = await supabase
    .from('leave_requests')
    .select('id, status, nurse_user_id, nurse_name, leave_date, leave_type')
    .eq('id', leaveId)
    .single()

  if (!leave)                    return { error: 'Leave request not found' }
  if (leave.status !== 'pending') return { error: 'This request has already been reviewed' }

  const { error } = await supabase
    .from('leave_requests')
    .update({
      status:      'approved',
      admin_note:  adminNote,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    })
    .eq('id', leaveId)

  if (error) return { error: error.message }

  // Notify nurse
  await sendNotifications([{
    userId: leave.nurse_user_id,
    type:   'booking_accepted' as const,
    title:  '✅ Leave Approved',
    body:   `Your leave request for ${leave.leave_date} (${leave.leave_type === 'full_day' ? 'Full Day' : 'Half Day'}) has been approved.${adminNote ? ` Note: ${adminNote}` : ''}`,
    data:   { leaveId },
  }])

  revalidateLeave()
  return {}
}

/* ── Reject leave request (admin) ───────────────────────────── */

export async function rejectLeaveRequest(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase  = createSupabaseServiceRoleClient()
  const leaveId   = (formData.get('leave_id') as string)?.trim()
  const adminNote = (formData.get('admin_note') as string)?.trim() || null

  if (!leaveId) return { error: 'Missing leave ID' }

  const { data: leave } = await supabase
    .from('leave_requests')
    .select('id, status, nurse_user_id, nurse_name, leave_date, leave_type')
    .eq('id', leaveId)
    .single()

  if (!leave)                    return { error: 'Leave request not found' }
  if (leave.status !== 'pending') return { error: 'This request has already been reviewed' }

  const { error } = await supabase
    .from('leave_requests')
    .update({
      status:      'rejected',
      admin_note:  adminNote,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    })
    .eq('id', leaveId)

  if (error) return { error: error.message }

  // Notify nurse
  await sendNotifications([{
    userId: leave.nurse_user_id,
    type:   'booking_declined' as const,
    title:  '❌ Leave Rejected',
    body:   `Your leave request for ${leave.leave_date} has been rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`,
    data:   { leaveId },
  }])

  revalidateLeave()
  return {}
}
