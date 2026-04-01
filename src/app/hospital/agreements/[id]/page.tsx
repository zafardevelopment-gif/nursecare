import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import HospitalAgreementApproveClient from './HospitalAgreementApproveClient'

export const dynamic = 'force-dynamic'

export default async function HospitalAgreementDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole('hospital')
  const supabase = await createSupabaseServerClient()

  const { data: agreement } = await supabase
    .from('agreements')
    .select('*')
    .eq('id', params.id)
    .eq('hospital_id', user.id)
    .single()

  if (!agreement) notFound()

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link href="/hospital/agreements" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none' }}>
              ← Agreements
            </Link>
          </div>
          <h1 className="dash-title">{agreement.title}</h1>
          <p className="dash-sub">Agreement ID: {agreement.id.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <HospitalAgreementApproveClient agreement={agreement} />
    </div>
  )
}
