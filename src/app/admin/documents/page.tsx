import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import GenerateClient from '../agreements/GenerateClient'
import AgreementsClient from '../agreements/AgreementsClient'
import IdCardsClient from '../nurses/id-cards/IdCardsClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const AGREEMENT_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: 'Pending',          color: '#b85e00', bg: '#FFF8F0' },
  admin_approved:    { label: 'Awaiting Nurse',    color: '#0E5C8C', bg: '#EEF6FD' },
  nurse_approved:    { label: 'Nurse Approved',    color: '#0E7B8C', bg: '#E8F4FD' },
  hospital_approved: { label: 'Hospital Approved', color: '#0E7B8C', bg: '#E8F4FD' },
  fully_approved:    { label: 'Fully Executed',    color: '#1A7A4A', bg: '#E8F9F0' },
  rejected:          { label: 'Rejected',          color: '#C0392B', bg: '#FEF2F2' },
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '9px 22px', borderRadius: 10, fontWeight: 700,
    fontSize: '0.85rem', textDecoration: 'none',
    border: active ? 'none' : '1px solid var(--border)',
    background: active ? 'var(--teal)' : 'var(--card)',
    color: active ? '#fff' : 'var(--muted)',
    boxShadow: active ? '0 2px 10px rgba(14,123,140,0.2)' : 'none',
  }
}

interface Props {
  searchParams: Promise<{ tab?: string; search?: string; status?: string }>
}

export default async function AdminDocumentsPage({ searchParams }: Props) {
  await requireRole('admin')
  const sp      = await searchParams
  const activeTab = sp.tab === 'id-cards' ? 'id-cards' : 'agreements'

  const supabase    = await createSupabaseServerClient()
  const adminClient = createSupabaseServiceRoleClient()

  /* ── Agreements data ────────────────────────────────────────────── */
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

  const nurseMap    = Object.fromEntries((nurseRows    ?? []).map(n => [n.id, n]))
  const hospitalMap = Object.fromEntries((hospitalRows ?? []).map(h => [h.id, h]))
  const adminMap    = Object.fromEntries((adminRows    ?? []).map(a => [a.id, a]))

  const statusCounts: Record<string, number> = {
    pending: 0, admin_approved: 0, nurse_approved: 0, hospital_approved: 0, fully_approved: 0, rejected: 0,
  }
  for (const a of agreements ?? []) {
    if (a.status in statusCounts) statusCounts[a.status as keyof typeof statusCounts]++
  }

  const enrichedAgreements = (agreements ?? []).map(a => ({
    id:               a.id,
    title:            a.title,
    status:           a.status,
    generated_at:     a.generated_at,
    nurse_id:         a.nurse_id,
    hospital_id:      a.hospital_id,
    template_version: a.template_version,
    nurseName:  (a.nurse_id    ? nurseMap[a.nurse_id]?.full_name    ?? nurseMap[a.nurse_id]?.email    ?? '' : ''),
    partyName:  (a.hospital_id ? hospitalMap[a.hospital_id]?.full_name ?? hospitalMap[a.hospital_id]?.email ?? (a.generated_by ? adminMap[a.generated_by]?.full_name ?? adminMap[a.generated_by]?.email ?? 'Admin' : 'Admin') : (a.generated_by ? adminMap[a.generated_by]?.full_name ?? adminMap[a.generated_by]?.email ?? 'Admin' : 'Admin')),
  }))

  /* ── ID Cards data ──────────────────────────────────────────────── */
  const { data: cards } = await supabase
    .from('nurse_id_cards')
    .select('id, nurse_id, unique_id_code, issue_date, expiry_date, status, created_at')
    .order('created_at', { ascending: false })

  const nurseIds = [...new Set((cards ?? []).map(c => c.nurse_id))]
  const { data: idCardNurses } = nurseIds.length
    ? await supabase.from('nurses').select('id, full_name, email, specialization, city').in('id', nurseIds)
    : { data: [] }
  const idCardNurseMap = Object.fromEntries((idCardNurses ?? []).map(n => [n.id, n]))

  const enrichedCards = (cards ?? []).map(c => ({
    ...c,
    nurses: idCardNurseMap[c.nurse_id] ?? null,
    is_expired: c.status === 'active' && new Date(c.expiry_date) < new Date(),
    effective_status:
      c.status === 'revoked' ? 'revoked'
      : new Date(c.expiry_date) < new Date() ? 'expired'
      : 'active',
  }))
  const cardCounts = {
    active:  enrichedCards.filter(c => c.effective_status === 'active').length,
    expired: enrichedCards.filter(c => c.effective_status === 'expired').length,
    revoked: enrichedCards.filter(c => c.effective_status === 'revoked').length,
  }

  return (
    <div className="dash-shell">
      {/* Header */}
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dash-title">Documents</h1>
          <p className="dash-sub">Agreements and nurse ID cards</p>
        </div>
        {activeTab === 'agreements' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/admin/agreements/templates" style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 9, fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>
              📋 Templates
            </Link>
            <GenerateClient
              templates={templates ?? []}
              nurses={(nurseRows ?? []).map(n => ({ id: n.id, full_name: n.full_name ?? '', email: n.email ?? '' }))}
              hospitals={(hospitalRows ?? []).map(h => ({ id: h.id, full_name: h.full_name ?? '', email: h.email ?? '' }))}
            />
          </div>
        )}
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <Link href="/admin/documents?tab=agreements" style={tabStyle(activeTab === 'agreements')}>📄 Agreements</Link>
        <Link href="/admin/documents?tab=id-cards"   style={tabStyle(activeTab === 'id-cards')}>🪪 ID Cards</Link>
      </div>

      {/* ══ AGREEMENTS TAB ══ */}
      {activeTab === 'agreements' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {Object.entries(statusCounts).map(([key, count]) => {
              const s = AGREEMENT_STATUS_LABELS[key]
              return (
                <div key={key} className="dash-card" style={{ textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{count}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
                </div>
              )
            })}
            <div className="dash-card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ink)' }}>{enrichedAgreements.length}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Total</div>
            </div>
          </div>
          <AgreementsClient
            agreements={enrichedAgreements}
            search={sp.search ?? ''}
            statusFilter={sp.status ?? ''}
          />
        </>
      )}

      {/* ══ ID CARDS TAB ══ */}
      {activeTab === 'id-cards' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Active',  count: cardCounts.active,  color: '#27A869', bg: '#E8F9F0' },
              { label: 'Expired', count: cardCounts.expired, color: '#E04A4A', bg: '#FEE8E8' },
              { label: 'Revoked', count: cardCounts.revoked, color: '#9AABB8', bg: 'var(--cream)' },
            ].map(k => (
              <div key={k.label} className="dash-card" style={{ textAlign: 'center', padding: '1.1rem' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: k.color }}>{k.count}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
          <IdCardsClient cards={enrichedCards} />
        </>
      )}
    </div>
  )
}
