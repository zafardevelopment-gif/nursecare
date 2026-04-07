'use server'

import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function createHospitalAgreementAction(formData: FormData) {
  const admin   = await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const hospital_id  = formData.get('hospital_id') as string
  const ref_number   = formData.get('ref_number') as string
  const start_date   = formData.get('start_date') as string
  const end_date     = formData.get('end_date') as string
  const payment_type = formData.get('payment_type') as string
  const missed_action = formData.get('missed_action') as string
  const notes        = (formData.get('notes') as string) || null
  const action       = (formData.get('action') as string) || 'draft'

  const reminder_hours_raw = formData.get('reminder_hours') as string
  let reminder_hours: number[] = [48, 24, 6]
  try { reminder_hours = JSON.parse(reminder_hours_raw) } catch {}

  if (!start_date || !end_date) return { error: 'Start and end dates are required.' }
  if (new Date(end_date) <= new Date(start_date)) return { error: 'End date must be after start date.' }

  // Build payment fields based on type
  const paymentFields: Record<string, any> = {}
  if (payment_type === 'advance') {
    paymentFields.adv_deadline_hrs = parseInt(formData.get('adv_deadline_hrs') as string) || 6
  } else if (payment_type === 'daily') {
    paymentFields.daily_deadline_hrs   = parseInt(formData.get('daily_deadline_hrs') as string) || 24
    paymentFields.daily_grace_hrs      = parseInt(formData.get('daily_grace_hrs') as string) || 2
    paymentFields.daily_cancel_misses  = parseInt(formData.get('daily_cancel_misses') as string) || 2
    paymentFields.daily_missed_action  = missed_action
  } else if (payment_type === 'weekly') {
    paymentFields.weekly_payment_day   = formData.get('weekly_payment_day') as string || 'monday'
    paymentFields.weekly_deadline_hrs  = parseInt(formData.get('weekly_deadline_hrs') as string) || 72
    paymentFields.weekly_grace_hrs     = parseInt(formData.get('weekly_grace_hrs') as string) || 6
    paymentFields.weekly_missed_action = missed_action
  } else if (payment_type === 'monthly') {
    paymentFields.monthly_billing_day   = parseInt(formData.get('monthly_billing_day') as string) || 25
    paymentFields.monthly_advance_days  = parseInt(formData.get('monthly_advance_days') as string) || 15
    paymentFields.monthly_grace_hrs     = parseInt(formData.get('monthly_grace_hrs') as string) || 24
    paymentFields.monthly_missed_action = missed_action
  }

  const status = action === 'approve' ? 'admin_approved' : 'draft'

  const { data: agreement, error } = await supabase
    .from('hospital_agreements')
    .insert({
      hospital_id,
      ref_number,
      start_date,
      end_date,
      payment_type,
      reminder_hours,
      notes,
      status,
      created_by:        admin.id,
      admin_approved_by: action === 'approve' ? admin.id : null,
      admin_approved_at: action === 'approve' ? new Date().toISOString() : null,
      ...paymentFields,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Audit log
  await supabase.from('hospital_audit_log').insert({
    hospital_id,
    agreement_id: agreement.id,
    actor_id:     admin.id,
    actor_role:   'admin',
    action:       action === 'approve' ? 'agreement_admin_approved' : 'agreement_created',
    details:      { ref_number, payment_type, status },
  })

  redirect(`/admin/hospitals/${hospital_id}/agreement/${agreement.id}`)
}

export async function sendAgreementToHospitalAction(formData: FormData) {
  const admin   = await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const agreementId = formData.get('agreement_id') as string
  const hospitalId  = formData.get('hospital_id') as string

  const { error } = await supabase
    .from('hospital_agreements')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', agreementId)

  if (error) return { error: error.message }

  await supabase.from('hospital_audit_log').insert({
    hospital_id:  hospitalId,
    agreement_id: agreementId,
    actor_id:     admin.id,
    actor_role:   'admin',
    action:       'agreement_sent_to_hospital',
  })

  redirect(`/admin/hospitals/${hospitalId}/agreement/${agreementId}?sent=1`)
}

export async function approveAgreementAction(formData: FormData) {
  const admin   = await requireRole('admin')
  const supabase = createSupabaseServiceRoleClient()

  const agreementId = formData.get('agreement_id') as string
  const hospitalId  = formData.get('hospital_id') as string

  await supabase
    .from('hospital_agreements')
    .update({ status: 'admin_approved', admin_approved_by: admin.id, admin_approved_at: new Date().toISOString() })
    .eq('id', agreementId)

  await supabase.from('hospital_audit_log').insert({
    hospital_id: hospitalId, agreement_id: agreementId,
    actor_id: admin.id, actor_role: 'admin', action: 'agreement_admin_approved',
  })

  redirect(`/admin/hospitals/${hospitalId}/agreement/${agreementId}`)
}
