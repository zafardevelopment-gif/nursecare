import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { approveHospitalAction, rejectHospitalAction } from '../actions'

export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pending:           { color: '#F5842A', bg: 'rgba(245,132,42,0.1)',  label: '⏳ Pending Review' },
  approved:          { color: '#27A869', bg: 'rgba(39,168,105,0.1)',  label: '✓ Approved' },
  rejected:          { color: '#E04A4A', bg: 'rgba(224,74,74,0.1)',   label: '✕ Rejected' },
  agreement_pending: { color: '#0E7B8C', bg: 'rgba(14,123,140,0.1)', label: '📄 Agreement Pending' },
  active:            { color: '#1A7A4A', bg: 'rgba(26,122,74,0.1)',   label: '✅ Active' },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminHospitalDetailPage({ params }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const { id } = await params

  const [{ data: hospital }, { data: agreements }, { data: auditLog }] = await Promise.all([
    supabase.from('hospitals').select('*').eq('id', id).single(),
    supabase.from('hospital_agreements').select('*').eq('hospital_id', id).order('created_at', { ascending: false }),
    supabase.from('hospital_audit_log').select('*').eq('hospital_id', id).order('created_at', { ascending: false }).limit(20),
  ])

  if (!hospital) notFound()

  const s = STATUS_STYLE[hospital.status] ?? STATUS_STYLE.pending
  const isPending  = hospital.status === 'pending'
  const isApproved = hospital.status === 'approved' || hospital.status === 'agreement_pending' || hospital.status === 'active'

  const AGR_STATUS: Record<string, { color: string; bg: string; label: string }> = {
    draft:              { color: '#64748B', bg: '#F1F5F9',                        label: 'Draft' },
    admin_approved:     { color: '#0E5C8C', bg: '#EEF6FD',                       label: 'Admin Approved' },
    sent:               { color: '#b85e00', bg: 'rgba(181,94,0,0.08)',            label: 'Sent to Hospital' },
    hospital_accepted:  { color: '#1A7A4A', bg: 'rgba(26,122,74,0.1)',           label: '✓ Accepted' },
    hospital_rejected:  { color: '#E04A4A', bg: 'rgba(224,74,74,0.1)',           label: '✕ Rejected' },
    active:             { color: '#1A7A4A', bg: 'rgba(26,122,74,0.1)',           label: '✅ Active' },
    expired:            { color: '#64748B', bg: '#F1F5F9',                        label: 'Expired' },
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/admin/hospitals" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            ← Hospitals
          </Link>
        </div>
      </div>

      <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,rgba(14,123,140,0.1),rgba(10,191,204,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem', flexShrink: 0 }}>
              🏥
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{hospital.hospital_name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>{s.label}</span>
                {hospital.city && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>📍 {hospital.city}</span>}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'right' }}>
            <div>Registered</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>{new Date(hospital.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        {/* Approve / Reject banner */}
        {isPending && (
          <div style={{ padding: '1rem 1.5rem', background: 'rgba(245,132,42,0.04)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#F5842A' }}>⏳ Awaiting Your Review</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>Review the hospital details and approve or reject their registration.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <form action={approveHospitalAction}>
                <input type="hidden" name="hospitalId" value={hospital.id} />
                <button type="submit" style={{ background: '#27A869', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✓ Approve Hospital
                </button>
              </form>
              <RejectForm hospitalId={hospital.id} />
            </div>
          </div>
        )}

        {/* Info grid */}
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <Section label="Hospital Details">
            <DetailRow icon="🏥" label="Name"       value={hospital.hospital_name} />
            <DetailRow icon="📋" label="License/CR" value={hospital.license_cr ?? '—'} />
            <DetailRow icon="📍" label="City"       value={hospital.city ?? '—'} />
            {hospital.address && <DetailRow icon="📌" label="Address" value={hospital.address} />}
          </Section>
          <Section label="Contact Person">
            <DetailRow icon="👤" label="Name"        value={hospital.contact_person} />
            {hospital.designation && <DetailRow icon="💼" label="Role" value={hospital.designation} />}
            <DetailRow icon="✉️" label="Email"       value={hospital.email ?? '—'} />
            <DetailRow icon="📞" label="Phone"       value={hospital.phone ? `+966 ${hospital.phone}` : '—'} />
          </Section>
          {hospital.scope_of_services && (
            <Section label="Scope of Services">
              <div style={{ fontSize: '0.84rem', color: 'var(--ink)', lineHeight: 1.6 }}>{hospital.scope_of_services}</div>
            </Section>
          )}
          <Section label="Approval Info">
            {hospital.approved_at
              ? <DetailRow icon="✓"  label="Approved"  value={new Date(hospital.approved_at).toLocaleDateString()} />
              : <DetailRow icon="⏳" label="Approved"  value="Not yet" />
            }
            {hospital.rejection_reason && (
              <DetailRow icon="✕" label="Reject Reason" value={hospital.rejection_reason} />
            )}
          </Section>
        </div>
      </div>

      {/* Agreements */}
      {isApproved && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>📄 Hospital Agreements</span>
            <Link href={`/admin/hospitals/${id}/agreement/new`} style={{
              padding: '7px 14px', borderRadius: 8, background: 'var(--teal)', color: '#fff',
              fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none',
            }}>
              + Create Agreement
            </Link>
          </div>

          {!(agreements ?? []).length ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem', fontSize: '0.88rem' }}>
              No agreements yet. Create the first agreement for this hospital.
            </div>
          ) : (
            <div className="table-scroll-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                    <Th>Ref</Th><Th>Payment Type</Th><Th>Validity</Th><Th>Status</Th><Th>Created</Th><Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {(agreements ?? []).map((a, i) => {
                    const as = AGR_STATUS[a.status] ?? AGR_STATUS.draft
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'rgba(14,123,140,0.015)' }}>
                        <Td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{a.ref_number}</span></Td>
                        <Td style={{ textTransform: 'capitalize' }}>{a.payment_type}</Td>
                        <Td>{a.start_date} → {a.end_date}</Td>
                        <Td><span style={{ background: as.bg, color: as.color, fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50 }}>{as.label}</span></Td>
                        <Td>{new Date(a.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short' })}</Td>
                        <Td>
                          <Link href={`/admin/hospitals/${id}/agreement/${a.id}`} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--cream)', color: 'var(--teal)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
                            View →
                          </Link>
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Log */}
      {(auditLog ?? []).length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">📋 Audit Log</span></div>
          <div style={{ padding: '0.5rem 0' }}>
            {(auditLog ?? []).map((log) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>
                    {log.action.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>
                    {log.actor_role} · {new Date(log.created_at).toLocaleString('en-SA')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Reject form (inline) ── */
function RejectForm({ hospitalId }: { hospitalId: string }) {
  return (
    <form action={rejectHospitalAction} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="hidden" name="hospitalId" value={hospitalId} />
      <input
        type="text" name="reason"
        placeholder="Rejection reason (optional)"
        style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.78rem', width: 220, fontFamily: 'inherit', outline: 'none' }}
      />
      <button type="submit" style={{ background: 'rgba(224,74,74,0.1)', color: '#E04A4A', border: '1px solid rgba(224,74,74,0.25)', padding: '8px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        ✕ Reject
      </button>
    </form>
  )
}

/* ── Helpers ── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>{children}</div>
    </div>
  )
}
function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{icon} {label}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, fontSize: '0.67rem', color: 'var(--muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</th>
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: '10px 12px', verticalAlign: 'middle', color: 'var(--ink)', ...style }}>{children}</td>
}
