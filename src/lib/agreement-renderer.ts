// Renders an agreement template into a full HTML document
// Used for both preview and PDF generation

export interface AgreementData {
  templateContent: string
  title: string
  logoUrl?: string | null
  nurseName: string
  nurseEmail: string
  nursePhone?: string | null
  nurseCity?: string | null
  nurseSpecialization?: string | null
  hospitalName: string
  hospitalEmail: string
  agreementDate: string
  agreementId: string
  nurseApprovedAt?: string | null
  nurseApprovedBy?: string | null
  hospitalApprovedAt?: string | null
  hospitalApprovedBy?: string | null
  status: string
}

function replacePlaceholders(content: string, data: AgreementData): string {
  return content
    .replace(/\{\{nurse_name\}\}/gi, data.nurseName)
    .replace(/\{\{nurse_email\}\}/gi, data.nurseEmail)
    .replace(/\{\{nurse_phone\}\}/gi, data.nursePhone ?? '—')
    .replace(/\{\{nurse_city\}\}/gi, data.nurseCity ?? '—')
    .replace(/\{\{nurse_specialization\}\}/gi, data.nurseSpecialization ?? '—')
    .replace(/\{\{hospital_name\}\}/gi, data.hospitalName)
    .replace(/\{\{hospital_email\}\}/gi, data.hospitalEmail)
    .replace(/\{\{agreement_date\}\}/gi, data.agreementDate)
    .replace(/\{\{agreement_id\}\}/gi, data.agreementId)
}

