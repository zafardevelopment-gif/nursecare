'use server'

import { createSupabaseServiceRoleClient, createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function respondToHospitalBooking(
  bookingId: string,
  response: 'accepted' | 'rejected'
): Promise<void> {
  const supabase_user = await createSupabaseServerClient()
  const { data: { user } } = await supabase_user.auth.getUser()
  if (!user) return

  const supabase = createSupabaseServiceRoleClient()

  // Fetch the booking
  const { data: booking } = await supabase
    .from('hospital_booking_requests')
    .select('nurse_selections, status')
    .eq('id', bookingId)
    .single()

  if (!booking) return

  const selections: any[] = booking.nurse_selections ?? []

  // If the overall booking is confirmed/matched, treat all pending selections as implicitly approved
  const bookingImpliesApproval = booking.status === 'confirmed' || booking.status === 'matched'

  // Update all entries for this nurse with their response
  let anyAccepted = false
  const updated = selections.map((ns: any) => {
    if (ns.nurseId !== user.id) return ns
    if (response === 'accepted') anyAccepted = true
    const implicitlyApproved = bookingImpliesApproval && (!ns.status || ns.status === 'pending')
    return {
      ...ns,
      ...(implicitlyApproved ? { status: 'approved' } : {}),
      nurseResponse: response,
      nurseRespondedAt: new Date().toISOString(),
    }
  })

  // If nurse rejected all their assignments, update their status to rejected
  const finalSelections = updated.map((ns: any) => {
    if (ns.nurseId !== user.id) return ns
    if (ns.nurseResponse === 'rejected') {
      return { ...ns, status: 'rejected' }
    }
    return ns
  })

  // Recalculate booking status
  const allDecided = finalSelections.every(
    (s: any) => (s.status === 'approved' || s.status === 'rejected') && s.nurseResponse
  )
  const anyApprovedAndAccepted = finalSelections.some(
    (s: any) => s.status === 'approved' && s.nurseResponse === 'accepted'
  )

  let newBookingStatus = booking.status
  if (allDecided && anyApprovedAndAccepted) {
    newBookingStatus = 'confirmed'
  }

  await supabase
    .from('hospital_booking_requests')
    .update({
      nurse_selections: finalSelections,
      status: newBookingStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  revalidatePath(`/provider/bookings/hospital/${bookingId}`)
  revalidatePath('/provider/bookings')
  revalidatePath('/provider/dashboard')
  revalidatePath(`/admin/hospital-bookings/${bookingId}`)
  revalidatePath('/hospital/booking')
}
