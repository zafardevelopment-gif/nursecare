import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const payLabel: Record<string, string> = {
  advance: 'Advance', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
}

function row(label: string, value: string) {
  return `
  <tr>
    <td class="row-key">${label}</td>
    <td class="row-val">${value}</td>
  </tr>`
}

function section(title: string, rows: string) {
  return `
  <div class="section-label">${title}</div>
  <table class="info-table"><tbody>${rows}</tbody></table>`
}

function buildHospitalAgreementHtml(agreement: Record<string, any>, hospital: Record<string, any>): string {
  const isActive   = agreement.status === 'active' || agreement.status === 'hospital_accepted'
  const isRejected = agreement.status === 'hospital_rejected'

  const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
    hospital_accepted: { label: '✓  ACCEPTED — Hospital Has Signed This Agreement', bg: '#E8F9F0', color: '#1A7A4A', border: '#27A869' },
    active:            { label: '✓  ACTIVE — Agreement Is In Effect',                bg: '#E8F9F0', color: '#1A7A4A', border: '#27A869' },
    hospital_rejected: { label: '✕  REJECTED — Hospital Has Rejected This Agreement', bg: '#FEE8E8', color: '#C0392B', border: '#E04A4A' },
    sent:              { label: '⏳  SENT — Awaiting Hospital Signature',              bg: '#FFF8F0', color: '#9A4B00', border: '#E8831A' },
    admin_approved:    { label: '⏳  APPROVED — Pending Distribution to Hospital',    bg: '#EEF6FD', color: '#0E5C8C', border: '#2E86C1' },
    draft:             { label: '📝  DRAFT',                                           bg: '#F1F5F9', color: '#64748B', border: '#94A3B8' },
  }
  const sc = statusConfig[agreement.status] ?? statusConfig.draft

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  // Hospital details rows
  const hospitalRows = [
    row('Hospital Name',    hospital.hospital_name),
    hospital.license_cr ? row('License / CR', hospital.license_cr) : '',
    (hospital.address || hospital.city) ? row('Address', [hospital.address, hospital.city].filter(Boolean).join(', ')) : '',
    row('Representative',   [hospital.contact_person, hospital.designation].filter(Boolean).join(' — ')),
    row('Email',            hospital.email),
  ].join('')

  // Agreement terms rows
  const termsRows = [
    row('Effective From', fmtDate(agreement.start_date)),
    row('Valid Until',    fmtDate(agreement.end_date)),
    hospital.scope_of_services ? row('Scope of Services', hospital.scope_of_services) : '',
  ].join('')

  // Payment rows based on type
  let paymentRows = row('Payment Type', payLabel[agreement.payment_type] ?? agreement.payment_type)
  if (agreement.payment_type === 'monthly') {
    if (agreement.monthly_billing_day != null)  paymentRows += row('Billing Date',    `${agreement.monthly_billing_day}th of each month`)
    if (agreement.monthly_advance_days != null) paymentRows += row('Advance Deposit', `${agreement.monthly_advance_days} days before service`)
    if (agreement.monthly_grace_hrs != null)    paymentRows += row('Grace Period',    `${agreement.monthly_grace_hrs} hours`)
    if (agreement.monthly_missed_action)        paymentRows += row('Missed Payment',  agreement.monthly_missed_action === 'pause' ? 'Nurse paused until payment' : 'Booking cancelled')
  } else if (agreement.payment_type === 'weekly') {
    if (agreement.weekly_payment_day)           paymentRows += row('Payment Day',     agreement.weekly_payment_day)
    if (agreement.weekly_deadline_hrs != null)  paymentRows += row('Deadline',        `${agreement.weekly_deadline_hrs} hrs before`)
    if (agreement.weekly_grace_hrs != null)     paymentRows += row('Grace Period',    `${agreement.weekly_grace_hrs} hours`)
    if (agreement.weekly_missed_action)         paymentRows += row('Missed Payment',  agreement.weekly_missed_action === 'pause' ? 'Nurse paused' : 'Cancel booking')
  } else if (agreement.payment_type === 'daily') {
    if (agreement.daily_deadline_hrs != null)   paymentRows += row('Deadline',        `${agreement.daily_deadline_hrs} hrs before`)
    if (agreement.daily_grace_hrs != null)      paymentRows += row('Grace Period',    `${agreement.daily_grace_hrs} hours`)
    if (agreement.daily_cancel_misses != null)  paymentRows += row('Cancel After',    `${agreement.daily_cancel_misses} misses`)
    if (agreement.daily_missed_action)          paymentRows += row('Missed Payment',  agreement.daily_missed_action === 'pause' ? 'Nurse paused' : 'Cancel booking')
  } else if (agreement.payment_type === 'advance') {
    if (agreement.adv_deadline_hrs)             paymentRows += row('Deadline',        `${agreement.adv_deadline_hrs} hours before job`)
  }
  if ((agreement.reminder_hours ?? []).length > 0) {
    paymentRows += row('Reminders', (agreement.reminder_hours as number[]).map((h: number) => `${h} hrs`).join(' · ') + ' before deadline')
  }

  // Signature boxes
  function sigBox(party: string, name: string, desig: string, signedAt?: string | null) {
    if (signedAt) {
      return `
      <div class="sig-box approved">
        <div class="sig-role">${party}</div>
        <div class="sig-name">${name}</div>
        <div class="sig-desig">${desig}</div>
        <div class="sig-stamp-approved">✓ Digitally Signed &amp; Accepted</div>
        <div class="sig-date">Signed on: ${new Date(signedAt).toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      </div>`
    }
    return `
    <div class="sig-box pending">
      <div class="sig-role">${party}</div>
      <div class="sig-name">${name}</div>
      <div class="sig-desig">${desig}</div>
      <div class="sig-line"></div>
      <div class="sig-line-label">Signature &amp; Date</div>
      <div class="sig-stamp-pending">⏳ Pending Signature</div>
    </div>`
  }

  const hospitalDesig = `${hospital.designation ? hospital.designation + ' — ' : ''}${hospital.hospital_name}`
  const adminSig   = sigBox('Party A — NurseCare+', 'Admin', 'NurseCare+ Healthcare Solutions')
  const hospitalSig = sigBox(
    'Party B — Hospital',
    hospital.contact_person,
    hospitalDesig,
    agreement.hospital_accepted_at ?? null
  )

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Hospital Service Agreement — ${agreement.ref_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 13px;
    color: #1C1C2E;
    background: #fff;
    line-height: 1.7;
  }
  .page { max-width: 820px; margin: 0 auto; padding: 48px 60px 60px; background: #fff; }

  /* Header */
  .header {
    background: #0F172A;
    padding: 22px 28px;
    border-radius: 8px 8px 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;
  }
  .header-brand { display: flex; align-items: center; gap: 8px; }
  .brand-dot { width: 9px; height: 9px; background: #14B8A6; border-radius: 50%; display: inline-block; }
  .brand-name { font-family: Georgia, serif; font-weight: 700; font-size: 17px; color: #fff; }
  .header-ref { background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 5px; font-size: 11px; color: rgba(255,255,255,0.7); font-family: sans-serif; font-weight: 700; letter-spacing: 0.05em; }
  .header-title-bar { background: #0D9488; height: 3px; }
  .header-sub { background: #0F172A; padding: 10px 28px 18px; border-radius: 0; }
  .header-sub .doc-title { font-weight: 700; font-size: 15px; color: #fff; margin-bottom: 2px; }
  .header-sub .doc-sub { font-size: 11.5px; color: rgba(255,255,255,0.45); font-family: sans-serif; }

  /* Status Banner */
  .status-banner {
    padding: 10px 18px;
    font-size: 11px; font-family: sans-serif; font-weight: 700;
    letter-spacing: 0.5px;
    border-left: 4px solid;
    border-radius: 4px;
    margin: 20px 0;
    text-align: center;
  }

  /* Section label */
  .section-label {
    font-size: 9px; font-family: sans-serif;
    letter-spacing: 2.5px; text-transform: uppercase;
    color: #0F5F59; font-weight: 700;
    padding: 0 0 6px 8px;
    border-left: 3px solid #0D9488;
    margin: 24px 0 10px;
  }

  /* Info table */
  .info-table { width: 100%; border-collapse: collapse; }
  .row-key { width: 180px; font-size: 11.5px; color: #64748B; font-weight: 500; padding: 6px 0; vertical-align: top; font-family: sans-serif; }
  .row-val { font-size: 12px; color: #0F172A; font-weight: 700; padding: 6px 0; border-bottom: 1px solid #F8FAFC; }

  /* Signature grid */
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 6px; }
  .sig-box { border-radius: 8px; padding: 16px 18px; }
  .sig-box.approved { border: 1.5px solid #27A869; background: #f0faf5; }
  .sig-box.pending  { border: 1px solid #CBD5E1; background: #FAFCFD; }
  .sig-role  { font-size: 9px; font-family: sans-serif; letter-spacing: 1.5px; text-transform: uppercase; color: #888; font-weight: 700; margin-bottom: 6px; }
  .sig-name  { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
  .sig-desig { font-size: 11px; color: #777; font-family: sans-serif; margin-bottom: 10px; }
  .sig-line  { border-bottom: 1px solid #CBD5E1; margin: 12px 0 4px; }
  .sig-line-label { font-size: 9.5px; color: #aaa; font-family: sans-serif; }
  .sig-stamp-approved { font-size: 11px; font-family: sans-serif; font-weight: 700; color: #1A7A4A; margin-top: 8px; }
  .sig-stamp-pending  { font-size: 10.5px; font-family: sans-serif; font-weight: 600; color: #E8831A; margin-top: 6px; }
  .sig-date  { font-size: 10px; color: #777; font-family: sans-serif; margin-top: 3px; }

  /* Footer */
  .footer {
    background: #1E293B;
    padding: 10px 28px;
    border-radius: 0 0 8px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 32px;
  }
  .footer-left  { font-size: 10px; color: rgba(255,255,255,0.35); font-family: sans-serif; }
  .footer-right { font-size: 10px; color: rgba(255,255,255,0.55); font-family: sans-serif; font-weight: 700; }

  @media print {
    body { background: white; }
    .page { padding: 0; max-width: 100%; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Dark Header -->
  <div class="header">
    <div class="header-brand">
      <span class="brand-dot"></span>
      <span class="brand-name">NurseCare+</span>
    </div>
    <span class="header-ref">${agreement.ref_number}</span>
  </div>
  <div class="header-title-bar"></div>
  <div class="header-sub">
    <div class="doc-title">Hospital Service Agreement</div>
    <div class="doc-sub">Service agreement between NurseCare+ and ${hospital.hospital_name}</div>
  </div>

  <!-- Status Banner -->
  <div class="status-banner" style="background:${sc.bg};color:${sc.color};border-color:${sc.border};">
    ${sc.label}
  </div>

  ${section('Hospital Details', hospitalRows)}
  ${section('Agreement Terms', termsRows)}
  ${section('Payment Structure', paymentRows)}

  <!-- Signatures -->
  <div class="section-label">Signatures</div>
  <div class="sig-grid">
    ${adminSig}
    ${hospitalSig}
  </div>

  <!-- Footer -->
  <div class="footer">
    <span class="footer-left">NurseCare+ Healthcare Solutions · Riyadh, Saudi Arabia</span>
    <span class="footer-right">${agreement.ref_number}</span>
  </div>

</div>
<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 400); };
</script>
</body>
</html>`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'hospital'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createSupabaseServiceRoleClient()

  const { data: agreement } = await supabase
    .from('hospital_agreements')
    .select('*')
    .eq('id', id)
    .single()

  if (!agreement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('hospital_name, contact_person, designation, email, scope_of_services, address, city, license_cr')
    .eq('id', agreement.hospital_id)
    .single()

  if (!hospital) return NextResponse.json({ error: 'Hospital not found' }, { status: 404 })

  const html = buildHospitalAgreementHtml(agreement, hospital)

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="agreement-${agreement.ref_number}.html"`,
    },
  })
}
