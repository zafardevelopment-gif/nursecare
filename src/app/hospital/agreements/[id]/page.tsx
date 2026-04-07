import { requireRole } from '@/lib/auth'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import HospitalAgreementReviewClient from './HospitalAgreementReviewClient'

export const dynamic = 'force-dynamic'

export default async function HospitalAgreementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ accepted?: string }>
}) {
  const user    = await requireRole('hospital')
  const { id }  = await params
  const sp      = await searchParams
  const supabase = createSupabaseServiceRoleClient()

  // Get the hospital record for this user
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, hospital_name, contact_person, designation, email, scope_of_services, address, city, license_cr')
    .eq('user_id', user.id)
    .single()

  if (!hospital) notFound()

  const { data: agreement } = await supabase
    .from('hospital_agreements')
    .select('*')
    .eq('id', id)
    .eq('hospital_id', hospital.id)
    .single()

  if (!agreement) notFound()

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <div>
          <div style={{ marginBottom: '0.4rem' }}>
            <Link href="/hospital/agreements" style={{ fontSize: '0.8rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
              ← Agreements
            </Link>
          </div>
          <h1 className="dash-title">Service Agreement</h1>
          <p className="dash-sub">{agreement.ref_number} · {hospital.hospital_name}</p>
        </div>
        {sp.accepted === '1' && (
          <div style={{ background: 'rgba(26,122,74,0.08)', border: '1px solid rgba(26,122,74,0.25)', color: '#1A7A4A', padding: '10px 18px', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700 }}>
            🎉 Agreement accepted! Your account is now active.
          </div>
        )}
      </div>

      <HospitalAgreementReviewClient
        agreement={{
          id:                        agreement.id,
          ref_number:                agreement.ref_number,
          status:                    agreement.status,
          payment_type:              agreement.payment_type,
          start_date:                new Date(agreement.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
          end_date:                  new Date(agreement.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
          reminder_hours:            agreement.reminder_hours ?? null,
          monthly_billing_day:       agreement.monthly_billing_day ?? null,
          monthly_advance_days:      agreement.monthly_advance_days ?? null,
          monthly_grace_hrs:         agreement.monthly_grace_hrs ?? null,
          monthly_missed_action:     agreement.monthly_missed_action ?? null,
          weekly_payment_day:        agreement.weekly_payment_day ?? null,
          weekly_deadline_hrs:       agreement.weekly_deadline_hrs ?? null,
          weekly_grace_hrs:          agreement.weekly_grace_hrs ?? null,
          weekly_missed_action:      agreement.weekly_missed_action ?? null,
          daily_deadline_hrs:        agreement.daily_deadline_hrs ?? null,
          daily_grace_hrs:           agreement.daily_grace_hrs ?? null,
          daily_cancel_misses:       agreement.daily_cancel_misses ?? null,
          daily_missed_action:       agreement.daily_missed_action ?? null,
          adv_deadline_hrs:          agreement.adv_deadline_hrs ?? null,
          hospital_rejection_reason: agreement.hospital_rejection_reason ?? null,
        }}
        hospital={{
          hospital_name:      hospital.hospital_name,
          contact_person:     hospital.contact_person,
          designation:        hospital.designation ?? null,
          email:              hospital.email,
          scope_of_services:  hospital.scope_of_services ?? null,
          address:            hospital.address ?? null,
          city:               hospital.city ?? null,
          license_cr:         hospital.license_cr ?? null,
        }}
      />
    </div>
  )
}
