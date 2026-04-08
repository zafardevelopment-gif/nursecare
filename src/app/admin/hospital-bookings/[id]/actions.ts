'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateBookingStatusAction(formData: FormData): Promise<void> {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const bookingId = formData.get('booking_id') as string
  const newStatus = formData.get('status') as string
  const adminNotes = (formData.get('admin_notes') as string) || null

  await supabase
    .from('hospital_booking_requests')
    .update({ status: newStatus, admin_notes: adminNotes, updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  revalidatePath(`/admin/hospital-bookings/${bookingId}`)
  revalidatePath('/admin/hospital-bookings')
}

export async function updateNurseApprovalAction(formData: FormData): Promise<void> {
  const user = await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const bookingId  = formData.get('booking_id') as string
  const nurseIndex = parseInt(formData.get('nurse_index') as string)
  const newStatus  = formData.get('nurse_status') as 'approved' | 'rejected' | 'pending'

  // Fetch current nurse_selections
  const { data: booking } = await supabase
    .from('hospital_booking_requests')
    .select('nurse_selections')
    .eq('id', bookingId)
    .single()

  if (!booking) return

  const selections: any[] = booking.nurse_selections ?? []
  if (nurseIndex < 0 || nurseIndex >= selections.length) return

  selections[nurseIndex] = {
    ...selections[nurseIndex],
    status:     newStatus,
    approvedBy: user.full_name,
    approvedAt: new Date().toISOString(),
  }

  // Check if all nurses now have a decision → auto-set booking status to matched
  const allDecided = selections.every(s => s.status === 'approved' || s.status === 'rejected')
  const anyApproved = selections.some(s => s.status === 'approved')

  const bookingStatus = allDecided && anyApproved ? 'matched' : 'reviewing'

  await supabase
    .from('hospital_booking_requests')
    .update({
      nurse_selections: selections,
      status: bookingStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  revalidatePath(`/admin/hospital-bookings/${bookingId}`)
  revalidatePath('/admin/hospital-bookings')
}
