import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { updateHospitalProfileAction } from '../onboarding/actions'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ message?: string; error?: string; edit?: string }>
}

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pending:            { color: '#F5842A', bg: 'rgba(245,132,42,0.1)',  label: '⏳ Pending Review' },
  approved:           { color: '#27A869', bg: 'rgba(39,168,105,0.1)',  label: '✓ Approved' },
  rejected:           { color: '#E04A4A', bg: 'rgba(224,74,74,0.1)',   label: '✕ Rejected' },
  agreement_pending:  { color: '#0E7B8C', bg: 'rgba(14,123,140,0.1)', label: '📄 Agreement Pending' },
  active:             { color: '#1A7A4A', bg: 'rgba(26,122,74,0.1)',   label: '✅ Active' },
}

export default async function HospitalProfilePage({ searchParams }: Props) {
  const user = await requireRole('hospital')
  const supabase = await createSupabaseServerClient()
  const params = await searchParams

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!hospital) redirect('/hospital/onboarding')

  const isEditing = params.edit === '1'
  const s = STATUS_STYLE[hospital.status] ?? STATUS_STYLE.pending

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Hospital Profile</h1>
          <p className="dash-sub">{isEditing ? 'Edit your hospital details' : 'Your hospital profile'}</p>
        </div>
        {!isEditing && (
          <Link href="/hospital/profile?edit=1" style={{
            background: 'var(--teal)', color: '#fff', padding: '9px 18px',
            borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
          }}>
            ✏️ Edit Profile
          </Link>
        )}
        {isEditing && (
          <Link href="/hospital/profile" style={{
            background: 'var(--cream)', color: 'var(--muted)', border: '1px solid var(--border)',
            padding: '9px 18px', borderRadius: 9, fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none',
          }}>
            Cancel
          </Link>
        )}
      </div>

      {params.message && (
        <div className="auth-success" style={{ marginBottom: '1.2rem' }}>{decodeURIComponent(params.message)}</div>
      )}
      {params.error && (
        <div className="auth-error" style={{ marginBottom: '1.2rem' }}>⚠️ {decodeURIComponent(params.error)}</div>
      )}

      {isEditing ? (
        <EditForm hospital={hospital} action={updateHospitalProfileAction} />
      ) : (
        <ViewProfile hospital={hospital} statusStyle={s} />
      )}
    </div>
  )
}

/* ── View ── */
function ViewProfile({ hospital, statusStyle }: { hospital: any; statusStyle: { color: string; bg: string; label: string } }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Status card */}
      <div className="dash-card" style={{ padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: `4px solid ${statusStyle.color}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Profile Status</div>
          <span style={{ background: statusStyle.bg, color: statusStyle.color, fontSize: '0.8rem', fontWeight: 700, padding: '4px 12px', borderRadius: 50 }}>
            {statusStyle.label}
          </span>
        </div>
        {hospital.status === 'pending' && (
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', maxWidth: 260, textAlign: 'right' }}>
            Under admin review. You&apos;ll be notified once approved.
          </div>
        )}
        {hospital.status === 'rejected' && hospital.rejection_reason && (
          <div style={{ fontSize: '0.78rem', color: '#E04A4A', maxWidth: 260, textAlign: 'right' }}>
            Reason: {hospital.rejection_reason}
          </div>
        )}
      </div>

      {/* Hospital Info */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">🏥 Hospital Information</span>
        </div>
        <div className="dash-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            <Field label="Hospital Name"  value={hospital.hospital_name} />
            <Field label="License / CR"   value={hospital.license_cr} />
            <Field label="City"           value={hospital.city} />
            <Field label="Address"        value={hospital.address} />
          </div>
          {hospital.scope_of_services && (
            <div style={{ marginTop: '1rem' }}>
              <div style={labelStyle}>Scope of Services</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.6 }}>{hospital.scope_of_services}</div>
            </div>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">👤 Contact Person</span>
        </div>
        <div className="dash-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            <Field label="Name"        value={hospital.contact_person} />
            <Field label="Designation" value={hospital.designation} />
            <Field label="Email"       value={hospital.email} />
            <Field label="Phone"       value={hospital.phone ? `+966 ${hospital.phone}` : null} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Edit ── */
function EditForm({ hospital, action }: { hospital: any; action: (fd: FormData) => Promise<void> }) {
  const CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina', 'Khobar', 'Tabuk', 'Abha']
  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Edit Profile</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Hospital name and license cannot be changed</span>
      </div>
      <div className="dash-card-body">
        <form action={action}>
          <div style={{ marginBottom: '0.5rem', padding: '10px 14px', background: 'var(--cream)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            🔒 Hospital Name: <strong>{hospital.hospital_name}</strong> · License: <strong>{hospital.license_cr || '—'}</strong>
          </div>

          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--teal)', margin: '1rem 0 0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Contact Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input type="text" name="contact_person" className="form-input" defaultValue={hospital.contact_person ?? ''} required />
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input type="text" name="designation" className="form-input" defaultValue={hospital.designation ?? ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input type="email" name="email" className="form-input" defaultValue={hospital.email ?? ''} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" name="phone" className="form-input" defaultValue={hospital.phone ?? ''} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input type="text" name="address" className="form-input" defaultValue={hospital.address ?? ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Scope of Services</label>
            <textarea name="scope_of_services" className="form-input" rows={3} defaultValue={hospital.scope_of_services ?? ''} style={{ resize: 'vertical' }} />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Helpers ── */
const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3,
}
function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: '0.88rem', color: value ? 'var(--ink)' : 'var(--muted)', fontStyle: value ? 'normal' : 'italic' }}>{value ?? '—'}</div>
    </div>
  )
}
