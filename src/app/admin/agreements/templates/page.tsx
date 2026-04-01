import { requireRole } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import TemplatesClient from './TemplatesClient'
import Link from 'next/link'

export default async function AgreementTemplatesPage() {
  await requireRole('admin')
  const supabase = await createSupabaseServerClient()

  const [{ data: templates }, { data: logos }] = await Promise.all([
    supabase.from('agreement_templates').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('agreement_logos').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link href="/admin/agreements" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none' }}>
              ← Agreements
            </Link>
          </div>
          <h1 className="dash-title">Agreement Templates</h1>
          <p className="dash-sub">Create and manage reusable agreement templates with dynamic placeholders</p>
        </div>
      </div>

      <TemplatesClient templates={templates ?? []} logos={logos ?? []} />
    </div>
  )
}
