import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { approveNurse, rejectNurse, updateNursePrice, uploadAgreement } from '../actions'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

const DOC_LABELS: Record<string, string> = {
  biodata:             'Biodata / Resume',
  national_id:         'National ID / Iqama',
  passport:            'Passport',
  photo:               'Photo',
  nursing_certificate: 'Nursing Certificate',
  nursing_license:     'Nursing License',
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pending:        { color: '#F5842A', bg: 'rgba(245,132,42,0.1)' },
  approved:       { color: '#27A869', bg: 'rgba(39,168,105,0.1)' },
  rejected:       { color: '#E04A4A', bg: 'rgba(224,74,74,0.1)'  },
  update_pending: { color: '#b85e00', bg: 'rgba(184,94,0,0.1)'   },
}

export default async function AdminNurseDetailPage({ params }: Props) {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()
  const { id }   = await params

  const [{ data: nurse }, { data: settings }] = await Promise.all([
    supabase
      .from('nurses')
      .select('*, nurse_documents(*), nurse_agreements(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('platform_settings')
      .select('commission_percent')
      .limit(1)
      .single(),
  ])

  if (!nurse) {
    return (
      <div className="dash-shell">
        <div className="dash-header"><h1 className="dash-title">Nurse Not Found</h1></div>
        <Link href="/admin/nurses" style={{ color: 'var(--teal)' }}>← Back to Nurses</Link>
      </div>
    )
  }

  const commission    = settings?.commission_percent ?? 10
  const docs: any[]   = nurse.nurse_documents ?? []
  const agreements: any[] = nurse.nurse_agreements ?? []
  const agreement     = agreements[0] ?? null

  const previewHourly = nurse.hourly_rate ? (nurse.hourly_rate + (nurse.hourly_rate * commission / 100)).toFixed(2) : null
  const previewDaily  = nurse.daily_rate  ? (nurse.daily_rate  + (nurse.daily_rate  * commission / 100)).toFixed(2) : null

  const s = STATUS_STYLE[nurse.status] ?? { color: 'var(--muted)', bg: 'var(--cream)' }

  const isPending  = nurse.status === 'pending'
  const isApproved = nurse.status === 'approved' || nurse.status === 'update_pending'

  return (
    <div className="dash-shell">
      {/* Header */}
      <div className="dash-header">
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link href="/admin/nurses" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none' }}>
              ← Back to Nurses
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="dash-title" style={{ margin: 0 }}>{nurse.full_name}</h1>
            <span style={{ background: s.bg, color: s.color, fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '50px', textTransform: 'capitalize' }}>
              {nurse.status.replace('_', ' ')}
            </span>
          </div>
          <p className="dash-sub">{nurse.email} · {nurse.phone} · {nurse.city}</p>
        </div>
        <div style={{ background: 'rgba(14,123,140,0.08)', border: '1px solid rgba(14,123,140,0.2)', borderRadius: '10px', padding: '0.6rem 1rem', fontSize: '0.82rem', color: 'var(--teal)', fontWeight: 600 }}>
          Commission: {commission}%
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Personal Info */}
          <div className="dash-card">
            <div className="dash-card-header"><span className="dash-card-title">Personal Information</span></div>
            <div className="dash-card-body">
              <div style={gridStyle}>
                <Field label="Gender"      value={nurse.gender}      capitalize />
                <Field label="Nationality" value={nurse.nationality} />
                <Field label="City"        value={nurse.city} />
                <Field label="Phone"       value={nurse.phone} />
                <Field label="Experience"  value={nurse.experience_years != null ? `${nurse.experience_years} yrs` : null} />
                <Field label="License No"  value={nurse.license_no} />
                <Field label="Specialization" value={nurse.specialization} />
              </div>
              {nurse.bio && (
                <div style={{ marginTop: '0.8rem', fontSize: '0.84rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                  "{nurse.bio}"
                </div>
              )}
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.8rem' }}>
                Submitted: {new Date(nurse.created_at).toLocaleDateString()}
                {nurse.approved_at && ` · Approved: ${new Date(nurse.approved_at).toLocaleDateString()}`}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="dash-card">
            <div className="dash-card-header"><span className="dash-card-title">Pricing</span></div>
            <div className="dash-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {nurse.hourly_rate && (
                  <PriceBox label="Hourly" nurseRate={nurse.hourly_rate} commission={commission} final={nurse.final_hourly_price ?? previewHourly} />
                )}
                {nurse.daily_rate && (
                  <PriceBox label="Daily" nurseRate={nurse.daily_rate} commission={commission} final={nurse.final_daily_price ?? previewDaily} />
                )}
              </div>

              {/* Price edit */}
              <form action={updateNursePrice} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap', background: 'rgba(14,123,140,0.04)', border: '1px solid rgba(14,123,140,0.15)', borderRadius: '10px', padding: '0.8rem 1rem' }}>
                <input type="hidden" name="nurseId" value={nurse.id} />
                <div>
                  <div style={smallLabel}>Hourly Rate</div>
                  <input type="number" name="hourly_rate" defaultValue={nurse.hourly_rate ?? ''} min="0" step="0.01" style={inputStyle} />
                </div>
                <div>
                  <div style={smallLabel}>Daily Rate</div>
                  <input type="number" name="daily_rate" defaultValue={nurse.daily_rate ?? ''} min="0" step="0.01" style={inputStyle} />
                </div>
                <button type="submit" style={{ ...btnStyle('teal'), alignSelf: 'flex-end' }}>Update Price</button>
              </form>
            </div>
          </div>

          {/* Agreement upload */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Service Agreement</span>
              {agreement && (
                <a href={agreement.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--teal)', textDecoration: 'none' }}>
                  View Current →
                </a>
              )}
            </div>
            <div className="dash-card-body">
              {agreement && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.82rem' }}>
                  <span>📑</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{agreement.file_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Uploaded {new Date(agreement.uploaded_at).toLocaleDateString()}</div>
                  </div>
                </div>
              )}
              <form action={uploadAgreement} encType="multipart/form-data" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <input type="hidden" name="nurseId" value={nurse.id} />
                <div style={{ flex: 1 }}>
                  <div style={smallLabel}>Upload PDF Agreement (replaces existing)</div>
                  <input type="file" name="agreement" accept=".pdf" required style={{ fontSize: '0.82rem', fontFamily: 'inherit', width: '100%' }} />
                </div>
                <button type="submit" style={btnStyle('purple')}>📑 Upload</button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Approval actions */}
          {isPending && (
            <div className="dash-card">
              <div className="dash-card-header"><span className="dash-card-title">Approval Decision</span></div>
              <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {/* Approve with price override */}
                <form action={approveNurse} style={{ background: 'rgba(39,168,105,0.04)', border: '1px solid rgba(39,168,105,0.15)', borderRadius: '10px', padding: '0.8rem 1rem' }}>
                  <input type="hidden" name="nurseId" value={nurse.id} />
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#27A869', marginBottom: '0.6rem' }}>✓ Approve Nurse</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                    <div>
                      <div style={smallLabel}>Hourly Rate (SAR)</div>
                      <input type="number" name="hourly_rate" defaultValue={nurse.hourly_rate ?? ''} min="0" step="0.01" placeholder="e.g. 100" style={{ ...inputStyle, width: '100px' }} />
                    </div>
                    <div>
                      <div style={smallLabel}>Daily Rate (SAR)</div>
                      <input type="number" name="daily_rate" defaultValue={nurse.daily_rate ?? ''} min="0" step="0.01" placeholder="e.g. 700" style={{ ...inputStyle, width: '100px' }} />
                    </div>
                  </div>
                  <button type="submit" style={btnStyle('green')}>✓ Approve</button>
                </form>

                {/* Reject */}
                <form action={rejectNurse} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <input type="hidden" name="nurseId" value={nurse.id} />
                  <div style={{ flex: 1 }}>
                    <div style={smallLabel}>Rejection Reason (optional)</div>
                    <input type="text" name="reason" placeholder="e.g. Missing documents" style={{ ...inputStyle, width: '100%' }} />
                  </div>
                  <button type="submit" style={btnStyle('red')}>✕ Reject</button>
                </form>
              </div>
            </div>
          )}

          {isApproved && nurse.rejection_reason === null && (
            <div style={{ background: 'rgba(39,168,105,0.06)', border: '1px solid rgba(39,168,105,0.2)', borderRadius: '10px', padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#27A869', fontWeight: 600 }}>
              ✓ This nurse is approved and active.
            </div>
          )}

          {nurse.status === 'rejected' && (
            <div style={{ background: 'rgba(224,74,74,0.06)', border: '1px solid rgba(224,74,74,0.2)', borderRadius: '10px', padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#E04A4A' }}>
              <strong>Rejected.</strong>{nurse.rejection_reason ? ` Reason: ${nurse.rejection_reason}` : ''}
            </div>
          )}

          {/* Documents */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Documents</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{docs.length} / {Object.keys(DOC_LABELS).length} uploaded</span>
            </div>
            <div className="dash-card-body" style={{ padding: 0 }}>
              {Object.entries(DOC_LABELS).map(([key, label]) => {
                const doc = docs.find(d => d.doc_type === key)
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 1.2rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{label}</div>
                      {doc && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '1px' }}>{doc.file_name}</div>}
                    </div>
                    {doc ? (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--teal)', background: 'rgba(14,123,140,0.07)', border: '1px solid rgba(14,123,140,0.2)', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none' }}>
                        View
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#E04A4A', background: 'rgba(224,74,74,0.07)', border: '1px solid rgba(224,74,74,0.15)', padding: '4px 10px', borderRadius: '6px' }}>Missing</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PriceBox({ label, nurseRate, commission, final }: { label: string; nurseRate: number; commission: number; final: any }) {
  const commAmt = (nurseRate * commission / 100).toFixed(2)
  return (
    <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.78rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{label}</div>
      <div>Nurse: <strong>SAR {Number(nurseRate).toFixed(2)}</strong></div>
      <div style={{ color: 'var(--muted)' }}>+{commission}%: SAR {commAmt}</div>
      <div style={{ color: '#27A869', fontWeight: 700, marginTop: '2px' }}>Patient: SAR {final ?? '—'}</div>
    </div>
  )
}

function Field({ label, value, capitalize }: { label: string; value: any; capitalize?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '0.85rem', color: value ? 'var(--text)' : 'var(--muted)', fontStyle: value ? 'normal' : 'italic', textTransform: capitalize ? 'capitalize' : 'none' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

const gridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.9rem',
}
const smallLabel: React.CSSProperties = {
  fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '3px', textTransform: 'uppercase',
}
const inputStyle: React.CSSProperties = {
  width: '90px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)',
  fontSize: '0.82rem', fontFamily: 'inherit',
}

function btnStyle(variant: 'green' | 'red' | 'teal' | 'purple'): React.CSSProperties {
  const map = {
    green:  { bg: '#27A869',               color: '#fff',    border: 'none' },
    red:    { bg: 'rgba(224,74,74,0.1)',    color: '#E04A4A', border: '1px solid rgba(224,74,74,0.25)' },
    teal:   { bg: 'rgba(14,123,140,0.1)',   color: 'var(--teal)', border: '1px solid rgba(14,123,140,0.25)' },
    purple: { bg: 'rgba(80,50,150,0.1)',    color: '#5032a0', border: '1px solid rgba(80,50,150,0.2)' },
  }
  const v = map[variant]
  return {
    background: v.bg, color: v.color, border: v.border,
    padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem',
    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}
