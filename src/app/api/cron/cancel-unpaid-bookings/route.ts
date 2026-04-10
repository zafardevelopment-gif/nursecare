/**
 * POST /api/cron/cancel-unpaid-bookings
 *
 * Called by Vercel Cron (every 30 minutes) or an external scheduler.
 * Finds all booking_requests where:
 *   - payment_status = 'unpaid'
 *   - payment_deadline_at <= NOW()
 *   - status NOT IN ('cancelled', 'completed', 'declined')
 * Cancels them and sends in-app notifications to patient + nurse.
 *
 * Protected by CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { sendNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseServiceRoleClient()
  const now = new Date().toISOString()

  // Fetch overdue unpaid bookings
  const { data: overdue, error } = await supabase
    .from('booking_requests')
    .select('id, patient_id, patient_name, nurse_id, nurse_name, start_date, shift')
    .eq('payment_status', 'unpaid')
    .lte('payment_deadline_at', now)
    .not('status', 'in', '("cancelled","completed","declined")')
    .not('payment_deadline_at', 'is', null)

  if (error) {
    console.error('[cron/cancel-unpaid] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!overdue || overdue.length === 0) {
    return NextResponse.json({ cancelled: 0, message: 'No overdue bookings' })
  }

  const ids = overdue.map(b => b.id)

  // Bulk cancel
  const { error: updateErr } = await supabase
    .from('booking_requests')
    .update({
      status:               'cancelled',
      payment_cancelled_at: now,
    })
    .in('id', ids)

  if (updateErr) {
    console.error('[cron/cancel-unpaid] update error:', updateErr.message)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Also cancel related shift_bookings
  await supabase
    .from('shift_bookings')
    .update({ status: 'cancelled' })
    .in('booking_request_id', ids)
    .eq('status', 'pending')

  // Build notifications for patients + nurses
  const notifPayloads: Parameters<typeof sendNotifications>[0] = []

  for (const b of overdue) {
    // Patient notification
    notifPayloads.push({
      userId: b.patient_id,
      type:   'booking_cancelled_unpaid',
      title:  '❌ Booking Cancelled — Payment Not Received',
      body:   `Your booking for ${b.shift ?? 'a shift'} on ${b.start_date} was automatically cancelled because payment was not completed within the required time. Please rebook if you still need care.`,
      data:   { bookingId: b.id },
    })

    // Nurse notification (if nurse was assigned)
    if (b.nurse_id) {
      notifPayloads.push({
        userId: b.nurse_id,
        type:   'booking_cancelled_unpaid',
        title:  '❌ Booking Cancelled — Patient Did Not Pay',
        body:   `The booking from ${b.patient_name ?? 'a patient'} for ${b.shift ?? 'a shift'} on ${b.start_date} has been cancelled due to non-payment.`,
        data:   { bookingId: b.id },
      })
    }
  }

  await sendNotifications(notifPayloads)

  console.log(`[cron/cancel-unpaid] Cancelled ${ids.length} bookings:`, ids)
  return NextResponse.json({ cancelled: ids.length, ids })
}

// Also support GET for easy manual triggering / Vercel Cron
export async function GET(req: NextRequest) {
  return POST(req)
}
