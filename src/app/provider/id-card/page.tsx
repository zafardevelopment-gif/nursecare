import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function NurseIdCardPage() {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id, full_name, status, specialization, city')
    .eq('user_id', user.id)
    .single()

  const { data: photoDocs } = nurse
    ? await supabase
        .from('nurse_documents')
        .select('file_url')
        .eq('nurse_id', nurse.id)
        .eq('doc_type', 'photo')
        .limit(1)
    : { data: [] }

  const photoUrl = photoDocs?.[0]?.file_url ?? null

  const { data: card } = nurse
    ? await supabase
        .from('nurse_id_cards')
        .select('*')
        .eq('nurse_id', nurse.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    : { data: null }

  const isExpired = card ? new Date(card.expiry_date) < new Date() : false
  const effectiveStatus = !card ? 'none' : card.status === 'revoked' ? 'revoked' : isExpired ? 'expired' : 'active'

  const notApproved = nurse?.status !== 'approved'

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">My ID Card</h1>
          <p className="dash-sub">Your official NurseCare+ healthcare provider identification</p>
        </div>
      </div>

      {notApproved ? (
        <div className="dash-card">
          <div className="dash-card-body" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🪪</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>ID Card Not Available</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Your ID card will be issued once your account is approved by the admin.
            </p>
          </div>
        </div>
      ) : !card || effectiveStatus === 'none' ? (
        <div className="dash-card">
          <div className="dash-card-body" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🕐</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>ID Card Pending</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Your account is approved. The admin will issue your ID card shortly.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Left: ID Card preview iframe */}
          <div className="dash-card" style={{ overflow: 'hidden' }}>
            <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="dash-card-title">Your ID Card</span>
              <span style={{
                background: effectiveStatus === 'active' ? '#E8F9F0' : '#FEE8E8',
                color: effectiveStatus === 'active' ? '#27A869' : '#E04A4A',
                padding: '3px 12px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
              }}>
                {effectiveStatus === 'active' ? '✓ Valid' : effectiveStatus === 'expired' ? 'Expired' : 'Revoked'}
              </span>
            </div>
            <div className="dash-card-body" style={{ padding: 0 }}>
              <iframe
                src={`/api/id-cards/${card.id}/print?embed=1`}
                style={{ width: '100%', height: 480, border: 'none', display: 'block' }}
                title="ID Card Preview"
              />
            </div>
          </div>

          {/* Right: details + download */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="dash-card">
              <div className="dash-card-header"><span className="dash-card-title">Card Details</span></div>
              <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {[
                  { label: 'ID Code',    value: card.unique_id_code },
                  { label: 'Issued',     value: new Date(card.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) },
                  { label: 'Valid Until',value: new Date(card.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {effectiveStatus === 'expired' && (
              <div className="dash-card" style={{ borderColor: '#FECACA' }}>
                <div className="dash-card-body" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>⚠️</div>
                  <div style={{ fontWeight: 700, color: '#E04A4A', fontSize: '0.9rem', marginBottom: 4 }}>Card Expired</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Contact the admin to renew your ID card.</p>
                </div>
              </div>
            )}

            <div className="dash-card">
              <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a
                  href={`/api/id-cards/${card.id}/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: '#0E7B8C', color: '#fff', border: 'none', padding: '11px 16px', borderRadius: 9, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', textDecoration: 'none', textAlign: 'center', display: 'block' }}
                >
                  🖨 Print / Download PDF
                </a>
                <Link
                  href={`/verify?id=${card.unique_id_code}`}
                  target="_blank"
                  style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: 9, fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', textAlign: 'center', display: 'block' }}
                >
                  🔍 Preview Verification Page
                </Link>
              </div>
            </div>

            <div className="dash-card" style={{ background: '#E8F4FD', borderColor: '#0E7B8C33' }}>
              <div className="dash-card-body">
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0E7B8C', marginBottom: 6 }}>💡 How to use</div>
                <ul style={{ fontSize: '0.8rem', color: 'var(--muted)', paddingLeft: 16, lineHeight: 1.7 }}>
                  <li>Show your ID card to patients before providing care</li>
                  <li>Patients can scan the QR code to verify your identity</li>
                  <li>Download and print for a physical copy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
