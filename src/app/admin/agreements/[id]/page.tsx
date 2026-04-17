import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AgreementDetailClient from './AgreementDetailClient'
import { resubmitAgreementToNurse } from '../actions'

export const dynamic = 'force-dynamic'

export default async function AdminAgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin')
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: agreement } = await supabase
    .from('agreements')
    .select('*')
    .eq('id', id)
    .single()

  if (!agreement) notFound()

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link href="/admin/agreements" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none' }}>
              ← Agreements
            </Link>
          </div>
          <h1 className="dash-title">{agreement.title}</h1>
          <p className="dash-sub">Agreement ID: {agreement.id.substring(0, 8).toUpperCase()} · v{agreement.template_version}</p>
        </div>
      </div>

      <AgreementDetailClient agreement={agreement} resubmitAction={resubmitAgreementToNurse} />
    </div>
  )
}
