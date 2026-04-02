'use server'

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { renderAgreementHtml } from '@/lib/agreement-renderer'
import { revalidatePath } from 'next/cache'

export async function approveAgreementAsHospital(formData: FormData) {
  const user = await requireRole('hospital')
  const supabase = await createSupabaseServerClient()

  const agreement_id = formData.get('agreement_id') as string
  if (!agreement_id) return { error: 'Missing agreement ID' }

  const { data: agreement } = await supabase
    .from('agreements')
    .select('*')
    .eq('id', agreement_id)
    .eq('hospital_id', user.id)
    .single()
  if (!agreement) return { error: 'Agreement not found' }
  if (agreement.hospital_approved_at) return { error: 'Already approved by you' }

  const { data: nurse } = await supabase
    .from('nurses')
    .select('id, full_name, email, phone, city, specialization')
    .eq('id', agreement.nurse_id)
    .single()

  const now = new Date().toISOString()
  const newStatus = agreement.nurse_approved_at ? 'fully_approved' : 'hospital_approved'

  const agreementDate = new Date(agreement.generated_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

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
    nurseName:           nurse?.full_name ?? 'Nurse',
    nurseEmail:          nurse?.email ?? '',
    nursePhone:          nurse?.phone,
    nurseCity:           nurse?.city,
    nurseSpecialization: nurse?.specialization,
    hospitalName:        user.full_name ?? user.email ?? 'Hospital',
    hospitalEmail:       user.email ?? '',
    agreementDate,
    agreementId:         agreement.id,
    nurseApprovedAt:     agreement.nurse_approved_at,
    hospitalApprovedAt:  now,
    hospitalApprovedBy:  user.id,
    status:              newStatus,
  })

  const serviceClient = createSupabaseServiceRoleClient()
  const { error } = await serviceClient
    .from('agreements')
    .update({
      hospital_approved_at: now,
      hospital_approved_by: user.id,
      status:               newStatus,
      rendered_html,
    })
    .eq('id', agreement_id)

  if (error) return { error: error.message }

  revalidatePath(`/hospital/agreements/${agreement_id}`)
  revalidatePath('/hospital/agreements')
  return { success: true }
}
