// Renders a nurse ID card as a full HTML document (front + back)
// Used for preview, print, and PDF download

export interface IdCardData {
  uniqueIdCode: string
  nurseName: string
  nurseSpecialization: string | null
  nurseCity: string | null
  photoUrl: string | null
  logoUrl?: string | null
  issueDate: string
  expiryDate: string
  cardStatus: 'active' | 'revoked'
  isExpired: boolean
  verifyUrl: string   // full URL to public verification page
}

export function renderIdCardHtml(data: IdCardData): string {
  const statusColor  = data.isExpired || data.cardStatus === 'revoked' ? '#E04A4A' : '#27A869'
  const statusBg     = data.isExpired || data.cardStatus === 'revoked' ? '#FEE8E8' : '#E8F9F0'
  const statusLabel  = data.isExpired ? 'EXPIRED' : data.cardStatus === 'revoked' ? 'REVOKED' : 'ACTIVE'

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(data.verifyUrl)}&color=0B1E2D&bgcolor=FFFFFF`

  const photoBlock = data.photoUrl
    ? `<img src="${data.photoUrl}" alt="Photo" class="photo"/>`
    : `<div class="photo-placeholder">👤</div>`

  const logoBlock = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="Logo" class="logo"/>`
    : `<div class="logo-text">Nurse<span>Care+</span></div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Nurse ID Card — ${data.nurseName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #F0F5F8;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    gap: 32px;
  }
  .cards-row {
    display: flex;
    gap: 28px;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
  }
  /* ── Card base ────────────────────────────── */
  .card {
    width: 340px;
    height: 214px;
    border-radius: 16px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    flex-shrink: 0;
  }
  /* ── FRONT ────────────────────────────────── */
  .front {
    background: linear-gradient(135deg, #0B1E2D 0%, #0E7B8C 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
  }
  .front-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  .logo { height: 28px; max-width: 90px; object-fit: contain; filter: brightness(0) invert(1); }
  .logo-text {
    font-size: 15px; font-weight: 800; color: #fff; letter-spacing: 0.5px;
  }
  .logo-text span { color: #0ABFCC; }
  .badge-label {
    font-size: 8px; font-weight: 800; letter-spacing: 2px;
    text-transform: uppercase; color: rgba(255,255,255,0.6);
    background: rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 4px;
  }
  .front-body {
    display: flex;
    flex: 1;
    padding: 12px 18px;
    gap: 16px;
    align-items: center;
  }
  .photo {
    width: 72px; height: 88px;
    border-radius: 10px;
    object-fit: cover;
    border: 2.5px solid rgba(255,255,255,0.35);
    flex-shrink: 0;
  }
  .photo-placeholder {
    width: 72px; height: 88px;
    border-radius: 10px;
    background: rgba(255,255,255,0.1);
    border: 2.5px solid rgba(255,255,255,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 32px; flex-shrink: 0;
  }
  .nurse-info { flex: 1; min-width: 0; }
  .nurse-name {
    font-size: 15px; font-weight: 800;
    color: #fff; line-height: 1.2; margin-bottom: 4px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .nurse-spec {
    font-size: 10px; color: #0ABFCC; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
  }
  .info-row {
    font-size: 9px; color: rgba(255,255,255,0.6);
    margin-bottom: 3px; display: flex; gap: 5px; align-items: center;
  }
  .info-row strong { color: rgba(255,255,255,0.85); }
  .status-pill {
    display: inline-block; padding: 3px 10px; border-radius: 20px;
    font-size: 8px; font-weight: 800; letter-spacing: 1px;
    text-transform: uppercase; margin-top: 6px;
    background: ${statusBg}; color: ${statusColor};
  }
  .front-footer {
    padding: 8px 18px;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .id-number {
    font-size: 11px; font-weight: 700; color: #0ABFCC;
    letter-spacing: 1px; font-family: monospace;
  }
  .validity-mini {
    font-size: 8px; color: rgba(255,255,255,0.5);
  }
  /* ── BACK ─────────────────────────────────── */
  .back {
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 18px;
    gap: 10px;
  }
  .back-top {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 10px;
    border-bottom: 1px solid #E8EFF3;
  }
  .back-brand { font-size: 12px; font-weight: 800; color: #0E7B8C; }
  .back-brand span { color: #0B1E2D; }
  .back-tagline { font-size: 8px; color: #9AABB8; }
  .back-main {
    display: flex;
    gap: 16px;
    align-items: center;
    width: 100%;
  }
  .qr-wrap {
    flex-shrink: 0;
    border: 1.5px solid #E8EFF3;
    border-radius: 10px;
    padding: 6px;
    background: #fff;
  }
  .qr-wrap img { width: 80px; height: 80px; display: block; }
  .back-info { flex: 1; }
  .back-field { margin-bottom: 7px; }
  .back-field-label {
    font-size: 8px; font-weight: 700; color: #9AABB8;
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1px;
  }
  .back-field-value {
    font-size: 11px; font-weight: 700; color: #0B1E2D;
  }
  .scan-text {
    font-size: 8px; font-weight: 700; color: #0E7B8C;
    text-align: center; letter-spacing: 0.5px; margin-top: 2px;
  }
  .back-footer {
    width: 100%;
    border-top: 1px solid #E8EFF3;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .back-id { font-size: 9px; font-family: monospace; color: #0E7B8C; font-weight: 700; }
  .back-status {
    font-size: 8px; font-weight: 800; padding: 2px 8px; border-radius: 10px;
    background: ${statusBg}; color: ${statusColor};
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  /* ── Watermark for expired/revoked ───────── */
  .watermark {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none; z-index: 10;
    transform: rotate(-35deg);
    font-size: 42px; font-weight: 900;
    color: rgba(224,74,74,0.15);
    letter-spacing: 4px; text-transform: uppercase;
    white-space: nowrap;
  }
  /* ── Page labels ─────────────────────────── */
  .card-label {
    font-size: 11px; font-weight: 700; color: #6B8A9A;
    text-transform: uppercase; letter-spacing: 1px; text-align: center;
    margin-bottom: 6px;
  }
  .card-wrap { display: flex; flex-direction: column; }
  /* ── Page title ──────────────────────────── */
  .page-title {
    font-size: 22px; font-weight: 800; color: #0B1E2D; text-align: center;
  }
  .page-sub { font-size: 13px; color: #6B8A9A; text-align: center; margin-top: 4px; }
  .print-btn {
    margin-top: 8px;
    background: #0E7B8C; color: #fff; border: none;
    padding: 10px 28px; border-radius: 9px; font-size: 14px;
    font-weight: 700; cursor: pointer; font-family: inherit;
  }
  @media print {
    body { background: white; padding: 20px; }
    .print-btn, .page-title, .page-sub { display: none !important; }
    .cards-row { gap: 20px; }
    .card { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  }
</style>
</head>
<body>

<div class="page-title">Nurse ID Card</div>
<div class="page-sub">${data.nurseName} · ${data.uniqueIdCode}</div>

<div class="cards-row">
  <!-- FRONT -->
  <div class="card-wrap">
    <div class="card-label">Front</div>
    <div class="card front">
      ${(data.isExpired || data.cardStatus === 'revoked') ? `<div class="watermark">${statusLabel}</div>` : ''}

      <div class="front-header">
        ${logoBlock}
        <div class="badge-label">ID Card</div>
      </div>

      <div class="front-body">
        ${photoBlock}
        <div class="nurse-info">
          <div class="nurse-name">${data.nurseName}</div>
          <div class="nurse-spec">${data.nurseSpecialization ?? 'Registered Nurse'}</div>
          ${data.nurseCity ? `<div class="info-row">📍 <strong>${data.nurseCity}</strong></div>` : ''}
          <div class="info-row">🗓 Issued: <strong>${data.issueDate}</strong></div>
          <div class="status-pill">${statusLabel}</div>
        </div>
      </div>

      <div class="front-footer">
        <div class="id-number">${data.uniqueIdCode}</div>
        <div class="validity-mini">Valid until ${data.expiryDate}</div>
      </div>
    </div>
  </div>

  <!-- BACK -->
  <div class="card-wrap">
    <div class="card-label">Back</div>
    <div class="card back">
      ${(data.isExpired || data.cardStatus === 'revoked') ? `<div class="watermark">${statusLabel}</div>` : ''}

      <div class="back-top">
        <div>
          <div class="back-brand"><span>Nurse</span>Care+</div>
          <div class="back-tagline">Licensed Healthcare Provider Platform</div>
        </div>
        <div class="back-status">${statusLabel}</div>
      </div>

      <div class="back-main">
        <div>
          <div class="qr-wrap">
            <img src="${qrUrl}" alt="QR Code"/>
          </div>
          <div class="scan-text">📷 Scan to Verify</div>
        </div>
        <div class="back-info">
          <div class="back-field">
            <div class="back-field-label">Provider Name</div>
            <div class="back-field-value">${data.nurseName}</div>
          </div>
          <div class="back-field">
            <div class="back-field-label">Valid Until</div>
            <div class="back-field-value">${data.expiryDate}</div>
          </div>
          <div class="back-field">
            <div class="back-field-label">Issued On</div>
            <div class="back-field-value">${data.issueDate}</div>
          </div>
        </div>
      </div>

      <div class="back-footer">
        <div class="back-id">${data.uniqueIdCode}</div>
        <div style="font-size:7px;color:#9AABB8;">nursecare.app/verify</div>
      </div>
    </div>
  </div>
</div>

<button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>

</body>
</html>`
}
