'use server'

import { createSupabaseServiceRoleClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendNotifications } from '@/lib/notifications'
import { logActivity } from '@/lib/activity'

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
  revalidatePath('/provider/dashboard')
  revalidatePath('/admin/leave')
  revalidatePath('/admin/dashboard')
}

/* ── Check conflicting bookings across a date range ─────────── */
async function getConflictingBookings(nurseUserId: string, startDate: string, endDate: string) {
  const supabase = createSupabaseServiceRoleClient()
  const { data } = await supabase
    .from('booking_requests')
    .select('id, patient_name, service_type, shift, status, start_date')
    .eq('nurse_id', nurseUserId)
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .in('status', ['pending', 'accepted', 'confirmed', 'in_progress'])
  return data ?? []
}

/* ── Submit leave request (nurse) ───────────────────────────── */

export async function submitLeaveRequest(formData: FormData): Promise<{ error?: string }> {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase     = createSupabaseServiceRoleClient()
  const start_date   = (formData.get('start_date') as string)?.trim()
  const end_date_raw = (formData.get('end_date')   as string)?.trim()
  const leave_type   = (formData.get('leave_type') as string)?.trim()
  const reason       = (formData.get('reason')     as string)?.trim()

  // end_date defaults to start_date for single-day leave
  const end_date = end_date_raw || start_date

  if (!start_date) return { error: 'Start date is required' }
  if (!reason)     return { error: 'Reason is required' }

  const validTypes = ['full_day', 'half_day']
  if (!validTypes.includes(leave_type)) return { error: 'Invalid leave type' }

  // Prevent past dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const leaveDay = new Date(start_date + 'T00:00:00')
  if (leaveDay < today) return { error: 'Start date cannot be in the past' }

  // Validate end >= start
  if (end_date < start_date) return { error: 'End date cannot be before start date' }

  // Cap at 30 days
  const diffDays = Math.round((new Date(end_date).getTime() - new Date(start_date).getTime()) / 86400000)
  if (diffDays > 30) return { error: 'Leave duration cannot exceed 30 days' }

  // Check for overlapping pending/approved request
  const { count: dupCount } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('nurse_user_id', user.id)
    .in('status', ['pending', 'approved'])
    .lte('leave_start_date', end_date)
    .gte('leave_end_date', start_date)

  if (dupCount && dupCount > 0) {
    return { error: 'You already have a pending or approved leave that overlaps these dates' }
  }

  // Get nurse name
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Check conflicting bookings across the full date range
  const conflicts = await getConflictingBookings(user.id, start_date, end_date)
  const has_bookings   = conflicts.length > 0
  const conflict_count = conflicts.length
  const is_blocked     = has_bookings  // blocked until conflicts resolved

  const { data: inserted, error } = await supabase.from('leave_requests').insert({
    nurse_user_id:    user.id,
    nurse_name:       profile?.full_name ?? '',
    leave_date:       start_date,         // legacy column
    leave_start_date: start_date,
    leave_end_date:   end_date,
    leave_type,
    reason,
    has_bookings,
    conflict_count,
    is_blocked,
    status: 'pending',
  }).select('id').single()

  if (error) return { error: error.message }

  // ── Auto-approve if no conflicts ──────────────────────────────
  if (!has_bookings && inserted) {
    await supabase
      .from('leave_requests')
      .update({ status: 'approved', auto_approved: true, reviewed_at: new Date().toISOString() })
      .eq('id', inserted.id)

    // Pause nurse for the leave period
    await supabase
      .from('nurses')
      .update({
        is_paused:     true,
        pause_until:   end_date,
        paused_reason: `Approved leave: ${start_date}${end_date !== start_date ? ` – ${end_date}` : ''}`,
      })
      .eq('user_id', user.id)

    void logActivity({
      actorId: user.id, actorName: profile?.full_name ?? 'Nurse', actorRole: 'provider',
      action: 'leave_requested', module: 'leave',
      entityType: 'leave', entityId: inserted.id,
      description: `Leave auto-approved for ${profile?.full_name ?? '—'} — ${start_date}${end_date !== start_date ? ` to ${end_date}` : ''} (no conflicts)`,
      meta: { start_date, end_date, leave_type, auto_approved: true },
    })

    // Notify admins of auto-approval
    const adminIds = await getAdminUserIds()
    if (adminIds.length > 0) {
      await sendNotifications(
        adminIds.map(adminId => ({
          userId: adminId,
          type:   'booking_new' as const,
          title:  '✅ Leave Auto-Approved',
          body:   `Leave auto-approved for ${profile?.full_name ?? 'a nurse'} on ${start_date}${end_date !== start_date ? ` – ${end_date}` : ''} (no conflicting bookings).`,
          data:   { leaveId: inserted.id },
        }))
      )
    }

    revalidateLeave()
    return {}
  }

  // ── Has conflicts — stays pending, blocked ────────────────────
  void logActivity({
    actorId: user.id, actorName: profile?.full_name ?? 'Nurse', actorRole: 'provider',
    action: 'leave_requested', module: 'leave',
    entityType: 'leave', entityId: inserted?.id,
    description: `${profile?.full_name ?? '—'} applied for leave ${start_date}${end_date !== start_date ? ` – ${end_date}` : ''} — ${conflict_count} booking conflict${conflict_count !== 1 ? 's' : ''}`,
    meta: { start_date, end_date, leave_type, has_bookings, conflict_count },
  })

  const adminIds = await getAdminUserIds()
  if (adminIds.length > 0) {
    await sendNotifications(
      adminIds.map(adminId => ({
        userId: adminId,
        type:   'booking_new' as const,
        title:  `⚠️ Leave Request — ${conflict_count} Booking Conflict${conflict_count !== 1 ? 's' : ''}`,
        body:   `${profile?.full_name ?? 'A nurse'} requested leave ${start_date}${end_date !== start_date ? ` – ${end_date}` : ''}. ${conflict_count} active booking${conflict_count !== 1 ? 's' : ''} must be resolved before approval.`,
        data:   { leaveId: inserted?.id },
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
    .select('*')
    .eq('id', leaveId)
    .single()

  if (!leave)                    return { error: 'Leave request not found' }
  if (leave.status !== 'pending') return { error: 'This request has already been reviewed' }

  // Hard block: re-check live conflicts at approval time
  const startDate = leave.leave_start_date ?? leave.leave_date
  const endDate   = leave.leave_end_date   ?? leave.leave_date
  const liveConflicts = await getConflictingBookings(leave.nurse_user_id, startDate, endDate)

  if (liveConflicts.length > 0) {
    return { error: `Cannot approve: ${liveConflicts.length} active booking${liveConflicts.length !== 1 ? 's' : ''} still exist during this leave period. Reassign or cancel them first.` }
  }

  const { error } = await supabase
    .from('leave_requests')
    .update({
      status:      'approved',
      admin_note:  adminNote,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
      is_blocked:  false,
    })
    .eq('id', leaveId)

  if (error) return { error: error.message }

  // Pause nurse for the leave period
  await supabase
    .from('nurses')
    .update({
      is_paused:     true,
      pause_until:   endDate,
      paused_reason: `Admin-approved leave: ${startDate}${endDate !== startDate ? ` – ${endDate}` : ''}`,
    })
    .eq('user_id', leave.nurse_user_id)

  // Notify nurse
  await sendNotifications([{
    userId: leave.nurse_user_id,
    type:   'booking_accepted' as const,
    title:  '✅ Leave Approved',
    body:   `Your leave request for ${startDate}${endDate !== startDate ? ` – ${endDate}` : ''} (${leave.leave_type === 'full_day' ? 'Full Day' : 'Half Day'}) has been approved.${adminNote ? ` Note: ${adminNote}` : ''} Your profile is paused until ${endDate}.`,
    data:   { leaveId },
  }])

  void logActivity({
    actorId: user.id, actorName: 'Admin', actorRole: 'admin',
    action: 'leave_approved', module: 'leave',
    entityType: 'leave', entityId: leaveId,
    description: `Admin approved leave for ${leave.nurse_name ?? '—'} — ${startDate}${endDate !== startDate ? ` to ${endDate}` : ''}`,
    meta: { nurse_name: leave.nurse_name, start_date: startDate, end_date: endDate, admin_note: adminNote },
  })

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
    .select('id, status, nurse_user_id, nurse_name, leave_date, leave_start_date, leave_end_date, leave_type')
    .eq('id', leaveId)
    .single()

  if (!leave)                    return { error: 'Leave request not found' }
  if (leave.status !== 'pending') return { error: 'This request has already been reviewed' }

  const startDate = leave.leave_start_date ?? leave.leave_date
  const endDate   = leave.leave_end_date   ?? leave.leave_date

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
    body:   `Your leave request for ${startDate}${endDate !== startDate ? ` – ${endDate}` : ''} has been rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`,
    data:   { leaveId },
  }])

  void logActivity({
    actorId: user.id, actorName: 'Admin', actorRole: 'admin',
    action: 'leave_rejected', module: 'leave',
    entityType: 'leave', entityId: leaveId,
    description: `Admin rejected leave for ${leave.nurse_name ?? '—'} — ${startDate}${endDate !== startDate ? ` to ${endDate}` : ''}`,
    meta: { nurse_name: leave.nurse_name, start_date: startDate, end_date: endDate, admin_note: adminNote },
  })

  revalidateLeave()
  return {}
}

/* ── Cron: auto-reactivate nurses whose leave ended ─────────── */
export async function reactivateExpiredLeaves(): Promise<{ reactivated: number }> {
  const supabase = createSupabaseServiceRoleClient()
  const today = new Date().toISOString().split('T')[0]

  // Find nurses still paused but whose leave end date has passed
  const { data: expired } = await supabase
    .from('nurses')
    .select('id, user_id, full_name, pause_until')
    .eq('is_paused', true)
    .not('pause_until', 'is', null)
    .lt('pause_until', today)

  if (!expired || expired.length === 0) return { reactivated: 0 }

  const nurseIds = expired.map(n => n.id)

  await supabase
    .from('nurses')
    .update({ is_paused: false, pause_until: null, paused_reason: null, is_available: true })
    .in('id', nurseIds)

  // Log each reactivation
  for (const nurse of expired) {
    void logActivity({
      actorId: nurse.user_id, actorName: nurse.full_name ?? 'Nurse', actorRole: 'provider',
      action: 'nurse_availability_updated', module: 'system',
      entityType: 'nurse',
      description: `Nurse ${nurse.full_name ?? '—'} auto-reactivated after leave ended (was paused until ${nurse.pause_until})`,
      meta: { auto_reactivated: true, was_paused_until: nurse.pause_until },
    })
  }

  // Log cron run
  await supabase.from('cron_log').insert({
    job_name: 'reactivate_expired_leaves',
    affected: expired.length,
    details: { reactivated: expired.map(n => ({ id: n.id, name: n.full_name, pause_until: n.pause_until })) },
  })

  revalidatePath('/provider/dashboard')
  revalidatePath('/patient/booking')
  return { reactivated: expired.length }
}
