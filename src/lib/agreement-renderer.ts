// Renders an agreement template into a full HTML document
// Used for both preview and PDF generation

export interface AgreementData {
  templateContent: string
  title: string
  logoUrl?: string | null
  // Nurse party
  nurseName?: string | null
  nurseEmail?: string | null
  nursePhone?: string | null
  nurseCity?: string | null
  nurseSpecialization?: string | null
  // Admin / Company party
  adminName?: string | null
  adminEmail?: string | null
  // Hospital party (optional — only when agreement involves hospital)
  hospitalName?: string | null
  hospitalEmail?: string | null
  // Dates & ID
  agreementDate: string
  agreementId: string
  // Approvals
  nurseApprovedAt?: string | null
  adminApprovedAt?: string | null
  hospitalApprovedAt?: string | null
  status: string
}

function replacePlaceholders(content: string, data: AgreementData): string {
  return content
    .replace(/\{\{nurse_name\}\}/gi,           data.nurseName ?? '—')
    .replace(/\{\{nurse_email\}\}/gi,          data.nurseEmail ?? '—')
    .replace(/\{\{nurse_phone\}\}/gi,          data.nursePhone ?? '—')
    .replace(/\{\{nurse_city\}\}/gi,           data.nurseCity ?? '—')
    .replace(/\{\{nurse_specialization\}\}/gi, data.nurseSpecialization ?? '—')
    .replace(/\{\{hospital_name\}\}/gi,        data.hospitalName ?? data.adminName ?? '—')
    .replace(/\{\{hospital_email\}\}/gi,       data.hospitalEmail ?? data.adminEmail ?? '—')
    .replace(/\{\{agreement_date\}\}/gi,       data.agreementDate)
    .replace(/\{\{agreement_id\}\}/gi,         data.agreementId)
}

// Converts plain text with **bold**, ### headings, numbered lists into HTML
function markdownToHtml(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let inList = false

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.trim() === '') {
      if (inList) { out.push('</ol>'); inList = false }
      out.push('<div style="height:8px"></div>')
      continue
    }

    if (line.startsWith('### ')) {
      if (inList) { out.push('</ol>'); inList = false }
      out.push(`<p class="clause-heading">${inlineBold(line.slice(4).trim())}</p>`)
      continue
    }

    // --- divider
    if (/^-{3,}$/.test(line.trim())) {
      if (inList) { out.push('</ol>'); inList = false }
      continue // skip --- lines
    }

    // * bullet item
    if (line.match(/^\*\s+/)) {
      if (!inList) { out.push('<ol class="clause-list">'); inList = true }
      out.push(`<li>${inlineBold(line.replace(/^\*\s+/, ''))}</li>`)
      continue
    }

    // Numbered list item: "1. " or "1) "
    const numbered = line.match(/^(\d+)[.)]\s+(.*)/)
    if (numbered) {
      if (!inList) { out.push('<ol class="clause-list">'); inList = true }
      out.push(`<li>${inlineBold(numbered[2])}</li>`)
      continue
    }

    if (inList) { out.push('</ol>'); inList = false }
    out.push(`<p class="clause-para">${inlineBold(line.trim())}</p>`)
  }

  if (inList) out.push('</ol>')
  return out.join('\n')
}

function inlineBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

