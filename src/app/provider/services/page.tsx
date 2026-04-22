import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { getServiceMasterEnabled } from '@/lib/platform-settings'
import NurseServicesClient from './NurseServicesClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProviderServicesPage() {
  const user    = await requireRole('provider')
  const supabase = createSupabaseServiceRoleClient()

  // Nurse profile (need nurse.id and status)
  const { data: nurse } = await supabase
    .from('nurses')
    .select('id, status, full_name')
    .eq('user_id', user.id)
    .single()

  const flagEnabled = await getServiceMasterEnabled()

  // Always load data regardless of flag — nurse can set up services in advance
  const [
    { data: nurseServices },
    { data: masterServices },
  ] = await Promise.all([
    nurse
      ? supabase
          .from('nurse_services')
          .select(`
            id, nurse_id, service_id, my_price, is_active, created_at, updated_at,
            services (
              id, name, description, base_price, min_price, max_price,
              duration_minutes, requires_equipment, category_id,
              service_categories ( name, icon )
            )
          `)
          .eq('nurse_id', nurse.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),

    supabase
      .from('services')
      .select(`
        id, name, description, base_price, min_price, max_price,
        duration_minutes, requires_equipment, category_id,
        service_categories ( id, name, icon )
      `)
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
  ])

  // Nurse not onboarded yet
  if (!nurse) {
    return (
      <div className="dash-shell">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">My Services</h1>
            <p className="dash-sub">Services you offer to patients</p>
          </div>
        </div>
        <div className="dash-card">
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🩺</div>
            <p style={{ marginBottom: '1rem' }}>Complete your nurse profile before adding services.</p>
            <Link href="/provider/onboarding" style={{
              display: 'inline-block', background: 'var(--teal)', color: '#fff',
              padding: '9px 22px', borderRadius: 9, textDecoration: 'none',
              fontSize: '0.85rem', fontWeight: 700,
            }}>
              Complete Onboarding →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <NurseServicesClient
      nurseStatus={nurse.status}
      nurseId={nurse.id}
      initialNurseServices={(nurseServices ?? []) as any}
      masterServices={(masterServices ?? []) as any}
      flagEnabled={flagEnabled}
    />
  )
}
