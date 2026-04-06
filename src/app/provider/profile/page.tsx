import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { updateProfileAction } from './actions'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ message?: string; error?: string; notice?: string; edit?: string }>
}

const CITIES = ['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Tabuk','Abha']

export default async function ProviderProfilePage({ searchParams }: Props) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()
  const params = await searchParams

  const isEditing = params.edit === '1'

  const { data: nurse } = await supabase
    .from('nurses')
    .select('*, nurse_update_requests(id, status, changed_fields, new_values, created_at)')
    .eq('user_id', user.id)
    .single()

  const pendingRequest = nurse?.nurse_update_requests?.find((r: any) => r.status === 'pending')
  const isUpdatePending = nurse?.status === 'update_pending' || !!pendingRequest

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">My Profile</h1>
          <p className="dash-sub">{isEditing ? 'Edit your profile information' : 'Your nurse profile details'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {!isEditing && !isUpdatePending && (
            <Link href="/provider/profile?edit=1" style={{
              fontSize: '0.82rem', fontWeight: 700, color: '#fff',
              background: 'var(--teal)', padding: '8px 18px',
              borderRadius: '8px', textDecoration: 'none',
            }}>
              ✏️ Edit Profile
            </Link>
          )}
          {isEditing && (
            <Link href="/provider/profile" style={{
              fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)',
              background: 'var(--cream)', border: '1px solid var(--border)',
              padding: '8px 18px', borderRadius: '8px', textDecoration: 'none',
            }}>
              Cancel
            </Link>
          )}
          <Link href="/provider/documents" style={{
            fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)',
            background: 'rgba(14,123,140,0.08)', border: '1px solid rgba(14,123,140,0.2)',
            padding: '8px 14px', borderRadius: '8px', textDecoration: 'none',
          }}>
            📄 Documents
          </Link>
        </div>
      </div>

      {/* Alert banners */}
      {params.notice === 'sensitive' && (
        <div style={bannerStyle('orange')}>
          ✅ Your profile update request has been sent to admin for approval.
        </div>
      )}
      {params.message && (
        <div className="auth-success" style={{ marginBottom: '1.2rem' }}>
          {decodeURIComponent(params.message)}
        </div>
      )}
      {params.error && (
        <div className="auth-error" style={{ marginBottom: '1.2rem' }}>
          ⚠️ {decodeURIComponent(params.error)}
        </div>
      )}

      {/* Update pending banner */}
      {isUpdatePending && (
        <div style={bannerStyle('orange')}>
          <strong>⏳ Profile update pending admin approval.</strong>
          <span style={{ fontWeight: 400, marginLeft: '0.4rem' }}>
            Editing is disabled until admin reviews your request.
          </span>
          {pendingRequest && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem' }}>
              Changed fields: <strong>{(pendingRequest.changed_fields as string[]).join(', ')}</strong>
            </div>
          )}
        </div>
      )}

      {isEditing && !isUpdatePending ? (
        <EditForm nurse={nurse} />
      ) : (
        <ViewProfile nurse={nurse} isUpdatePending={isUpdatePending} />
      )}
    </div>
  )
}

