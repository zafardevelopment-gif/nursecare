import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: 'rgba(245,132,42,0.1)',  color: '#F5842A', label: '⏳ Pending' },
  accepted:    { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Accepted' },
  confirmed:   { bg: 'rgba(39,168,105,0.1)',  color: '#27A869', label: '✓ Confirmed' },
  declined:    { bg: 'rgba(224,74,74,0.1)',   color: '#E04A4A', label: '✕ Declined' },
  in_progress: { bg: 'rgba(14,123,140,0.12)', color: '#0E7B8C', label: '🔄 In Progress' },
  work_done:   { bg: 'rgba(107,63,160,0.1)',  color: '#6B3FA0', label: '✅ Work Done' },
  completed:   { bg: 'rgba(14,123,140,0.1)',  color: '#0E7B8C', label: '✓ Completed' },
  cancelled:   { bg: 'rgba(138,155,170,0.1)', color: '#8A9BAA', label: 'Cancelled' },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminBookingDetailPage({ params }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const { id } = await params

  const { data: b } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (!b) notFound()

  const s = STATUS_MAP[b.status] ?? STATUS_MAP.pending
  const typeLabel = b.booking_type === 'weekly' ? '🔁 Weekly' : b.booking_type === 'monthly' ? '📆 Monthly' : '📅 One-Time'
  const showPayment = b.status !== 'pending' && b.status !== 'declined' && b.status !== 'cancelled'

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/admin/bookings" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            ← All Bookings
          </Link>
        </div>
      </div>

      <div className="dash-card">
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,rgba(14,123,140,0.1),rgba(10,191,204,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem', flexShrink: 0 }}>
              🏥
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{b.service_type ?? 'Booking'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>{s.label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{typeLabel}</span>
                {showPayment && (
                  b.payment_status === 'paid'
                    ? <span style={{ background:'rgba(39,168,105,0.1)', color:'#27A869', fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:50 }}>💳 Paid</span>
                    : <span style={{ background:'rgba(245,132,42,0.1)', color:'#F5842A', fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:50 }}>⚠️ Unpaid</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'right' }}>
            <div>Booking ID</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', marginTop: 2 }}>{b.id}</div>
            <div style={{ marginTop: 4 }}>{b.created_at && new Date(b.created_at).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{b.created_at && new Date(b.created_at).toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        {/* Two-column sections */}
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <Section label="Patient Info">
            <DetailRow icon="👤" label="Name"  value={b.patient_name ?? '—'} />
            {b.patient_email && <DetailRow icon="✉️" label="Email" value={b.patient_email} />}
            {b.patient_phone && <DetailRow icon="📞" label="Phone" value={b.patient_phone} />}
          </Section>
          <Section label="Nurse Info">
            <DetailRow icon="👩‍⚕️" label="Nurse"  value={b.nurse_name ?? '⚠️ Not assigned'} />
            {b.nurse_email && <DetailRow icon="✉️" label="Email" value={b.nurse_email} />}
          </Section>
          <Section label="Booking Details">
            <DetailRow icon="🏥" label="Service"  value={b.service_type ?? '—'} />
            <DetailRow icon="📆" label="Type"     value={typeLabel} />
            {b.total_sessions && <DetailRow icon="🔢" label="Sessions" value={String(b.total_sessions)} />}
          </Section>
          <Section label="Schedule">
            <DetailRow icon="📅" label="Start Date"  value={b.start_date ?? '—'} />
            {b.end_date && b.end_date !== b.start_date && <DetailRow icon="📅" label="End Date" value={b.end_date} />}
            <DetailRow icon="🕐" label="Shift"        value={b.shift ?? '—'} />
            <DetailRow icon="⏱" label="Duration"     value={b.duration_hours ? `${b.duration_hours} hours` : '—'} />
          </Section>
          <Section label="Location">
            <DetailRow icon="📍" label="City"    value={b.city ?? '—'} />
            {b.address && <DetailRow icon="📌" label="Address" value={b.address} />}
          </Section>
          <Section label="Payment">
            {b.hourly_rate  && <DetailRow icon="💰" label="Hourly Rate"   value={`SAR ${b.hourly_rate}`} />}
            {b.total_amount && <DetailRow icon="💳" label="Total Amount"  value={`SAR ${b.total_amount}`} />}
            <DetailRow icon="📊" label="Payment Status" value={b.payment_status === 'paid' ? '✅ Paid' : showPayment ? '⚠️ Unpaid' : '—'} />
          </Section>
        </div>

        {/* Notes */}
        {b.notes && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>📝 Notes</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink)', lineHeight: 1.6 }}>{b.notes}</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/admin/bookings" style={{
            padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--cream)', color: 'var(--muted)', fontSize: '0.85rem',
            fontWeight: 600, textDecoration: 'none',
          }}>
            ← Back to Bookings
          </Link>
        </div>
      </div>
    </div>
  )
}

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
      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--ink)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}
