import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import HospitalAgreementForm from './HospitalAgreementForm'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewHospitalAgreementPage({ params }: Props) {
  await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()
  const { id } = await params

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, hospital_name, contact_person, email, phone, city, license_cr, address, scope_of_services, status')
    .eq('id', id)
    .single()

  if (!hospital) notFound()
  if (hospital.status === 'pending' || hospital.status === 'rejected') {
    redirect(`/admin/hospitals/${id}`)
  }

  // Generate next ref number
  const { count } = await supabase
    .from('hospital_agreements')
    .select('*', { count: 'exact', head: true })

  const nextNum  = String((count ?? 0) + 1).padStart(4, '0')
  const refNumber = `AGR-${new Date().getFullYear()}-${nextNum}`

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Link href={`/admin/hospitals/${id}`} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
              ← {hospital.hospital_name}
            </Link>
          </div>
          <h1 className="dash-title">New Hospital Agreement</h1>
          <p className="dash-sub">{hospital.hospital_name} · {refNumber}</p>
        </div>
        <span style={{ background: 'rgba(245,132,42,0.1)', color: '#F5842A', fontSize: '0.75rem', fontWeight: 700, padding: '5px 12px', borderRadius: 50 }}>
          ⏳ Draft
        </span>
      </div>

      {/* Step bar */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
        {[
          { n: '1', label: 'Draft', sub: 'Now', active: true, done: false },
          { n: '2', label: 'Generate', sub: 'Preview', active: false, done: false },
          { n: '3', label: 'Send', sub: 'To Hospital', active: false, done: false },
          { n: '4', label: 'Hospital Review', sub: 'Accept/Reject', active: false, done: false },
          { n: '5', label: 'Active', sub: '—', active: false, done: false },
        ].map((step, i, arr) => (
          <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 800, flexShrink: 0,
                background: step.done ? 'var(--teal)' : step.active ? '#fff' : 'var(--cream)',
                color: step.done ? '#fff' : step.active ? 'var(--teal)' : 'var(--muted)',
                border: step.active ? '2px solid var(--teal)' : '2px solid var(--border)',
                boxShadow: step.active ? '0 0 0 3px rgba(14,123,140,0.14)' : 'none',
              }}>
                {step.done ? '✓' : step.n}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: step.active ? 'var(--ink)' : 'var(--muted)' }}>{step.label}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>{step.sub}</div>
              </div>
            </div>
            {i < arr.length - 1 && (
              <div style={{ flex: 1, height: 2, background: 'var(--border)', margin: '0 8px', marginBottom: 20 }} />
            )}
          </div>
        ))}
      </div>

      <HospitalAgreementForm hospital={hospital} refNumber={refNumber} hospitalId={id} />
    </div>
  )
}