export function renderAgreementHtml(data: AgreementData): string {
  const body = replacePlaceholders(data.templateContent, data)
  const bodyHtml = body
    .split('\n')
    .map(line => line.trim() === '' ? '<br/>' : `<p>${line}</p>`)
    .join('\n')

  const isFullyApproved = data.status === 'fully_approved'
  const nurseApprovalBlock = data.nurseApprovedAt
    ? `<div class="sig-row">
        <div class="sig-box approved">
          <div class="sig-label">Nurse</div>
          <div class="sig-name">${data.nurseName}</div>
          <div class="sig-stamp">✓ Digitally Approved</div>
          <div class="sig-date">Date: ${new Date(data.nurseApprovedAt).toLocaleString()}</div>
        </div>
      </div>`
    : `<div class="sig-row">
        <div class="sig-box pending">
          <div class="sig-label">Nurse</div>
          <div class="sig-name">${data.nurseName}</div>
          <div class="sig-stamp">⏳ Awaiting Approval</div>
        </div>
      </div>`

  const hospitalApprovalBlock = data.hospitalApprovedAt
    ? `<div class="sig-row">
        <div class="sig-box approved">
          <div class="sig-label">Hospital / Employer</div>
          <div class="sig-name">${data.hospitalName}</div>
          <div class="sig-stamp">✓ Digitally Approved</div>
          <div class="sig-date">Date: ${new Date(data.hospitalApprovedAt).toLocaleString()}</div>
        </div>
      </div>`
    : `<div class="sig-row">
        <div class="sig-box pending">
          <div class="sig-label">Hospital / Employer</div>
          <div class="sig-name">${data.hospitalName}</div>
          <div class="sig-stamp">⏳ Awaiting Approval</div>
        </div>
      </div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${data.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 13px;
    color: #1a1a2e;
    background: #fff;
    line-height: 1.7;
  }
  .page {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px 56px;
    background: #fff;
  }
  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid #0E7B8C;
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  .logo { max-height: 60px; max-width: 180px; object-fit: contain; }
  .header-right { text-align: right; }
  .header-right .doc-label {
    font-size: 10px; font-family: sans-serif;
    letter-spacing: 2px; text-transform: uppercase;
    color: #0E7B8C; font-weight: 700;
  }
  .header-right .doc-id {
    font-size: 11px; color: #888; font-family: sans-serif; margin-top: 3px;
  }
  /* Title */
  .title-block { text-align: center; margin-bottom: 30px; }
  .title-block h1 {
    font-size: 22px; font-weight: 700;
    letter-spacing: 1px; color: #0B1E2D;
    text-transform: uppercase; margin-bottom: 4px;
  }
  .title-block .subtitle {
    font-size: 11px; color: #888; font-family: sans-serif;
    letter-spacing: 0.5px;
  }
  /* Parties section */
  .parties {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 16px; margin-bottom: 28px;
  }
  .party-box {
    border: 1px solid #d0dde4;
    border-radius: 8px; padding: 14px 16px;
    background: #f9fbfc;
  }
  .party-box .party-title {
    font-size: 9px; font-family: sans-serif;
    letter-spacing: 1.5px; text-transform: uppercase;
    color: #0E7B8C; font-weight: 700; margin-bottom: 8px;
  }
  .party-box .party-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
  .party-box .party-detail {
    font-size: 11px; color: #555; font-family: sans-serif;
    margin-top: 2px;
  }
  /* Divider */
  .section-title {
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: #0E7B8C; font-weight: 700; font-family: sans-serif;
    border-bottom: 1px solid #d0dde4; padding-bottom: 6px;
    margin: 24px 0 14px;
  }
  /* Body */
  .body-content p { margin-bottom: 10px; text-align: justify; }
  .body-content br { display: block; margin: 4px 0; }
  /* Signature section */
  .signature-section { margin-top: 36px; }
  .sig-row { margin-bottom: 16px; }
  .sig-box {
    border: 1.5px solid #d0dde4; border-radius: 8px;
    padding: 16px 20px; display: inline-block; min-width: 280px;
  }
  .sig-box.approved { border-color: #27A869; background: #f0faf5; }
  .sig-box.pending  { border-color: #d0dde4; background: #fafbfc; }
  .sig-label {
    font-size: 9px; font-family: sans-serif; letter-spacing: 1.5px;
    text-transform: uppercase; color: #888; margin-bottom: 4px;
  }
  .sig-name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
  .sig-stamp {
    font-size: 11px; font-family: sans-serif; font-weight: 600;
    color: #27A869;
  }
  .sig-box.pending .sig-stamp { color: #F5842A; }
  .sig-date { font-size: 10px; color: #888; font-family: sans-serif; margin-top: 3px; }
  /* Footer */
  .footer {
    margin-top: 40px; padding-top: 16px;
    border-top: 1px solid #d0dde4;
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-brand {
    font-size: 12px; font-weight: 700; font-family: sans-serif; color: #0E7B8C;
  }
  .footer-meta { font-size: 10px; color: #aaa; font-family: sans-serif; }
  /* Status banner */
  .status-banner {
    text-align: center; padding: 8px 16px; border-radius: 6px;
    font-size: 11px; font-family: sans-serif; font-weight: 700;
    margin-bottom: 24px; letter-spacing: 0.5px;
  }
  .status-banner.fully_approved { background: #E8F9F0; color: #1A7A4A; border: 1px solid #27A86944; }
  .status-banner.pending        { background: #FFF8F0; color: #b85e00; border: 1px solid #F5842A44; }
  .status-banner.nurse_approved { background: #E8F4FD; color: #0E7B8C;  border: 1px solid #0E7B8C44; }
  .status-banner.hospital_approved { background: #E8F4FD; color: #0E7B8C; border: 1px solid #0E7B8C44; }

  @media print {
    body { background: white; }
    .page { padding: 24px 32px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    ${data.logoUrl
      ? `<img src="${data.logoUrl}" alt="Logo" class="logo"/>`
      : `<div style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#0E7B8C;">NurseCare+</div>`
    }
    <div class="header-right">
      <div class="doc-label">Service Agreement</div>
      <div class="doc-id">ID: ${data.agreementId.substring(0, 8).toUpperCase()}</div>
      <div class="doc-id">Date: ${data.agreementDate}</div>
    </div>
  </div>

  <!-- Status Banner -->
  <div class="status-banner ${data.status}">
    ${data.status === 'fully_approved'
      ? '✓ FULLY EXECUTED — Both Parties Have Approved'
      : data.status === 'nurse_approved'
      ? '⏳ Awaiting Hospital Approval'
      : data.status === 'hospital_approved'
      ? '⏳ Awaiting Nurse Approval'
      : '⏳ PENDING — Awaiting Approval from Both Parties'
    }
  </div>

  <!-- Title -->
  <div class="title-block">
    <h1>${data.title}</h1>
    <div class="subtitle">This agreement is entered into between the parties listed below</div>
  </div>

  <!-- Parties -->
  <div class="section-title">Parties to the Agreement</div>
  <div class="parties">
    <div class="party-box">
      <div class="party-title">Healthcare Provider (Nurse)</div>
      <div class="party-name">${data.nurseName}</div>
      <div class="party-detail">${data.nurseEmail}</div>
      ${data.nursePhone ? `<div class="party-detail">${data.nursePhone}</div>` : ''}
      ${data.nurseCity ? `<div class="party-detail">${data.nurseCity}</div>` : ''}
      ${data.nurseSpecialization ? `<div class="party-detail">Specialization: ${data.nurseSpecialization}</div>` : ''}
    </div>
    <div class="party-box">
      <div class="party-title">Employer / Hospital</div>
      <div class="party-name">${data.hospitalName}</div>
      <div class="party-detail">${data.hospitalEmail}</div>
    </div>
  </div>

  <!-- Agreement Body -->
  <div class="section-title">Terms and Conditions</div>
  <div class="body-content">
    ${bodyHtml}
  </div>

  <!-- Digital Signatures -->
  <div class="section-title">Digital Approval &amp; Signatures</div>
  <div class="signature-section">
    ${nurseApprovalBlock}
    ${hospitalApprovalBlock}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">NurseCare+ Platform</div>
    <div class="footer-meta">
      Generated: ${new Date().toLocaleDateString()} ·
      Agreement ID: ${data.agreementId.substring(0, 8).toUpperCase()} ·
      ${isFullyApproved ? 'EXECUTED' : 'DRAFT'}
    </div>
  </div>

</div>
</body>
</html>`
}
