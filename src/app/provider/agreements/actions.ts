'use server'

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { renderAgreementHtml } from '@/lib/agreement-renderer'
import { revalidatePath } from 'next/cache'

export async function approveAgreementAsNurse(formData: FormData) {
  const user = await requireRole('provider')
  const supabase = await createSupabaseServerClient()

  const agreement_id = formData.get('agreement_id') as string
  if (!agreement_id) return { error: 'Missing agreement ID' }

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id, full_name, email, phone, city, specialization')
    .eq('user_id', user.id)
    .single()
  if (!nurse) return { error: 'Nurse profile not found' }

  const { data: agreement } = await supabase
    .from('agreements')
    .select('*')
    .eq('id', agreement_id)
    .eq('nurse_id', nurse.id)
    .single()
  if (!agreement) return { error: 'Agreement not found' }
  if (agreement.nurse_approved_at) return { error: 'Already approved by you' }

  const now = new Date().toISOString()
  // Admin approved = admin_approved_at is set; nurse approving makes it fully_approved
  const newStatus = agreement.admin_approved_at ? 'fully_approved' : 'nurse_approved'

  const agreementDate = new Date(agreement.generated_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // Fetch admin info for re-render
  const serviceClient = createSupabaseServiceRoleClient()
  const { data: adminProfile } = await serviceClient
    .from('users').select('full_name, email').eq('id', agreement.generated_by).single()

  // Fetch hospital info if this agreement has a hospital
  let hospitalUser: { full_name: string | null; email: string | null } | null = null
  if (agreement.hospital_id) {
    const { data } = await serviceClient.from('users').select('full_name, email').eq('id', agreement.hospital_id).single()
    hospitalUser = data
  }

  // Use stored template_content snapshot; fall back to fetching from template
  let templateContent = agreement.template_content as string | null
  if (!templateContent) {
    const { data: tpl } = await supabase
      .from('agreement_templates').select('content').eq('id', agreement.template_id).single()
    templateContent = tpl?.content ?? ''
  }

  const rendered_html = renderAgreementHtml({
    templateContent:     templateContent ?? '',
    title:               agreement.title,
    logoUrl:             agreement.logo_url,
    nurseName:           nurse.full_name ?? null,
    nurseEmail:          nurse.email ?? null,
    nursePhone:          nurse.phone ?? null,
    nurseCity:           nurse.city ?? null,
    nurseSpecialization: nurse.specialization ?? null,
    adminName:           adminProfile?.full_name ?? adminProfile?.email ?? 'NurseCare+ Admin',
    adminEmail:          adminProfile?.email ?? null,
    hospitalName:        hospitalUser?.full_name ?? hospitalUser?.email ?? null,
    hospitalEmail:       hospitalUser?.email ?? null,
    agreementDate,
    agreementId:         agreement.id,
    nurseApprovedAt:     now,
    adminApprovedAt:     agreement.admin_approved_at,
    hospitalApprovedAt:  agreement.hospital_approved_at,
    status:              newStatus,
  })

  const { error } = await serviceClient
    .from('agreements')
    .update({
      nurse_approved_at: now,
      nurse_approved_by: user.id,
      status:            newStatus,
      rendered_html,
    })
    .eq('id', agreement_id)

  if (error) return { error: error.message }

  revalidatePath(`/provider/agreements/${agreement_id}`)
  revalidatePath('/provider/agreements')
  return { success: true }
}
