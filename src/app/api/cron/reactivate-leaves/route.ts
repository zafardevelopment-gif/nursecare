/**
 * POST /api/cron/reactivate-leaves
 *
 * Called daily (Vercel Cron or external scheduler).
 * Finds nurses whose approved leave has ended (pause_until < today)
 * and reactivates them automatically.
 *
 * Protected by CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { reactivateExpiredLeaves } from '@/app/actions/leaveActions'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { reactivated } = await reactivateExpiredLeaves()
  return NextResponse.json({ reactivated, message: `${reactivated} nurse(s) reactivated` })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
