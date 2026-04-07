import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { sendAgreementToHospitalAction, approveAgreementAction } from '../new/actions'

export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  draft:             { color: '#64748B', bg: '#F1F5F9',               label: '📝 Draft' },
  admin_approved:    { color: '#0E5C8C', bg: '#EEF6FD',               label: '✓ Admin Approved' },
  sent:              { color: '#b85e00', bg: 'rgba(181,94,0,0.08)',    label: '📨 Sent to Hospital' },
  hospital_accepted: { color: '#1A7A4A', bg: 'rgba(26,122,74,0.1)',   label: '✅ Hospital Accepted' },
  hospital_rejected: { color: '#E04A4A', bg: 'rgba(224,74,74,0.1)',   label: '✕ Hospital Rejected' },
  active:            { color: '#1A7A4A', bg: 'rgba(26,122,74,0.1)',   label: '✅ Active' },
  expired:           { color: '#64748B', bg: '#F1F5F9',               label: 'Expired' },
}

interface Props {
  params: Promise<{ id: string; agreementId: string }>
  searchParams: Promise<{ sent?: string }>
}

export default async function AdminAgreementDetailPage({ params, searchParams }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const { id: hospitalId, agreementId } = await params
  const sp = await searchParams

  const [{ data: agreement }, { data: hospital }, { data: auditLog }] = await Promise.all([
    supabase.from('hospital_agreements').select('*').eq('id', agreementId).single(),
    supabase.from('hospitals').select('*').eq('id', hospitalId).single(),
    supabase.from('hospital_audit_log').select('*').eq('agreement_id', agreementId).order('created_at', { ascending: false }),
  ])

  if (!agreement || !hospital) notFound()

  const s = STATUS_STYLE[agreement.status] ?? STATUS_STYLE.draft
  const canApprove = agreement.status === 'draft'
  const canSend    = agreement.status === 'admin_approved'
  const wasRejected = agreement.status === 'hospital_rejected'

  const paymentTypeLabel: Record<string, string> = {
    advance: '💰 Advance', daily: '📅 Daily', weekly: '📆 Weekly', monthly: '🗓️ Monthly',
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Link href={`/admin/hospitals/${hospitalId}`} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
              ← {hospital.hospital_name}
            </Link>
          </div>
          <h1 className="dash-title">Agreement {agreement.ref_number}</h1>
          <p className="dash-sub">{hospital.hospital_name} · {agreement.start_date} → {agreement.end_date}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a
            href={`/api/hospital-agreements/${agreementId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '7px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            ⬇ Download PDF
          </a>
          <span style={{ background: s.bg, color: s.color, fontSize: '0.75rem', fontWeight: 700, padding: '5px 14px', borderRadius: 50 }}>{s.label}</span>
        </div>
      </div>

      {sp.sent && (
        <div className="auth-success" style={{ marginBottom: '1.2rem' }}>
          ✅ Agreement sent to {hospital.hospital_name} successfully!
        </div>
      )}

      {/* Step progress */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        {[
          { n: '1', label: 'Draft',           sub: agreement.status !== 'draft' ? '✓ Done' : 'Current',  done: agreement.status !== 'draft', active: agreement.status === 'draft' },
          { n: '2', label: 'Admin Approved',  sub: agreement.admin_approved_at ? new Date(agreement.admin_approved_at).toLocaleDateString('en-GB') : '—', done: ['admin_approved','sent','hospital_accepted','hospital_rejected','active'].includes(agreement.status), active: agreement.status === 'admin_approved' },
          { n: '3', label: 'Sent',            sub: agreement.sent_at ? new Date(agreement.sent_at).toLocaleDateString('en-GB') : '—', done: ['sent','hospital_accepted','hospital_rejected','active'].includes(agreement.status), active: agreement.status === 'sent' },
          { n: '4', label: 'Hospital Review', sub: (agreement.hospital_accepted_at || agreement.hospital_rejected_at) ? new Date(agreement.hospital_accepted_at ?? agreement.hospital_rejected_at).toLocaleDateString('en-GB') : '—', done: ['hospital_accepted','active'].includes(agreement.status), active: agreement.status === 'hospital_accepted' || agreement.status === 'hospital_rejected' },
          { n: '5', label: 'Active',          sub: agreement.activated_at ? new Date(agreement.activated_at).toLocaleDateString() : '—', done: agreement.status === 'active', active: agreement.status === 'active' },
        ].map((step, i, arr) => (
          <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 800, flexShrink: 0,
                background: step.done ? 'var(--teal)' : step.active ? '#fff' : 'var(--cream)',
                color: step.done ? '#fff' : step.active ? 'var(--teal)' : 'var(--muted)',
                border: step.active ? '2px solid var(--teal)' : step.done ? '2px solid var(--teal)' : '2px solid var(--border)',
              }}>
                {step.done ? '✓' : step.n}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: step.active || step.done ? 'var(--ink)' : 'var(--muted)' }}>{step.label}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{step.sub}</div>
              </div>
            </div>
            {i < arr.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step.done ? 'var(--teal)' : 'var(--border)', margin: '0 8px', marginBottom: 20 }} />
            )}
          </div>
        ))}
      </div>

      {/* Action banners */}
      {canApprove && (
        <div style={{ background: 'rgba(245,132,42,0.04)', border: '1px solid rgba(245,132,42,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#F5842A' }}>📝 Draft — Review and approve to proceed</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>Once approved, you can send it to the hospital.</div>
          </div>
          <form action={approveAgreementAction}>
            <input type="hidden" name="agreement_id" value={agreementId} />
            <input type="hidden" name="hospital_id"  value={hospitalId} />
            <button type="submit" style={{ background: 'var(--teal)', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              ✓ Approve & Generate
            </button>
          </form>
        </div>
      )}

      {canSend && (
        <div style={{ background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--teal)' }}>✓ Approved — Ready to send to hospital</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
              Hospital: {hospital.hospital_name} · {hospital.email}
            </div>
          </div>
          <form action={sendAgreementToHospitalAction}>
            <input type="hidden" name="agreement_id" value={agreementId} />
            <input type="hidden" name="hospital_id"  value={hospitalId} />
            <button type="submit" style={{ background: '#1A7A4A', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span>📨</span> Send to Hospital
            </button>
          </form>
        </div>
      )}

      {wasRejected && (
        <div style={{ background: 'rgba(224,74,74,0.04)', border: '1px solid rgba(224,74,74,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#E04A4A' }}>✕ Hospital Rejected this Agreement</div>
          {agreement.hospital_rejection_reason && (
            <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 6 }}>
              Reason: {agreement.hospital_rejection_reason}
            </div>
          )}
          <Link href={`/admin/hospitals/${hospitalId}/agreement/new`} style={{ display: 'inline-block', marginTop: 10, padding: '7px 14px', background: 'var(--teal)', color: '#fff', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>
            + Create Revised Agreement
          </Link>
        </div>
      )}

      {/* Agreement preview card */}
      <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
        {/* Dark header like the HTML design */}
        <div style={{ background: '#0F172A', padding: '24px 28px', borderRadius: '10px 10px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: 'serif', fontWeight: 700, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 9, height: 9, background: '#14B8A6', borderRadius: '50%', display: 'inline-block' }} />
              NurseCare+
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 5, fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              {agreement.ref_number}
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 3 }}>Hospital Service Agreement</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
            Nursing service provision agreement between NurseCare+ and {hospital.hospital_name}
          </div>
        </div>
        <div style={{ height: 3, background: '#0D9488' }} />

        <div style={{ padding: '1.5rem' }}>
          {/* Party B */}
          <DocSection title="Party B — Hospital (Client)">
            <DocRow k="Hospital Name"   v={hospital.hospital_name} />
            <DocRow k="License / CR"    v={hospital.license_cr ?? '—'} />
            <DocRow k="Address"         v={[hospital.address, hospital.city].filter(Boolean).join(', ') || '—'} />
            <DocRow k="Representative"  v={[hospital.contact_person, hospital.designation].filter(Boolean).join(' — ') || '—'} />
            <DocRow k="Email"           v={hospital.email ?? '—'} />
          </DocSection>

          {/* Validity */}
          <DocSection title="Agreement Terms">
            <DocRow k="Effective From" v={agreement.start_date} />
            <DocRow k="Valid Until"    v={agreement.end_date} />
            {hospital.scope_of_services && <DocRow k="Scope" v={hospital.scope_of_services} />}
          </DocSection>

          {/* Payment */}
          <DocSection title="Payment Structure">
            <DocRow k="Payment Type" v={paymentTypeLabel[agreement.payment_type] ?? agreement.payment_type} />
            {/* Rules based on type */}
            {agreement.payment_type === 'advance' && agreement.adv_deadline_hrs && (
              <DocRow k="Deadline" v={`${agreement.adv_deadline_hrs} hours before job`} />
            )}
            {agreement.payment_type === 'daily' && <>
              {agreement.daily_deadline_hrs  && <DocRow k="Deadline"       v={`${agreement.daily_deadline_hrs} hrs before`} />}
              {agreement.daily_grace_hrs     != null && <DocRow k="Grace Period"   v={`${agreement.daily_grace_hrs} hours`} />}
              {agreement.daily_cancel_misses != null && <DocRow k="Cancel After"   v={`${agreement.daily_cancel_misses} misses`} />}
              {agreement.daily_missed_action && <DocRow k="Missed Payment" v={agreement.daily_missed_action === 'pause' ? 'Nurse paused' : 'Cancel booking'} />}
            </>}
            {agreement.payment_type === 'weekly' && <>
              {agreement.weekly_payment_day  && <DocRow k="Payment Day"    v={agreement.weekly_payment_day} />}
              {agreement.weekly_deadline_hrs != null && <DocRow k="Deadline"       v={`${agreement.weekly_deadline_hrs} hrs before`} />}
              {agreement.weekly_grace_hrs    != null && <DocRow k="Grace Period"   v={`${agreement.weekly_grace_hrs} hours`} />}
              {agreement.weekly_missed_action && <DocRow k="Missed Payment" v={agreement.weekly_missed_action === 'pause' ? 'Nurse paused' : 'Cancel booking'} />}
            </>}
            {agreement.payment_type === 'monthly' && <>
              {agreement.monthly_billing_day   != null && <DocRow k="Billing Date"    v={`${agreement.monthly_billing_day}th of each month`} />}
              {agreement.monthly_advance_days  != null && <DocRow k="Advance Deposit" v={`${agreement.monthly_advance_days} days before service`} />}
              {agreement.monthly_grace_hrs     != null && <DocRow k="Grace Period"    v={`${agreement.monthly_grace_hrs} hours`} />}
              {agreement.monthly_missed_action && <DocRow k="Missed Payment" v={agreement.monthly_missed_action === 'pause' ? 'Nurse paused' : 'Cancel booking'} />}
            </>}
            {(agreement.reminder_hours ?? []).length > 0 && (
              <DocRow k="Reminders" v={(agreement.reminder_hours as number[]).map(h => `${h} hrs`).join(' · ') + ' before deadline'} />
            )}
          </DocSection>

          {/* Signatures */}
          <DocSection title="Signatures">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 6 }}>
              {[
                { party: 'Party A — NurseCare+', name: 'Admin', desig: 'NurseCare+ Healthcare Solutions' },
                { party: 'Party B — Hospital',   name: hospital.contact_person, desig: `${hospital.designation ?? ''} — ${hospital.hospital_name}` },
              ].map(sig => (
                <div key={sig.party} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--cream)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 8 }}>{sig.party}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)' }}>{sig.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>{sig.desig}</div>
                  <div style={{ height: 1, background: '#CBD5E1', margin: '16px 0 6px' }} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Signature & Date</div>
                </div>
              ))}
            </div>
          </DocSection>
        </div>

        <div style={{ background: '#1E293B', padding: '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0 0 10px 10px' }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>NurseCare+ Healthcare Solutions · Riyadh, Saudi Arabia</span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{agreement.ref_number}</span>
        </div>
      </div>

      {/* Audit log */}
      {(auditLog ?? []).length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header"><span className="dash-card-title">📋 Activity Log</span></div>
          <div style={{ padding: '0.5rem 0' }}>
            {(auditLog ?? []).map(log => (
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

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#0F5F59', borderLeft: '3px solid #0D9488', paddingLeft: 9, marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  )
}
function DocRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', padding: '7px 0', borderBottom: '1px solid #F8FAFC' }}>
      <div style={{ width: 190, flexShrink: 0, fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>{k}</div>
      <div style={{ fontSize: '0.8rem', color: '#0F172A', fontWeight: 600 }}>{v}</div>
    </div>
  )
}
