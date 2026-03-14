import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { approveNurse, rejectNurse } from './actions'
import Link from 'next/link'

export default async function NurseApprovalsPage() {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const { data: nurses } = await supabase
    .from('nurses')
    .select('*')
    .order('created_at', { ascending: false })

  const pending  = nurses?.filter(n => n.status === 'pending')  ?? []
  const approved = nurses?.filter(n => n.status === 'approved') ?? []
  const rejected = nurses?.filter(n => n.status === 'rejected') ?? []

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link href="/admin/dashboard" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none' }}>
              ← Admin Dashboard
            </Link>
          </div>
          <h1 className="dash-title">Nurse Approvals</h1>
          <p className="dash-sub">Review and approve healthcare provider applications</p>
        </div>
      </div>

      {/* Stats */}
      <div className="dash-kpi-row" style={{ marginBottom: '1.5rem' }}>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FFF3E0' }}>⏳</div>
          <div className="dash-kpi-num">{pending.length}</div>
          <div className="dash-kpi-label">Pending Review</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#E8F9F0' }}>✅</div>
          <div className="dash-kpi-num">{approved.length}</div>
          <div className="dash-kpi-label">Approved</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#FEE8E8' }}>❌</div>
          <div className="dash-kpi-num">{rejected.length}</div>
          <div className="dash-kpi-label">Rejected</div>
        </div>
        <div className="dash-kpi">
          <div className="dash-kpi-icon" style={{ background: '#EBF5FF' }}>👩‍⚕️</div>
          <div className="dash-kpi-num">{nurses?.length ?? 0}</div>
          <div className="dash-kpi-label">Total Applications</div>
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">Pending Applications ({pending.length})</span>
            <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px' }}>
              Needs Review
            </span>
          </div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {pending.map(nurse => (
              <NurseRow key={nurse.id} nurse={nurse} showActions />
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-body" style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
            No pending applications
          </div>
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-header">
            <span className="dash-card-title">Approved Nurses ({approved.length})</span>
          </div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {approved.map(nurse => (
              <NurseRow key={nurse.id} nurse={nurse} />
            ))}
          </div>
        </div>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Rejected ({rejected.length})</span>
          </div>
          <div className="dash-card-body" style={{ padding: 0 }}>
            {rejected.map(nurse => (
              <NurseRow key={nurse.id} nurse={nurse} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NurseRow({ nurse, showActions }: { nurse: any; showActions?: boolean }) {
  const statusColor: Record<string, string> = {
    pending:  '#F5842A',
    approved: '#27A869',
    rejected: '#E04A4A',
  }
  const statusBg: Record<string, string> = {
    pending:  'rgba(245,132,42,0.1)',
    approved: 'rgba(39,168,105,0.1)',
    rejected: 'rgba(224,74,74,0.1)',
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem',
      padding: '1.2rem 1.5rem',
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap',
    }}>
      {/* Info */}
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{nurse.full_name}</div>
          <span style={{
            background: statusBg[nurse.status],
            color: statusColor[nurse.status],
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '50px',
            textTransform: 'capitalize',
          }}>
            {nurse.status}
          </span>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
          {nurse.email} · {nurse.city} · License: {nurse.license_no}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {nurse.specialties && (
            <span style={{ background: 'rgba(14,123,140,0.08)', color: 'var(--teal)', fontSize: '0.72rem', fontWeight: 600, padding: '3px 9px', borderRadius: '50px', border: '1px solid rgba(14,123,140,0.15)' }}>
              {nurse.specialties}
            </span>
          )}
          <span style={{ background: 'var(--cream)', fontSize: '0.72rem', color: 'var(--muted)', padding: '3px 9px', borderRadius: '50px', border: '1px solid var(--border)' }}>
            {nurse.experience_years} yrs exp
          </span>
          <span style={{ background: 'var(--cream)', fontSize: '0.72rem', color: 'var(--muted)', padding: '3px 9px', borderRadius: '50px', border: '1px solid var(--border)' }}>
            SAR {nurse.shift_rate}/shift
          </span>
        </div>
        {nurse.bio && (
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
            "{nurse.bio.slice(0, 120)}{nurse.bio.length > 120 ? '...' : ''}"
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <form action={approveNurse.bind(null, nurse.id)}>
            <button
              type="submit"
              style={{
                background: '#27A869',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ✓ Approve
            </button>
          </form>
          <form action={rejectNurse.bind(null, nurse.id)}>
            <button
              type="submit"
              style={{
                background: 'rgba(224,74,74,0.1)',
                color: '#E04A4A',
                border: '1px solid rgba(224,74,74,0.25)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ✕ Reject
            </button>
          </form>
        </div>
      )}

      {!showActions && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          {nurse.reviewed_at ? `Reviewed: ${new Date(nurse.reviewed_at).toLocaleDateString()}` : ''}
        </div>
      )}
    </div>
  )
}
