import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import GenerateClient from './GenerateClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: 'Pending',          color: '#b85e00', bg: '#FFF8F0' },
  nurse_approved:   { label: 'Nurse Approved',   color: '#0E7B8C', bg: '#E8F4FD' },
  hospital_approved:{ label: 'Hospital Approved',color: '#0E7B8C', bg: '#E8F4FD' },
  fully_approved:   { label: 'Fully Approved',   color: '#1A7A4A', bg: '#E8F9F0' },
}

export default async function AgreementsPage() {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [
    { data: agreements },
    { data: templates },
    { data: nurseRows },
    { data: hospitalRows },
  ] = await Promise.all([
    supabase
      .from('agreements')
      .select('id, title, status, generated_at, nurse_id, hospital_id, template_version')
      .order('generated_at', { ascending: false }),
    supabase
      .from('agreement_templates')
      .select('id, title')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.from('nurses').select('id, full_name, email'),
    adminClient.from('users').select('id, full_name, email').eq('role', 'hospital'),
  ])

  // Build lookup maps
  const nurseMap = Object.fromEntries((nurseRows ?? []).map(n => [n.id, n]))
  const hospitalMap = Object.fromEntries((hospitalRows ?? []).map(h => [h.id, h]))

  const statusCounts = {
    pending: 0, nurse_approved: 0, hospital_approved: 0, fully_approved: 0,
  }
  for (const a of agreements ?? []) {
    if (a.status in statusCounts) statusCounts[a.status as keyof typeof statusCounts]++
  }

  return (
    <div className="dash-shell">
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dash-title">Digital Agreements</h1>
          <p className="dash-sub">Generate, manage and track service agreements between nurses and hospitals</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/admin/agreements/templates" style={{
            background: 'var(--cream)', color: 'var(--ink)',
            border: '1px solid var(--border)', padding: '9px 18px',
            borderRadius: 9, fontWeight: 600, fontSize: '0.85rem',
            textDecoration: 'none', fontFamily: 'inherit',
          }}>
            📋 Templates
          </Link>
          <GenerateClient
            templates={templates ?? []}
            nurses={(nurseRows ?? []).map(n => ({ id: n.id, full_name: n.full_name ?? '', email: n.email ?? '' }))}
            hospitals={(hospitalRows ?? []).map(h => ({ id: h.id, full_name: h.full_name ?? '', email: h.email ?? '' }))}
          />
        </div>
      </div>

      {/* Status summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(statusCounts).map(([key, count]) => {
          const s = STATUS_LABELS[key]
          return (
            <div key={key} className="dash-card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{count}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Agreements table */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">All Agreements ({(agreements ?? []).length})</span>
        </div>
        <div className="dash-card-body" style={{ padding: 0 }}>
          {(agreements ?? []).length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
              No agreements yet. Generate your first one above.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Title', 'Nurse', 'Hospital', 'Status', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(agreements ?? []).map(a => {
                  const nurse = nurseMap[a.nurse_id]
                  const hospital = hospitalMap[a.hospital_id]
                  const s = STATUS_LABELS[a.status] ?? STATUS_LABELS.pending
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600 }}>
                        {a.title}
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 400 }}>v{a.template_version}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.83rem' }}>{nurse?.full_name ?? nurse?.email ?? a.nurse_id.substring(0,8)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.83rem' }}>{hospital?.full_name ?? hospital?.email ?? a.hospital_id.substring(0,8)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700 }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--muted)' }}>
                        {new Date(a.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/admin/agreements/${a.id}`} style={{
                          background: 'var(--cream)', color: 'var(--ink)',
                          border: '1px solid var(--border)', padding: '6px 14px',
                          borderRadius: 7, fontSize: '0.78rem', fontWeight: 600,
                          textDecoration: 'none',
                        }}>View →</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
