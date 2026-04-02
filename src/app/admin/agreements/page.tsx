import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import GenerateClient from './GenerateClient'
import AgreementsClient from './AgreementsClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: 'Pending',          color: '#b85e00', bg: '#FFF8F0' },
  admin_approved:    { label: 'Awaiting Nurse',    color: '#0E5C8C', bg: '#EEF6FD' },
  nurse_approved:    { label: 'Nurse Approved',    color: '#0E7B8C', bg: '#E8F4FD' },
  hospital_approved: { label: 'Hospital Approved', color: '#0E7B8C', bg: '#E8F4FD' },
  fully_approved:    { label: 'Fully Executed',    color: '#1A7A4A', bg: '#E8F9F0' },
}

export default async function AgreementsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  await requireRole('admin')
  const sp = await searchParams
  const supabase   = await createSupabaseServerClient()
  const adminClient = createSupabaseServiceRoleClient()

  const [
    { data: agreements },
    { data: templates },
    { data: nurseRows },
    { data: hospitalRows },
    { data: adminRows },
  ] = await Promise.all([
    supabase
      .from('agreements')
      .select('id, title, status, generated_at, nurse_id, hospital_id, template_version, generated_by')
      .order('generated_at', { ascending: false }),
    supabase
      .from('agreement_templates')
      .select('id, title')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.from('nurses').select('id, full_name, email'),
    adminClient.from('users').select('id, full_name, email').eq('role', 'hospital'),
    adminClient.from('users').select('id, full_name, email').eq('role', 'admin'),
  ])

  // Build lookup maps
  const nurseMap    = Object.fromEntries((nurseRows    ?? []).map(n => [n.id, n]))
  const hospitalMap = Object.fromEntries((hospitalRows ?? []).map(h => [h.id, h]))
  const adminMap    = Object.fromEntries((adminRows    ?? []).map(a => [a.id, a]))

  const statusCounts: Record<string, number> = {
    pending: 0, admin_approved: 0, nurse_approved: 0, hospital_approved: 0, fully_approved: 0,
  }
  for (const a of agreements ?? []) {
    if (a.status in statusCounts) statusCounts[a.status as keyof typeof statusCounts]++
  }

  // Enrich agreements with display names
  const enriched = (agreements ?? []).map(a => {
    const nurse    = a.nurse_id    ? nurseMap[a.nurse_id]       : null
    const hospital = a.hospital_id ? hospitalMap[a.hospital_id] : null
    const adminU   = a.generated_by ? adminMap[a.generated_by]  : null
    return {
      id:               a.id,
      title:            a.title,
      status:           a.status,
      generated_at:     a.generated_at,
      nurse_id:         a.nurse_id,
      hospital_id:      a.hospital_id,
      template_version: a.template_version,
      nurseName:        nurse?.full_name ?? nurse?.email ?? '',
      partyName:        hospital?.full_name ?? hospital?.email ?? adminU?.full_name ?? adminU?.email ?? 'Admin',
    }
  })

  return (
    <div className="dash-shell">
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dash-title">Digital Agreements</h1>
          <p className="dash-sub">Generate, manage and track service agreements</p>
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

      {/* Status KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(statusCounts).map(([key, count]) => {
          const s = STATUS_LABELS[key]
          return (
            <div key={key} className="dash-card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{count}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
            </div>
          )
        })}
        <div className="dash-card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ink)' }}>{enriched.length}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Total</div>
        </div>
      </div>

      {/* Table with search + pagination + delete */}
      <AgreementsClient
        agreements={enriched}
        search={sp.search ?? ''}
        statusFilter={sp.status ?? ''}
      />
    </div>
  )
}
