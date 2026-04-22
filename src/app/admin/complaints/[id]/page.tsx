import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ComplaintActionForm from './ComplaintActionForm'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  no_show:             '🚫 No Show',
  late_arrival:        '⏰ Late Arrival',
  misbehavior:         '😤 Misbehavior',
  service_quality:     '⚠️ Service Quality',
  payment_issue:       '💸 Payment Issue',
  wrong_cancellation:  '❌ Wrong Cancellation',
  safety_issue:        '🚨 Safety Issue',
  other:               '📝 Other',
}

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  patient:  { label: 'Patient',  color: '#0E7B8C', bg: 'rgba(14,123,140,0.08)' },
  provider: { label: 'Nurse',    color: '#6B3FA0', bg: 'rgba(107,63,160,0.08)' },
  hospital: { label: 'Hospital', color: '#b85e00', bg: 'rgba(181,94,0,0.08)'   },
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:     { label: '🔴 Open',     color: '#E04A4A', bg: 'rgba(224,74,74,0.08)' },
  resolved: { label: '✅ Resolved', color: '#1A7A4A', bg: 'rgba(26,122,74,0.08)' },
  rejected: { label: '❌ Rejected', color: '#8A9BAA', bg: 'rgba(138,155,170,0.08)' },
}

export default async function AdminComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const { data: c } = await supabase
    .from('complaints')
    .select('*')
    .eq('id', id)
    .single()

  if (!c) notFound()

  const sm = STATUS_META[c.status] ?? STATUS_META.open
  const rm = ROLE_META[c.reporter_role] ?? ROLE_META.patient
  const isOpen = c.status === 'open'

  // Fetch linked booking if present
  let linkedBooking: { id: string; patient_name: string | null; nurse_name: string | null; service_type: string | null; start_date: string | null; status: string } | null = null
  if (c.booking_id) {
    const { data: b } = await supabase
      .from('booking_requests')
      .select('id, patient_name, nurse_name, service_type, start_date, status')
      .eq('id', c.booking_id)
      .single()
    linkedBooking = b ?? null
  }

  return (
    <div className="dash-shell">
      {/* Back + Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/complaints" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Complaints
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="dash-title" style={{ margin: 0 }}>Complaint Review</h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'var(--shell-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</span>
              <code style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)' }}>{id.slice(0, 8).toUpperCase()}</code>
            </div>
          </div>
          <span style={{ background: sm.bg, color: sm.color, padding: '7px 16px', borderRadius: 50, fontWeight: 700, fontSize: '0.82rem', border: `1px solid ${sm.color}25` }}>
            {sm.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Complaint details */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">📋 Complaint Details</span></div>
          <div className="dash-card-body">
            <Row label="Reporter">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.82rem' }}>{c.reporter_name || '—'}</span>
                <span style={{ background: rm.bg, color: rm.color, padding: '2px 7px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>{rm.label}</span>
              </div>
            </Row>
            <Row label="Type">
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>{TYPE_LABELS[c.complaint_type] ?? c.complaint_type}</span>
            </Row>
            <Row label="Status">
              <span style={{ background: sm.bg, color: sm.color, padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700 }}>{sm.label}</span>
            </Row>
            <Row label="Submitted">
              <span style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>{new Date(c.created_at).toLocaleString('en-GB')}</span>
            </Row>
            {c.reviewed_at && (
              <Row label="Reviewed At">
                <span style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>{new Date(c.reviewed_at).toLocaleString('en-GB')}</span>
              </Row>
            )}
          </div>
        </div>

        {/* Description + proof */}
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">🗒️ Description</span></div>
          <div className="dash-card-body">
            <div style={{ background: 'var(--shell-bg)', border: '1px solid var(--border)', borderRadius: 9, padding: '14px 16px', lineHeight: 1.6, fontSize: '0.88rem', color: 'var(--ink)', marginBottom: c.image_url ? 14 : 0 }}>
              {c.description}
            </div>
            {c.image_url && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📎 Proof Image</div>
                <a href={c.image_url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.image_url}
                    alt="Complaint proof"
                    style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </a>
                <a href={c.image_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 6, fontSize: '0.75rem', color: 'var(--teal)', fontWeight: 600 }}>
                  Open image in new tab →
                </a>
              </div>
            )}
            {c.admin_note && (
              <div style={{ marginTop: 14, background: 'rgba(14,123,140,0.05)', border: '1px solid rgba(14,123,140,0.2)', borderRadius: 9, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--teal)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Admin Note</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>{c.admin_note}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linked booking */}
      {linkedBooking && (
        <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
          <div className="dash-card-header"><span className="dash-card-title">📅 Linked Booking</span></div>
          <div className="dash-card-body" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--muted)' }}>Patient: </span>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{linkedBooking.patient_name ?? '—'}</span>
            </div>
            <div style={{ fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--muted)' }}>Nurse: </span>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{linkedBooking.nurse_name ?? '—'}</span>
            </div>
            <div style={{ fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--muted)' }}>Service: </span>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{linkedBooking.service_type ?? '—'}</span>
            </div>
            <div style={{ fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--muted)' }}>Date: </span>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{linkedBooking.start_date ?? '—'}</span>
            </div>
            <Link href={`/admin/bookings/${linkedBooking.id}`} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, background: 'var(--shell-bg)', border: '1px solid var(--border)', color: 'var(--teal)', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>
              View Booking →
            </Link>
          </div>
        </div>
      )}

      {/* Action form */}
      <ComplaintActionForm complaintId={c.id} currentStatus={c.status} />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', minWidth: 100, flexShrink: 0 }}>{label}</span>
      <div style={{ textAlign: 'right' }}>{children}</div>
    </div>
  )
}