/* ── View mode ─────────────────────────────────────────────────── */
function ViewProfile({ nurse, isUpdatePending }: { nurse: any; isUpdatePending: boolean }) {
  if (!nurse) {
    return (
      <div className="dash-card">
        <div className="dash-card-body" style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Profile not found. <Link href="/provider/onboarding" style={{ color: 'var(--teal)' }}>Complete onboarding →</Link>
        </div>
      </div>
    )
  }

  const statusColor: Record<string, string> = {
    pending: '#F5842A', approved: '#27A869', rejected: '#E04A4A', update_pending: '#b85e00',
  }
  const statusBg: Record<string, string> = {
    pending: 'rgba(245,132,42,0.1)', approved: 'rgba(39,168,105,0.1)',
    rejected: 'rgba(224,74,74,0.1)', update_pending: 'rgba(184,94,0,0.1)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Personal */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Personal Information</span>
          <span style={{ background: statusBg[nurse.status] ?? 'var(--cream)', color: statusColor[nurse.status] ?? 'var(--muted)', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '50px', textTransform: 'capitalize' }}>
            {nurse.status?.replace('_', ' ')}
          </span>
        </div>
        <div className="dash-card-body">
          <div style={gridStyle}>
            <Field label="Full Name"    value={nurse.full_name} />
            <Field label="Email"        value={nurse.email} />
            <Field label="Phone"        value={nurse.phone} />
            <Field label="City"         value={nurse.city} />
            <Field label="Gender"       value={nurse.gender} capitalize />
            <Field label="Nationality"  value={nurse.nationality} />
          </div>
          {nurse.bio && (
            <div style={{ marginTop: '1rem' }}>
              <div style={fieldLabel}>Bio</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>{nurse.bio}</div>
            </div>
          )}
        </div>
      </div>

      {/* Professional */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Professional Details</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>🔒 Requires admin approval to change</span>
        </div>
        <div className="dash-card-body">
          <div style={gridStyle}>
            <Field label="Specialization"     value={nurse.specialization} />
            <Field label="Years of Experience" value={nurse.experience_years != null ? `${nurse.experience_years} years` : null} />
            <Field label="License Number"      value={nurse.license_no} />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Pricing</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>🔒 Requires admin approval to change</span>
        </div>
        <div className="dash-card-body">
          <div style={gridStyle}>
            <Field label="Hourly Patient Rate"  value={nurse.hourly_rate   ? `SAR ${nurse.hourly_rate}`        : null} />
            <Field label="Daily Shift Rate"     value={nurse.daily_rate    ? `SAR ${nurse.daily_rate}`         : null} />
            <Field label="Final Hourly (Patient)" value={nurse.final_hourly_price ? `SAR ${nurse.final_hourly_price}` : null} />
            <Field label="Final Daily (Patient)"  value={nurse.final_daily_price  ? `SAR ${nurse.final_daily_price}`  : null} />
            <Field label="Commission"           value={nurse.commission_percent ? `${nurse.commission_percent}%` : null} />
          </div>
        </div>
      </div>

      {isUpdatePending && (
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center' }}>
          Editing is disabled while your profile update is pending admin approval.
        </p>
      )}
    </div>
  )
}

/* ── Edit form ─────────────────────────────────────────────────── */
function EditForm({ nurse }: { nurse: any }) {
  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Edit Profile</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(245,132,42,0.08)', color: '#b85e00', border: '1px solid rgba(245,132,42,0.2)', padding: '3px 10px', borderRadius: '50px' }}>
          🔒 Sensitive fields need admin approval
        </span>
      </div>
      <div className="dash-card-body">
        <form action={updateProfileAction}>

          <SectionLabel>Personal Information — saved immediately</SectionLabel>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-input" defaultValue={nurse?.gender ?? ''}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nationality</label>
              <input type="text" name="nationality" className="form-input" defaultValue={nurse?.nationality ?? ''} placeholder="e.g. Saudi, Pakistani" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" name="phone" className="form-input" defaultValue={nurse?.phone ?? ''} placeholder="+966 5X XXX XXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <select name="city" className="form-input" defaultValue={nurse?.city ?? ''}>
                <option value="">Select city</option>
                {['Riyadh','Jeddah','Dammam','Mecca','Medina','Khobar','Tabuk','Abha'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea name="bio" className="form-input" rows={3} defaultValue={nurse?.bio ?? ''} placeholder="Tell patients about your experience..." style={{ resize: 'vertical' }} />
          </div>

          <SectionLabel sensitive>Professional Details — requires admin approval</SectionLabel>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Years of Experience</label>
              <input type="number" name="experience_years" className="form-input" defaultValue={nurse?.experience_years ?? ''} min="0" max="50" />
            </div>
            <div className="form-group">
              <label className="form-label">Specialization</label>
              <input type="text" name="specialization" className="form-input" defaultValue={nurse?.specialization ?? ''} placeholder="e.g. ICU Care" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">SCHS License Number</label>
            <input type="text" name="license_no" className="form-input" defaultValue={nurse?.license_no ?? ''} placeholder="SCHS-1234567" />
          </div>

          <SectionLabel sensitive>Pricing — requires admin approval</SectionLabel>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
            Your current approved rates stay active until admin approves the change.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Hourly Patient Rate (SAR)</label>
              <input type="number" name="hourly_rate" className="form-input" defaultValue={nurse?.hourly_rate ?? ''} min="0" step="0.01" placeholder="e.g. 100" />
            </div>
            <div className="form-group">
              <label className="form-label">Daily Shift Rate (SAR)</label>
              <input type="number" name="daily_rate" className="form-input" defaultValue={nurse?.daily_rate ?? ''} min="0" step="0.01" placeholder="e.g. 700" />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────────────── */
const gridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem',
}
const fieldLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px',
}

function Field({ label, value, capitalize }: { label: string; value: any; capitalize?: boolean }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <div style={{ fontSize: '0.88rem', color: value ? 'var(--text)' : 'var(--muted)', fontStyle: value ? 'normal' : 'italic', textTransform: capitalize ? 'capitalize' : 'none' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

function SectionLabel({ children, sensitive }: { children: React.ReactNode; sensitive?: boolean }) {
  return (
    <div style={{ fontWeight: 700, fontSize: '0.78rem', color: sensitive ? '#b85e00' : 'var(--teal)', margin: '1.2rem 0 0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      {sensitive && '🔒'} {children}
    </div>
  )
}

function bannerStyle(color: 'orange' | 'green'): React.CSSProperties {
  const map = {
    orange: { bg: 'rgba(245,132,42,0.07)', border: 'rgba(245,132,42,0.25)', text: '#b85e00' },
    green:  { bg: 'rgba(39,168,105,0.07)', border: 'rgba(39,168,105,0.25)', text: '#166534' },
  }
  const c = map[color]
  return {
    background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px',
    padding: '0.85rem 1.2rem', marginBottom: '1.2rem', color: c.text, fontSize: '0.875rem',
  }
}
