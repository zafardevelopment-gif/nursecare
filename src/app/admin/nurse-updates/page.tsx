import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import UpdateRequestsClient from './UpdateRequestsClient'
import Link from 'next/link'

export default async function NurseUpdateRequestsPage() {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const [{ data: requests }, { data: pendingNurses }] = await Promise.all([
    supabase
      .from('nurse_update_requests')
      .select('*, nurses(full_name, email, city, status)')
      .order('created_at', { ascending: false }),
    supabase
      .from('nurses')
      .select('id, full_name, email, city, specialization, created_at, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  const pendingUpdateCount = (requests ?? []).filter(r => r.status === 'pending').length
  const totalPending = pendingUpdateCount + (pendingNurses?.length ?? 0)

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link href="/admin/dashboard" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none' }}>
              ← Admin Dashboard
            </Link>
          </div>
          <h1 className="dash-title">Pending Actions</h1>
          <p className="dash-sub">Nurse approvals and profile update requests requiring your review</p>
        </div>
        {totalPending > 0 && (
          <div style={{ background: 'rgba(245,132,42,0.08)', border: '1px solid rgba(245,132,42,0.2)', borderRadius: '10px', padding: '0.6rem 1rem', fontSize: '0.82rem', color: '#b85e00', fontWeight: 600 }}>
            {totalPending} Pending
          </div>
        )}
      </div>

      <UpdateRequestsClient
        requests={requests ?? []}
        pendingNurses={pendingNurses ?? []}
      />
    </div>
  )
}
