/**
 * POST /api/cron/auto-confirm-work-done
 *
 * Called by Vercel Cron (every 30 minutes).
 * Finds all booking_requests where:
 *   - status = 'work_done'
 *   - auto_confirm_at <= NOW()  (deadline passed)
 * Auto-confirms them as 'completed' and notifies patient + nurse.
 *
 * Protected by CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { sendNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseServiceRoleClient()
  const now = new Date().toISOString()

  // Find work_done bookings past their auto_confirm_at deadline
  const { data: overdue, error } = await supabase
    .from('booking_requests')
    .select('id, patient_id, patient_name, nurse_id, nurse_name, start_date, shift')
    .eq('status', 'work_done')
    .lte('auto_confirm_at', now)
    .not('auto_confirm_at', 'is', null)

  if (error) {
    console.error('[cron/auto-confirm] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!overdue || overdue.length === 0) {
    return NextResponse.json({ confirmed: 0, message: 'No bookings to auto-confirm' })
  }

  const ids = overdue.map(b => b.id)

  // Auto-confirm as completed — also stamp completed_at for dispute/complaint window
  const { error: updateErr } = await supabase
    .from('booking_requests')
    .update({
      status:            'completed',
      completed_at:      now,
      auto_confirmed_at: now,
    })
    .in('id', ids)
    .eq('status', 'work_done')

  if (updateErr) {
    console.error('[cron/auto-confirm] update error:', updateErr.message)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Also update related shift_bookings
  await supabase
    .from('shift_bookings')
    .update({ status: 'completed' })
    .in('booking_request_id', ids)
    .eq('status', 'pending')

  // Notify patient + nurse
  const notifPayloads: Parameters<typeof sendNotifications>[0] = []

  for (const b of overdue) {
    notifPayloads.push({
      userId: b.patient_id,
      type:   'booking_completed',
      title:  '✅ Booking Auto-Confirmed as Completed',
      body:   `Your booking for ${b.shift ?? 'a shift'} on ${b.start_date} has been automatically confirmed as completed. The nurse marked work done and the confirmation window passed.`,
      data:   { bookingId: b.id },
    })

    if (b.nurse_id) {
      notifPayloads.push({
        userId: b.nurse_id,
        type:   'booking_completed',
        title:  '✅ Booking Auto-Confirmed',
        body:   `Your booking from ${b.patient_name ?? 'a patient'} for ${b.shift ?? 'a shift'} on ${b.start_date} has been automatically confirmed as completed by the system.`,
        data:   { bookingId: b.id },
      })
    }
  }

  await sendNotifications(notifPayloads)

  console.log(`[cron/auto-confirm] Auto-confirmed ${ids.length} bookings:`, ids)
  return NextResponse.json({ confirmed: ids.length, ids })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
