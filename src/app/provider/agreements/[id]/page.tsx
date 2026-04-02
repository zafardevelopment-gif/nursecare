import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NurseAgreementApproveClient from './NurseAgreementApproveClient'

export const dynamic = 'force-dynamic'

export default async function NurseAgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole('provider')
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!nurse) notFound()

  const { data: agreement } = await supabase
    .from('agreements')
    .select('*')
    .eq('id', id)
    .eq('nurse_id', nurse.id)
    .single()

  if (!agreement) notFound()

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link href="/provider/agreements" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none' }}>
              ← My Agreements
            </Link>
          </div>
          <h1 className="dash-title">{agreement.title}</h1>
          <p className="dash-sub">Agreement ID: {agreement.id.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <NurseAgreementApproveClient agreement={agreement} />
    </div>
  )
}
