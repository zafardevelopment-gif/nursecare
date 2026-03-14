import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import SettingsForm from './SettingsForm'
import CommissionForm from './CommissionForm'
import PromoManager from './PromoManager'

export default async function AdminSettingsPage() {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const [
    { data: settings },
    { data: professions },
    { data: promos },
  ] = await Promise.all([
    supabase.from('platform_settings').select('*').limit(1).single(),
    supabase.from('profession_commissions').select('*').order('profession'),
    supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Platform Settings</h1>
          <p className="dash-sub">Configure platform behaviour, commissions, and promo codes</p>
        </div>
        {settings?.updated_at && (
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            Last saved: {new Date(settings.updated_at).toLocaleString()}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SettingsForm settings={settings} />
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <CommissionForm professions={professions ?? []} />
          <PromoManager promos={promos ?? []} />
        </div>
      </div>
    </div>
  )
}
