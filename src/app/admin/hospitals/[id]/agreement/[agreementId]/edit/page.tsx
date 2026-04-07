import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import HospitalAgreementEditForm from './HospitalAgreementEditForm'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string; agreementId: string }>
}

export default async function EditHospitalAgreementPage({ params }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const { id: hospitalId, agreementId } = await params

  const [{ data: agreement }, { data: hospital }] = await Promise.all([
    supabase.from('hospital_agreements').select('*').eq('id', agreementId).single(),
    supabase.from('hospitals').select('id, hospital_name').eq('id', hospitalId).single(),
  ])

  if (!agreement || !hospital) notFound()

  // Only allow editing draft or admin_approved (not sent/accepted)
  if (['sent', 'hospital_accepted', 'active'].includes(agreement.status)) {
    redirect(`/admin/hospitals/${hospitalId}/agreement/${agreementId}`)
  }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Link href={`/admin/hospitals/${hospitalId}/agreement/${agreementId}`} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
              ← {agreement.ref_number}
            </Link>
          </div>
          <h1 className="dash-title">Edit Agreement</h1>
          <p className="dash-sub">{hospital.hospital_name} · {agreement.ref_number}</p>
        </div>
        <span style={{ background: '#FFF8F0', color: '#b85e00', fontSize: '0.75rem', fontWeight: 700, padding: '5px 12px', borderRadius: 50 }}>
          ✏️ Editing
        </span>
      </div>

      <HospitalAgreementEditForm
        agreement={agreement}
        hospitalId={hospitalId}
      />
    </div>
  )
}
