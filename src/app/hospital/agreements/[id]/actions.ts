'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function acceptAgreementAction(formData: FormData) {
  const user = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  const agreementId = formData.get('agreement_id') as string

  // Get the agreement to verify ownership and get hospital_id
  const { data: agreement } = await supabase
    .from('hospital_agreements')
    .select('id, hospital_id, ref_number')
    .eq('id', agreementId)
    .single()

  if (!agreement) redirect('/hospital/agreements')

  // Update agreement status
  await supabase
    .from('hospital_agreements')
    .update({
      status: 'hospital_accepted',
      hospital_accepted_at: new Date().toISOString(),
    })
    .eq('id', agreementId)

  // Activate the hospital
  await supabase
    .from('hospitals')
    .update({ status: 'active' })
    .eq('id', agreement.hospital_id)

  // Write audit log
  await supabase.from('hospital_audit_log').insert({
    hospital_id:  agreement.hospital_id,
    agreement_id: agreementId,
    actor_id:     user.id,
    actor_role:   'hospital',
    action:       'agreement_hospital_accepted',
    details:      { ref_number: agreement.ref_number },
  })

  redirect(`/hospital/agreements/${agreementId}?accepted=1`)
}

export async function rejectAgreementAction(formData: FormData) {
  const user = await requireRole('hospital')
  const supabase = createSupabaseServiceRoleClient()

  const agreementId = formData.get('agreement_id') as string
  const reason      = formData.get('reason') as string

  const { data: agreement } = await supabase
    .from('hospital_agreements')
    .select('id, hospital_id, ref_number')
    .eq('id', agreementId)
    .single()

  if (!agreement) redirect('/hospital/agreements')

  await supabase
    .from('hospital_agreements')
    .update({
      status:                    'hospital_rejected',
      hospital_rejected_at:      new Date().toISOString(),
      hospital_rejection_reason: reason,
    })
    .eq('id', agreementId)

  await supabase.from('hospital_audit_log').insert({
    hospital_id:  agreement.hospital_id,
    agreement_id: agreementId,
    actor_id:     user.id,
    actor_role:   'hospital',
    action:       'agreement_hospital_rejected',
    details:      { ref_number: agreement.ref_number, reason },
  })

  redirect(`/hospital/agreements/${agreementId}`)
}