export function renderAgreementHtml(data: AgreementData): string {
  const body    = replacePlaceholders(data.templateContent, data)
  const bodyHtml = markdownToHtml(body)

  const isFullyApproved = data.status === 'fully_approved'

  const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
    fully_approved:    { label: '✓  FULLY EXECUTED — All Parties Have Signed',       bg: '#E8F9F0', color: '#1A7A4A', border: '#27A869' },
    admin_approved:    { label: '⏳  Approved by Admin — Awaiting Nurse Signature',   bg: '#EEF6FD', color: '#0E5C8C', border: '#2E86C1' },
    nurse_approved:    { label: '⏳  Approved by Nurse — Awaiting Admin Confirmation',bg: '#EEF6FD', color: '#0E5C8C', border: '#2E86C1' },
    hospital_approved: { label: '⏳  Awaiting Provider Approval',                     bg: '#EEF6FD', color: '#0E5C8C', border: '#2E86C1' },
    pending:           { label: '⏳  PENDING — Awaiting Approval from All Parties',   bg: '#FFF8F0', color: '#9A4B00', border: '#E8831A' },
  }
  const sc = statusConfig[data.status] ?? statusConfig.pending

  function sigBox(
    label: string,
    name: string | null | undefined,
    email: string | null | undefined,
    approvedAt: string | null | undefined
  ) {
    if (!name && !email) return ''
    if (approvedAt) {
      return `
      <div class="sig-box approved">
        <div class="sig-role">${label}</div>
        <div class="sig-name">${name ?? '—'}</div>
        <div class="sig-email">${email ?? ''}</div>
        <div class="sig-stamp-approved">✓ Digitally Signed &amp; Approved</div>
        <div class="sig-date">Signed on: ${new Date(approvedAt).toLocaleString('en-GB', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
      </div>`
    }
    return `
    <div class="sig-box pending">
      <div class="sig-role">${label}</div>
      <div class="sig-name">${name ?? '—'}</div>
      <div class="sig-email">${email ?? ''}</div>
      <div class="sig-line"></div>
      <div class="sig-line-label">Signature &amp; Date</div>
      <div class="sig-stamp-pending">⏳ Pending Approval</div>
    </div>`
  }

  function partyBox(
    title: string, icon: string,
    name: string | null | undefined,
    email: string | null | undefined,
    extra: (string | null | undefined)[]
  ) {
    if (!name && !email) return ''
    return `
    <div class="party-box">
      <div class="party-title">${icon}&nbsp; ${title}</div>
      <div class="party-name">${name ?? '—'}</div>
      ${email ? `<div class="party-detail">✉&nbsp; ${email}</div>` : ''}
      ${extra.filter(Boolean).map(e => `<div class="party-detail">${e}</div>`).join('')}
    </div>`
  }

  const nurseParty = partyBox('Healthcare Provider (Nurse)', '👤',
    data.nurseName, data.nurseEmail,
    [
      data.nursePhone ? `📞&nbsp; ${data.nursePhone}` : null,
      data.nurseCity  ? `📍&nbsp; ${data.nurseCity}`  : null,
      data.nurseSpecialization ? `🏥&nbsp; ${data.nurseSpecialization}` : null,
    ]
  )

  // Show admin party as "Company / Admin", or hospital if this is a hospital agreement
  const companyParty = data.hospitalName
    ? partyBox('Employer / Hospital', '🏢', data.hospitalName, data.hospitalEmail, [])
    : partyBox('Company / Admin', '🏢', data.adminName, data.adminEmail, [])

  const partiesSection = (nurseParty || companyParty) ? `
  <div class="section-label">PARTIES TO THE AGREEMENT</div>
  <div class="parties-grid">
    ${nurseParty}
    ${companyParty}
  </div>` : ''

  // Signature boxes
  const nurseBox   = sigBox('Healthcare Provider (Nurse)',
    data.nurseName, data.nurseEmail, data.nurseApprovedAt)

  const companyBox = data.hospitalName
    ? sigBox('Employer / Hospital',
        data.hospitalName, data.hospitalEmail, data.hospitalApprovedAt)
    : sigBox('Company / Admin',
        data.adminName, data.adminEmail, data.adminApprovedAt)

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
    font-size: 13.5px;
    color: #1C1C2E;
    background: #fff;
    line-height: 1.75;
  }
  .page {
    max-width: 820px;
    margin: 0 auto;
    padding: 52px 60px 64px;
    background: #fff;
  }
  /* ── Header ── */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 18px;
    border-bottom: 3px solid #0E7B8C;
  }
  .logo-area img        { max-height: 52px; max-width: 160px; object-fit: contain; }
  .brand-name           { font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: #0E7B8C; }
  .brand-tagline        { font-size: 9px; color: #888; font-family: sans-serif; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }
  .header-meta          { text-align: right; }
  .header-meta .doc-type   { font-size: 9.5px; font-family: sans-serif; letter-spacing: 2.5px; text-transform: uppercase; color: #0E7B8C; font-weight: 700; }
  .header-meta .doc-detail { font-size: 11px; color: #666; font-family: sans-serif; margin-top: 3px; }
  /* ── Status Banner ── */
  .status-banner {
    padding: 9px 16px;
    font-size: 11px; font-family: sans-serif; font-weight: 700;
    letter-spacing: 0.5px;
    border-left: 4px solid;
    border-radius: 4px;
    margin: 22px 0;
    text-align: center;
  }
  /* ── Title Block ── */
  .title-block {
    text-align: center;
    padding: 22px 0 18px;
    border-bottom: 1px solid #dde6ea;
    margin-bottom: 28px;
  }
  .title-block h1 {
    font-size: 23px; font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px; color: #0B1E2D;
    margin-bottom: 6px;
  }
  .title-block .subtitle { font-size: 11.5px; color: #777; font-family: sans-serif; }
  .meta-pills { display: flex; justify-content: center; gap: 14px; margin-top: 12px; flex-wrap: wrap; }
  .meta-pill {
    font-size: 10px; font-family: sans-serif;
    background: #f2f7f9; border: 1px solid #d5e3e8;
    padding: 4px 12px; border-radius: 50px; color: #444;
  }
  .meta-pill strong { color: #0E7B8C; }
  /* ── Section Label ── */
  .section-label {
    font-size: 9.5px; font-family: sans-serif;
    letter-spacing: 2.5px; text-transform: uppercase;
    color: #0E7B8C; font-weight: 700;
    padding-bottom: 7px;
    border-bottom: 1.5px solid #d5e3e8;
    margin: 28px 0 16px;
  }
  /* ── Parties Grid ── */
  .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 4px; }
  .party-box {
    border: 1px solid #ccdde4; border-radius: 8px;
    padding: 16px 18px; background: #f8fbfd;
  }
  .party-title  { font-size: 9px; font-family: sans-serif; letter-spacing: 1.5px; text-transform: uppercase; color: #0E7B8C; font-weight: 700; margin-bottom: 8px; }
  .party-name   { font-size: 15px; font-weight: 700; margin-bottom: 5px; color: #111; }
  .party-detail { font-size: 11.5px; color: #555; font-family: sans-serif; margin-top: 3px; }
  /* ── Body Content ── */
  .clause-heading { font-size: 13px; font-weight: 700; font-family: sans-serif; color: #0B1E2D; margin: 18px 0 6px; }
  .clause-para    { margin-bottom: 8px; text-align: justify; color: #2a2a2a; }
  .clause-list    { padding-left: 22px; margin: 6px 0 10px; }
  .clause-list li { margin-bottom: 8px; text-align: justify; color: #2a2a2a; padding-left: 4px; }
  /* ── Signatures ── */
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 8px; }
  .sig-box          { border-radius: 8px; padding: 18px 20px; }
  .sig-box.approved { border: 1.5px solid #27A869; background: #f0faf5; }
  .sig-box.pending  { border: 1.5px dashed #c5d5dc; background: #fafcfd; }
  .sig-role         { font-size: 9px; font-family: sans-serif; letter-spacing: 1.5px; text-transform: uppercase; color: #888; font-weight: 700; margin-bottom: 6px; }
  .sig-name         { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
  .sig-email        { font-size: 11px; color: #777; font-family: sans-serif; margin-bottom: 10px; }
  .sig-line         { border-bottom: 1.5px solid #b0c4cc; margin: 12px 0 4px; }
  .sig-line-label   { font-size: 9.5px; color: #aaa; font-family: sans-serif; }
  .sig-stamp-approved { font-size: 11.5px; font-family: sans-serif; font-weight: 700; color: #1A7A4A; margin-top: 8px; }
  .sig-stamp-pending  { font-size: 11px; font-family: sans-serif; font-weight: 600; color: #E8831A; margin-top: 6px; }
  .sig-date         { font-size: 10px; color: #777; font-family: sans-serif; margin-top: 4px; }
  /* ── Footer ── */
  .footer {
    margin-top: 44px; padding-top: 14px;
    border-top: 1px solid #d5e3e8;
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-brand       { font-size: 12.5px; font-weight: 700; font-family: sans-serif; color: #0E7B8C; }
  .footer-disclaimer  { font-size: 9.5px; color: #aaa; font-family: sans-serif; text-align: center; flex: 1; padding: 0 16px; }
  .footer-badge {
    font-size: 10px; font-family: sans-serif; font-weight: 700;
    padding: 4px 10px; border-radius: 50px;
    background: ${isFullyApproved ? '#E8F9F0' : '#FFF3E8'};
    color: ${isFullyApproved ? '#1A7A4A' : '#9A4B00'};
    border: 1px solid ${isFullyApproved ? '#27A869' : '#E8831A'};
  }
  @media print {
    body  { background: white; }
    .page { padding: 24px 36px 32px; max-width: 100%; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      ${data.logoUrl
        ? `<img src="${data.logoUrl}" alt="Logo"/>`
        : `<div class="brand-name">NurseCare+</div><div class="brand-tagline">Healthcare Staffing Platform</div>`
      }
    </div>
    <div class="header-meta">
      <div class="doc-type">Service Agreement</div>
      <div class="doc-detail">ID: ${data.agreementId.substring(0, 8).toUpperCase()}</div>
      <div class="doc-detail">Date: ${data.agreementDate}</div>
    </div>
  </div>

  <!-- Status Banner -->
  <div class="status-banner" style="background:${sc.bg};color:${sc.color};border-color:${sc.border};">
    ${sc.label}
  </div>

  <!-- Title -->
  <div class="title-block">
    <h1>${data.title}</h1>
    <div class="subtitle">This agreement is entered into between the parties listed below</div>
    <div class="meta-pills">
      <span class="meta-pill">ID: <strong>${data.agreementId.substring(0, 8).toUpperCase()}</strong></span>
      <span class="meta-pill">Date: <strong>${data.agreementDate}</strong></span>
      <span class="meta-pill">Status: <strong>${data.status.replace(/_/g, ' ').toUpperCase()}</strong></span>
    </div>
  </div>

  <!-- Parties -->
  ${partiesSection}

  <!-- Terms -->
  <div class="section-label">Terms and Conditions</div>
  <div class="body-content">
    ${bodyHtml}
  </div>

  <!-- Signatures -->
  <div class="section-label">Digital Approval &amp; Signatures</div>
  <div class="sig-grid">
    ${nurseBox}
    ${companyBox}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">NurseCare+</div>
    <div class="footer-disclaimer">
      This agreement was generated digitally via NurseCare+ Platform.<br/>
      For legal enforceability, please ensure all parties have digitally approved.
    </div>
    <div class="footer-badge">${isFullyApproved ? '✓ EXECUTED' : 'DRAFT'}</div>
  </div>

</div>
</body>
</html>`
}
