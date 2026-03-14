import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

const DOC_LABELS: Record<string, string> = {
  biodata:             'Biodata / Resume',
  national_id:         'National ID / Iqama',
  passport:            'Passport',
  photo:               'Passport Size Photo',
  nursing_certificate: 'Nursing Certificate',
  nursing_license:     'Nursing License',
}

const DOC_ICONS: Record<string, string> = {
  biodata:             '📋',
  national_id:         '🪪',
  passport:            '📗',
  photo:               '📷',
  nursing_certificate: '🎓',
  nursing_license:     '📜',
}

export default async function ProviderDocumentsPage() {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id, status')
    .eq('user_id', user.id)
    .single()

  if (!nurse) {
    return (
      <div className="dash-shell">
        <div className="dash-header">
          <h1 className="dash-title">Documents</h1>
        </div>
        <div className="dash-card">
          <div className="dash-card-body" style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Please <Link href="/provider/onboarding" style={{ color: 'var(--teal)' }}>complete your onboarding</Link> first.
          </div>
        </div>
      </div>
    )
  }

  const [{ data: nurseDocs }, { data: agreements }] = await Promise.all([
    supabase
      .from('nurse_documents')
      .select('*')
      .eq('nurse_id', nurse.id),
    supabase
      .from('nurse_agreements')
      .select('*')
      .eq('nurse_id', nurse.id)
      .order('uploaded_at', { ascending: false }),
  ])

  const docMap: Record<string, any> = {}
  for (const doc of nurseDocs ?? []) {
    docMap[doc.doc_type] = doc
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Documents</h1>
          <p className="dash-sub">Your uploaded documents and admin agreements</p>
        </div>
        <Link href="/provider/onboarding" style={{
          fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)',
          background: 'rgba(14,123,140,0.08)', border: '1px solid rgba(14,123,140,0.2)',
          padding: '6px 14px', borderRadius: '8px', textDecoration: 'none',
        }}>
          + Upload / Update Documents
        </Link>
      </div>

      {/* Nurse uploaded documents */}
      <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
        <div className="dash-card-header">
          <span className="dash-card-title">Your Documents</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {Object.keys(docMap).length} / {Object.keys(DOC_LABELS).length} uploaded
          </span>
        </div>
        <div className="dash-card-body" style={{ padding: 0 }}>
          {Object.entries(DOC_LABELS).map(([key, label]) => {
            const doc = docMap[key]
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '1.3rem', width: 32, textAlign: 'center' }}>
                  {DOC_ICONS[key]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</div>
                  {doc ? (
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '2px' }}>
                      {doc.file_name} · {new Date(doc.uploaded_at).toLocaleDateString()}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.74rem', color: '#E04A4A', marginTop: '2px' }}>Not uploaded</div>
                  )}
                </div>
                {doc ? (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.78rem', fontWeight: 600, color: 'var(--teal)',
                      background: 'rgba(14,123,140,0.07)', border: '1px solid rgba(14,123,140,0.2)',
                      padding: '5px 12px', borderRadius: '7px', textDecoration: 'none',
                    }}
                  >
                    View
                  </a>
                ) : (
                  <span style={{
                    fontSize: '0.75rem', color: 'var(--muted)',
                    background: 'var(--cream)', border: '1px solid var(--border)',
                    padding: '5px 12px', borderRadius: '7px',
                  }}>
                    Missing
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Admin agreements */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Admin Documents</span>
          <span style={{
            fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)',
            background: 'var(--cream)', border: '1px solid var(--border)',
            padding: '3px 10px', borderRadius: '50px',
          }}>
            View only
          </span>
        </div>
        <div className="dash-card-body" style={{ padding: 0 }}>
          {!agreements || agreements.length === 0 ? (
            <div style={{ padding: '2rem 1.5rem', color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              No agreement documents uploaded yet.
            </div>
          ) : (
            agreements.map((ag: any) => (
              <div key={ag.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '1.3rem' }}>📑</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Service Agreement</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '2px' }}>
                    {ag.file_name} · Uploaded {new Date(ag.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <a
                  href={ag.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.78rem', fontWeight: 600, color: 'var(--teal)',
                    background: 'rgba(14,123,140,0.07)', border: '1px solid rgba(14,123,140,0.2)',
                    padding: '5px 12px', borderRadius: '7px', textDecoration: 'none',
                  }}
                >
                  View
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
