import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { approveUpdateRequest, rejectUpdateRequest } from './actions'
import Link from 'next/link'

const FIELD_LABELS: Record<string, string> = {
  hourly_rate:      'Hourly Rate (SAR)',
  daily_rate:       'Daily Rate (SAR)',
  specialization:   'Specialization',
  experience_years: 'Years of Experience',
  license_no:       'License Number',
}

export default async function NurseUpdateRequestsPage() {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const { data: requests } = await supabase
    .from('nurse_update_requests')
    .select('*, nurses(full_name, email, city, status)')
    .order('created_at', { ascending: false })

  const pending  = requests?.filter(r => r.status === 'pending')  ?? []
  const resolved = requests?.filter(r => r.status !== 'pending')  ?? []

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link href="/admin/dashboard" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none' }}>
              ← Admin Dashboard
            </Link>
          </div>
          <h1 className="dash-title">Profile Update Requests</h1>
          <p className="dash-sub">Review nurse-requested changes to sensitive profile fields</p>
        </div>
        <div style={{ background: 'rgba(245,132,42,0.08)', border: '1px solid rgba(245,132,42,0.2)', borderRadius: '10px', padding: '0.6rem 1rem', fontSize: '0.82rem', color: '#b85e00', fontWeight: 600 }}>
          {pending.length} Pending
        </div>
      </div>

      {/* Pending */}
      <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
        <div className="dash-card-header">
          <span className="dash-card-title">Pending Requests ({pending.length})</span>
        </div>
        <div className="dash-card-body" style={{ padding: 0 }}>
          {pending.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              No pending update requests
            </div>
          ) : pending.map(req => (
            <UpdateRequestRow key={req.id} req={req} showActions />
          ))}
        </div>
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Resolved ({resolved.length})</span>
          </div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {resolved.map(req => (
              <UpdateRequestRow key={req.id} req={req} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UpdateRequestRow({ req, showActions }: { req: any; showActions?: boolean }) {
  const nurse = req.nurses
  const changedFields: string[] = req.changed_fields ?? []
  const oldVals: Record<string, any> = req.old_values ?? {}
  const newVals: Record<string, any> = req.new_values ?? {}

  const statusColor: Record<string, string> = { pending: '#F5842A', approved: '#27A869', rejected: '#E04A4A' }
  const statusBg:    Record<string, string> = { pending: 'rgba(245,132,42,0.1)', approved: 'rgba(39,168,105,0.1)', rejected: 'rgba(224,74,74,0.1)' }

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '1.2rem 1.5rem' }}>
      {/* Nurse info + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{nurse?.full_name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{nurse?.email} · {nurse?.city}</div>
        <span style={{ background: statusBg[req.status], color: statusColor[req.status], fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '50px', textTransform: 'capitalize', marginLeft: 'auto' }}>
          {req.status}
        </span>
      </div>

      {/* Changed fields comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem', marginBottom: '0.9rem' }}>
        {changedFields.map(field => (
          <div key={field} style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.78rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--muted)', marginBottom: '0.3rem', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              {FIELD_LABELS[field] ?? field}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ color: '#E04A4A', textDecoration: 'line-through' }}>
                {oldVals[field] ?? '—'}
              </span>
              <span style={{ color: 'var(--muted)' }}>→</span>
              <span style={{ color: '#27A869', fontWeight: 700 }}>
                {newVals[field] ?? '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '0.73rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
        Requested: {new Date(req.created_at).toLocaleString()}
        {req.reviewed_at && ` · Reviewed: ${new Date(req.reviewed_at).toLocaleString()}`}
      </div>

      {showActions && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <form action={approveUpdateRequest}>
            <input type="hidden" name="requestId" value={req.id} />
            <button type="submit" style={{ background: '#27A869', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✓ Approve Update
            </button>
          </form>
          <form action={rejectUpdateRequest}>
            <input type="hidden" name="requestId" value={req.id} />
            <button type="submit" style={{ background: 'rgba(224,74,74,0.1)', color: '#E04A4A', border: '1px solid rgba(224,74,74,0.25)', padding: '7px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✕ Reject
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
