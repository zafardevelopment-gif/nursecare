import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import DepartmentsClient from './DepartmentsClient'

export const dynamic = 'force-dynamic'

export default async function HospitalDepartmentsPage() {
  const user     = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, hospital_name, status')
    .eq('user_id', user.id)
    .single()

  const { data: departments } = hospital
    ? await supabase
        .from('hospital_departments')
        .select('*')
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: true })
    : { data: [] }

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Departments</h1>
          <p className="dash-sub">Manage hospital departments and nurse allocation</p>
        </div>
      </div>

      <DepartmentsClient
        departments={departments ?? []}
        hospitalId={hospital?.id ?? null}
      />
    </div>
  )
}
