import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import IdCardsClient from './IdCardsClient'

export const dynamic = 'force-dynamic'

export default async function AdminIdCardsPage() {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  // Step 1: fetch all cards
  const { data: cards } = await supabase
    .from('nurse_id_cards')
    .select('id, nurse_id, unique_id_code, issue_date, expiry_date, status, created_at')
    .order('created_at', { ascending: false })

  // Step 2: fetch nurse profiles for all nurse_ids in one query
  const nurseIds = [...new Set((cards ?? []).map(c => c.nurse_id))]
  const { data: nurses } = nurseIds.length
    ? await supabase
        .from('nurses')
        .select('id, full_name, email, specialization, city')
        .in('id', nurseIds)
    : { data: [] }

  const nurseMap = Object.fromEntries((nurses ?? []).map(n => [n.id, n]))

  // Step 3: merge and enrich
  const enriched = (cards ?? []).map(c => ({
    ...c,
    nurses: nurseMap[c.nurse_id] ?? null,
    is_expired: c.status === 'active' && new Date(c.expiry_date) < new Date(),
    effective_status:
      c.status === 'revoked' ? 'revoked'
      : new Date(c.expiry_date) < new Date() ? 'expired'
      : 'active',
  }))

  const counts = {
    active:  enriched.filter(c => c.effective_status === 'active').length,
    expired: enriched.filter(c => c.effective_status === 'expired').length,
    revoked: enriched.filter(c => c.effective_status === 'revoked').length,
  }

  return (
    <div className="dash-shell">
      <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link href="/admin/nurses" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none' }}>
              ← Nurses
            </Link>
          </div>
          <h1 className="dash-title">Nurse ID Cards</h1>
          <p className="dash-sub">View and manage all issued ID cards</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Active',  count: counts.active,  color: '#27A869', bg: '#E8F9F0' },
          { label: 'Expired', count: counts.expired, color: '#E04A4A', bg: '#FEE8E8' },
          { label: 'Revoked', count: counts.revoked, color: '#9AABB8', bg: 'var(--cream)' },
        ].map(k => (
          <div key={k.label} className="dash-card" style={{ textAlign: 'center', padding: '1.1rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: k.color }}>{k.count}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <IdCardsClient cards={enriched} />
    </div>
  )
}
