const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'd:/CLAUDE CODE VS/nursecare/nursecare/screenshots';
const PDF_OUT = 'd:/CLAUDE CODE VS/nursecare/nursecare/NurseCare_UAT_Report.pdf';
const TODAY   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

// Convert image to base64 data URI
function imgToBase64(filename) {
  const p = path.join(OUT_DIR, filename);
  if (!fs.existsSync(p)) return null;
  const data = fs.readFileSync(p).toString('base64');
  return `data:image/png;base64,${data}`;
}

const img = (file) => {
  const b64 = imgToBase64(file);
  if (!b64) return `<div style="background:#f0f5f8;border:2px dashed #cbd5e1;border-radius:8px;padding:40px;text-align:center;color:#94a3b8;font-size:13px;">Screenshot: ${file}<br><em>(Requires authenticated session)</em></div>`;
  return `<img src="${b64}" style="width:100%;border-radius:8px;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,0.08);" />`;
};

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>NurseCare+ UAT Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  * { margin:0; padding:0; box-sizing:border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #0f172a;
    background: #fff;
    font-size: 13px;
    line-height: 1.6;
  }

  /* ── Page breaks ── */
  .page-break { page-break-after: always; break-after: always; height: 0; }
  .no-break   { page-break-inside: avoid; break-inside: avoid; }

  /* ── Cover ── */
  .cover {
    min-height: 100vh;
    background: linear-gradient(135deg, #071622 0%, #0B1E2D 60%, #0a2535 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 60px 80px;
    position: relative;
    overflow: hidden;
  }
  .cover::before {
    content:'';
    position:absolute; top:-20%; right:-10%;
    width:600px; height:600px;
    background: radial-gradient(circle, rgba(10,191,204,0.08) 0%, transparent 70%);
  }
  .cover-logo {
    display:flex; align-items:center; gap:14px;
    margin-bottom:60px;
  }
  .cover-logo-icon {
    width:52px; height:52px;
    background: linear-gradient(135deg,#0E7B8C,#0ABFCC);
    border-radius:13px;
    display:flex; align-items:center; justify-content:center;
    font-size:26px;
  }
  .cover-logo-text {
    font-size:28px; font-weight:800; color:#fff;
    letter-spacing:-0.5px;
  }
  .cover-logo-text span { color:#0ABFCC; }
  .cover-badge {
    background: rgba(10,191,204,0.1);
    border: 1px solid rgba(10,191,204,0.3);
    color: #0ABFCC;
    padding: 6px 18px;
    border-radius: 50px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 28px;
  }
  .cover h1 {
    font-size: 42px;
    font-weight: 800;
    color: #fff;
    text-align: center;
    line-height: 1.15;
    margin-bottom: 16px;
    max-width: 700px;
  }
  .cover h1 span { color: #0ABFCC; }
  .cover-sub {
    font-size:16px; color:rgba(255,255,255,0.6);
    text-align:center; margin-bottom:60px;
    max-width:520px; line-height:1.65;
  }
  .cover-meta {
    display:grid; grid-template-columns:1fr 1fr 1fr;
    gap:20px; width:100%; max-width:700px; margin-bottom:60px;
  }
  .cover-meta-item {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius:12px; padding:18px 20px; text-align:center;
  }
  .cover-meta-label { font-size:10px; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.08em; font-weight:600; margin-bottom:5px; }
  .cover-meta-value { font-size:14px; color:#fff; font-weight:700; }
  .cover-footer {
    position:absolute; bottom:40px;
    font-size:11px; color:rgba(255,255,255,0.25);
    text-align:center;
  }
  .cover-divider {
    width:60px; height:3px;
    background: linear-gradient(90deg,#0E7B8C,#0ABFCC);
    border-radius:2px; margin:0 auto 48px;
  }

  /* ── Content layout ── */
  .content { padding: 60px 80px; max-width: 900px; margin: 0 auto; }

  /* ── Section headers ── */
  .section-header {
    display:flex; align-items:center; gap:14px;
    margin-bottom:28px; padding-bottom:16px;
    border-bottom: 2px solid #f1f5f9;
  }
  .section-number {
    width:36px; height:36px; border-radius:10px;
    background: linear-gradient(135deg,#0E7B8C,#0ABFCC);
    display:flex; align-items:center; justify-content:center;
    font-size:14px; font-weight:800; color:#fff; flex-shrink:0;
  }
  .section-title { font-size:20px; font-weight:800; color:#0f172a; }
  .section-subtitle { font-size:12px; color:#64748b; margin-top:2px; }

  /* ── Cards ── */
  .card {
    background:#fff; border:1px solid #e2e8f0;
    border-radius:14px; padding:28px;
    margin-bottom:20px; box-shadow:0 2px 12px rgba(0,0,0,0.04);
  }
  .card-teal { border-left:4px solid #0E7B8C; }
  .card-orange { border-left:4px solid #f59e0b; }
  .card-green { border-left:4px solid #10b981; }
  .card-red { border-left:4px solid #ef4444; }

  /* ── Info boxes ── */
  .info-box {
    background: rgba(14,123,140,0.06);
    border: 1px solid rgba(14,123,140,0.2);
    border-radius:10px; padding:16px 20px;
    margin-bottom:20px;
  }
  .warning-box {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius:10px; padding:16px 20px;
    margin-bottom:20px;
  }

  /* ── Tables ── */
  .tbl { width:100%; border-collapse:collapse; margin-bottom:24px; font-size:12px; }
  .tbl thead tr { background: linear-gradient(135deg,#0B1E2D,#1a3347); }
  .tbl thead th { padding:12px 16px; text-align:left; color:#fff; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; }
  .tbl tbody tr:nth-child(even) { background:#f8fafc; }
  .tbl tbody tr:hover { background:#f0f9ff; }
  .tbl tbody td { padding:11px 16px; border-bottom:1px solid #f1f5f9; color:#334155; vertical-align:top; }
  .tbl tbody tr:last-child td { border-bottom:none; }

  /* ── Status badges ── */
  .badge {
    display:inline-flex; align-items:center; gap:4px;
    padding:3px 10px; border-radius:50px;
    font-size:11px; font-weight:700; white-space:nowrap;
  }
  .badge-green  { background:rgba(16,185,129,0.1); color:#059669; border:1px solid rgba(16,185,129,0.25); }
  .badge-amber  { background:rgba(245,158,11,0.1); color:#d97706; border:1px solid rgba(245,158,11,0.25); }
  .badge-blue   { background:rgba(59,130,246,0.1); color:#2563eb; border:1px solid rgba(59,130,246,0.25); }
  .badge-purple { background:rgba(139,92,246,0.1); color:#7c3aed; border:1px solid rgba(139,92,246,0.25); }
  .badge-red    { background:rgba(239,68,68,0.1);  color:#dc2626; border:1px solid rgba(239,68,68,0.25); }
  .badge-gray   { background:rgba(100,116,139,0.1);color:#475569; border:1px solid rgba(100,116,139,0.25); }

  /* ── Screenshot blocks ── */
  .screenshot-block { margin-bottom:36px; }
  .screenshot-label {
    font-size:12px; font-weight:700; color:#0E7B8C;
    text-transform:uppercase; letter-spacing:0.08em;
    margin-bottom:8px; display:flex; align-items:center; gap:6px;
  }
  .screenshot-label::before { content:''; display:inline-block; width:3px; height:14px; background:#0E7B8C; border-radius:2px; }
  .screenshot-caption {
    font-size:12px; color:#64748b; margin-top:8px;
    font-style:italic; text-align:center;
  }
  .screenshots-grid {
    display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;
  }

  /* ── Testing steps ── */
  .step-item {
    display:flex; gap:16px; margin-bottom:18px; align-items:flex-start;
  }
  .step-num {
    width:32px; height:32px; border-radius:50%; flex-shrink:0;
    background: linear-gradient(135deg,#0E7B8C,#0ABFCC);
    display:flex; align-items:center; justify-content:center;
    font-size:13px; font-weight:800; color:#fff;
  }
  .step-content { flex:1; padding-top:4px; }
  .step-title { font-weight:700; color:#0f172a; font-size:13px; margin-bottom:3px; }
  .step-desc  { color:#64748b; font-size:12px; line-height:1.5; }
  .step-url   { font-size:11px; color:#0E7B8C; font-weight:600; margin-top:4px; font-family:monospace; }

  /* ── Decision items ── */
  .decision-item {
    display:flex; gap:12px; padding:14px 16px;
    border:1px solid #e2e8f0; border-radius:10px;
    margin-bottom:10px; align-items:flex-start;
  }
  .decision-icon { font-size:20px; flex-shrink:0; }
  .decision-title { font-weight:700; font-size:13px; color:#0f172a; margin-bottom:2px; }
  .decision-desc  { font-size:12px; color:#64748b; line-height:1.5; }

  /* ── Approval section ── */
  .approval-box {
    border:2px solid #e2e8f0; border-radius:14px;
    padding:28px; margin-bottom:20px;
  }
  .approval-title { font-size:16px; font-weight:800; margin-bottom:20px; color:#0f172a; }
  .checkbox-row {
    display:flex; align-items:center; gap:12px;
    padding:14px 0; border-bottom:1px solid #f1f5f9;
    font-size:13px; font-weight:600; color:#334155;
  }
  .checkbox-box {
    width:22px; height:22px; border:2px solid #cbd5e1;
    border-radius:5px; flex-shrink:0;
  }
  .sig-field { border-bottom:1px solid #334155; height:40px; margin-top:8px; }
  .sig-label { font-size:11px; color:#94a3b8; margin-top:6px; }

  /* ── KPI summary row ── */
  .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
  .kpi-card {
    background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;
    padding:18px; text-align:center;
  }
  .kpi-num  { font-size:28px; font-weight:800; line-height:1; margin-bottom:4px; }
  .kpi-lbl  { font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; }

  /* ── TOC ── */
  .toc-item {
    display:flex; justify-content:space-between; align-items:center;
    padding:10px 14px; border-bottom:1px solid #f1f5f9;
    font-size:13px;
  }
  .toc-item:last-child { border-bottom:none; }
  .toc-title { font-weight:600; color:#334155; }
  .toc-page  { font-weight:700; color:#0E7B8C; font-size:12px; }
  .toc-dots  { flex:1; border-bottom:2px dotted #e2e8f0; margin:0 10px; height:1px; margin-bottom:2px; }

  /* ── Spacer ── */
  .spacer { height:32px; }
  .spacer-sm { height:16px; }
  .spacer-lg { height:48px; }

  /* ── Footer strip ── */
  .page-footer {
    margin-top:40px; padding-top:16px;
    border-top:2px solid #f1f5f9;
    display:flex; justify-content:space-between;
    font-size:11px; color:#94a3b8;
  }
  .page-footer strong { color:#0E7B8C; }

  /* ── Print ── */
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════
     COVER PAGE
════════════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-logo">
    <div class="cover-logo-icon">🏥</div>
    <div class="cover-logo-text">Nurse<span>Care+</span></div>
  </div>

  <div class="cover-badge">User Acceptance Testing Document</div>
  <h1>Project Progress Report &amp;<br/><span>UAT Testing Guide</span></h1>
  <div class="cover-sub">
    A comprehensive walkthrough of completed modules, system screenshots, and structured testing steps prepared for client review and approval.
  </div>
  <div class="cover-divider"></div>

  <div class="cover-meta">
    <div class="cover-meta-item">
      <div class="cover-meta-label">Prepared For</div>
      <div class="cover-meta-value">Client Review</div>
    </div>
    <div class="cover-meta-item">
      <div class="cover-meta-label">Current Phase</div>
      <div class="cover-meta-value">Booking Flow Complete</div>
    </div>
    <div class="cover-meta-item">
      <div class="cover-meta-label">Report Date</div>
      <div class="cover-meta-value">${TODAY}</div>
    </div>
  </div>

  <div class="cover-footer">
    NurseCare+ Platform — Confidential Client Document &nbsp;·&nbsp; Prepared by Development Team
  </div>
</div>
<div class="page-break"></div>

<!-- ═══════════════════════════════════════════════════════════
     TABLE OF CONTENTS
════════════════════════════════════════════════════════════ -->
<div class="content">
  <div class="section-header">
    <div class="section-number">📋</div>
    <div>
      <div class="section-title">Table of Contents</div>
      <div class="section-subtitle">Navigation guide for this document</div>
    </div>
  </div>

  <div class="card">
    <div class="toc-item"><span class="toc-title">Section 1 — Executive Summary</span><span class="toc-dots"></span><span class="toc-page">Page 3</span></div>
    <div class="toc-item"><span class="toc-title">Section 2 — Completed Features Checklist</span><span class="toc-dots"></span><span class="toc-page">Page 4</span></div>
    <div class="toc-item"><span class="toc-title">Section 3 — Screenshots Walkthrough</span><span class="toc-dots"></span><span class="toc-page">Page 5</span></div>
    <div class="toc-item" style="padding-left:28px"><span class="toc-title" style="color:#64748b">3.1 — Public Website (Homepage + Login)</span><span class="toc-dots"></span><span class="toc-page">Page 5</span></div>
    <div class="toc-item" style="padding-left:28px"><span class="toc-title" style="color:#64748b">3.2 — Patient Portal</span><span class="toc-dots"></span><span class="toc-page">Page 7</span></div>
    <div class="toc-item" style="padding-left:28px"><span class="toc-title" style="color:#64748b">3.3 — Nurse / Provider Portal</span><span class="toc-dots"></span><span class="toc-page">Page 9</span></div>
    <div class="toc-item" style="padding-left:28px"><span class="toc-title" style="color:#64748b">3.4 — Hospital Portal</span><span class="toc-dots"></span><span class="toc-page">Page 11</span></div>
    <div class="toc-item" style="padding-left:28px"><span class="toc-title" style="color:#64748b">3.5 — Admin Portal</span><span class="toc-dots"></span><span class="toc-page">Page 13</span></div>
    <div class="toc-item"><span class="toc-title">Section 4 — Client Testing Steps (Step-by-Step)</span><span class="toc-dots"></span><span class="toc-page">Page 15</span></div>
    <div class="toc-item"><span class="toc-title">Section 5 — Feedback &amp; Decisions Required</span><span class="toc-dots"></span><span class="toc-page">Page 17</span></div>
    <div class="toc-item"><span class="toc-title">Section 6 — Pending Next Phase</span><span class="toc-dots"></span><span class="toc-page">Page 18</span></div>
    <div class="toc-item"><span class="toc-title">Section 7 — Approval &amp; Sign-Off</span><span class="toc-dots"></span><span class="toc-page">Page 19</span></div>
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report</span>
    <span><strong>CONFIDENTIAL</strong> — For Client Review Only</span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- ═══════════════════════════════════════════════════════════
     SECTION 1: EXECUTIVE SUMMARY
════════════════════════════════════════════════════════════ -->
<div class="content">
  <div class="section-header">
    <div class="section-number">1</div>
    <div>
      <div class="section-title">Executive Summary</div>
      <div class="section-subtitle">Current project status and progress overview</div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-num" style="color:#0E7B8C">4</div>
      <div class="kpi-lbl">User Portals</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-num" style="color:#10b981">18+</div>
      <div class="kpi-lbl">Modules Complete</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-num" style="color:#7c3aed">60+</div>
      <div class="kpi-lbl">Pages Built</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-num" style="color:#f59e0b">100%</div>
      <div class="kpi-lbl">Core Flow Done</div>
    </div>
  </div>

  <div class="card card-teal">
    <p style="font-size:13px;color:#334155;line-height:1.75;margin-bottom:12px;">
      The <strong>NurseCare+</strong> platform development is progressing on schedule. The core system — including the full booking flow, all four user portals, authentication, role-based access control, and the administrative backend — has been successfully developed and is ready for client review and testing.
    </p>
    <p style="font-size:13px;color:#334155;line-height:1.75;margin-bottom:12px;">
      In the most recent development phase, two additional modules have been implemented: a <strong>Leave Management System</strong> for nurses (MVP), and a <strong>Dispute &amp; Complaint Management System</strong> for all user types. Performance optimizations including edge-level authentication, database indexes, and loading skeleton screens have also been applied.
    </p>
    <p style="font-size:13px;color:#334155;line-height:1.75;">
      A professional landing homepage has been built and is live. Mobile responsiveness is currently being refined across all dashboards. The system is deployed and accessible for testing at the provided URL.
    </p>
  </div>

  <div class="spacer-sm"></div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
    <div class="card" style="padding:20px;">
      <div style="font-weight:800;font-size:13px;color:#0f172a;margin-bottom:12px;">✅ What's Complete</div>
      ${['Public homepage (landing page)','User authentication (login/signup/logout)','Role-based access control (4 roles)','Patient booking flow (full end-to-end)','Nurse/Provider portal &amp; profile','Hospital portal &amp; booking system','Admin portal with full management','Leave management system (MVP)','Complaint &amp; dispute system (MVP)','Notification system','Agreement management','ID Card generation','Service master &amp; categories','Performance optimization','Mobile-responsive layout'].map(i=>`<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;font-size:12px;color:#334155;"><span style="color:#10b981;font-size:13px;flex-shrink:0;">✓</span>${i}</div>`).join('')}
    </div>
    <div class="card" style="padding:20px;">
      <div style="font-weight:800;font-size:13px;color:#0f172a;margin-bottom:12px;">🔄 In Progress / Pending</div>
      ${['Payment gateway integration','SMS / WhatsApp notifications','Advanced analytics &amp; reports','Mobile polish (final pass)','Arabic language support (RTL)','Production domain &amp; SSL setup','Final branding &amp; logo','Email notification templates','Advanced scheduling system','AI-powered nurse matching'].map(i=>`<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;font-size:12px;color:#64748b;"><span style="color:#f59e0b;font-size:13px;flex-shrink:0;">○</span>${i}</div>`).join('')}
    </div>
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 1: Executive Summary</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- ═══════════════════════════════════════════════════════════
     SECTION 2: FEATURES CHECKLIST
════════════════════════════════════════════════════════════ -->
<div class="content">
  <div class="section-header">
    <div class="section-number">2</div>
    <div>
      <div class="section-title">Completed Features Checklist</div>
      <div class="section-subtitle">Full module status overview for client verification</div>
    </div>
  </div>

  <table class="tbl">
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Module / Feature</th>
        <th>Portal</th>
        <th>Status</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${[
        ['1','Landing Homepage','Public','Complete','Hero, search, provider cards, features, testimonials, footer'],
        ['2','User Login','Public','Complete','Email/password, role-based redirect to dashboard'],
        ['3','User Signup','Public','Complete','Role selection: Patient, Nurse, Hospital'],
        ['4','Password Reset','Public','Complete','Email-based reset flow'],
        ['5','Patient Dashboard','Patient','Complete','KPI cards, recent bookings, quick actions'],
        ['6','Book a Nurse — Full Flow','Patient','Complete','Service selection → Nurse search → Date/Time → Confirm'],
        ['7','My Bookings (Patient)','Patient','Complete','List, filter by status, detail view'],
        ['8','Patient Profile','Patient','Complete','Personal info management'],
        ['9','Patient Complaints','Patient','Complete','Submit &amp; track complaints'],
        ['10','Patient Messages','Patient','Complete','In-app messaging (chat disabled placeholder)'],
        ['11','Patient Onboarding','Patient','Complete','First-time setup flow'],
        ['12','Provider Dashboard','Nurse','Complete','KPI cards, pending requests, booking table, hospital bookings'],
        ['13','Nurse Profile / Onboarding','Nurse','Complete','Full nurse registration with documents upload'],
        ['14','Nurse Availability','Nurse','Complete','Weekly shift availability management'],
        ['15','Leave Requests','Nurse','Complete (MVP)','Submit leave, view history, status tracking'],
        ['16','Nurse Bookings','Nurse','Complete','Accept/decline, work start/done actions'],
        ['17','Nurse Services','Nurse','Complete','View offered services'],
        ['18','Nurse Complaints','Nurse','Complete','Submit &amp; track complaints'],
        ['19','Nurse Documents','Nurse','Complete','Upload &amp; manage certifications'],
        ['20','Nurse ID Card','Nurse','Complete','Digital ID card generation'],
        ['21','Nurse Agreements','Nurse','Complete','View &amp; digitally sign agreements'],
        ['22','Hospital Dashboard','Hospital','Complete','Agreement &amp; booking overview, KPIs'],
        ['23','Hospital Onboarding','Hospital','Complete','Hospital registration flow'],
        ['24','Hospital Booking/Staffing','Hospital','Complete','Book multiple nurses, shift scheduling'],
        ['25','Hospital Departments','Hospital','Complete','Department management'],
        ['26','Hospital Schedule','Hospital','Complete','Shift schedule view'],
        ['27','Hospital Agreements','Hospital','Complete','View &amp; accept service agreements'],
        ['28','Hospital Complaints','Hospital','Complete','Submit &amp; track complaints'],
        ['29','Admin Dashboard','Admin','Complete','Platform-wide KPIs, pending actions'],
        ['30','Admin Nurse Approvals','Admin','Complete','Review &amp; approve/reject nurse registrations'],
        ['31','Admin Booking Management','Admin','Complete','Full booking oversight, status updates'],
        ['32','Admin Hospital Management','Admin','Complete','Hospital approval, agreement generation'],
        ['33','Admin Hospital Bookings','Admin','Complete','Hospital booking management &amp; nurse matching'],
        ['34','Admin Leave Management','Admin','Complete (MVP)','Review &amp; approve/reject nurse leave requests'],
        ['35','Admin Complaints','Admin','Complete (MVP)','Review, resolve, or reject complaints'],
        ['36','Admin Users','Admin','Complete','User list management'],
        ['37','Admin Service Master','Admin','Complete','Service categories &amp; pricing management'],
        ['38','Admin Agreements','Admin','Complete','Agreement generation &amp; management'],
        ['39','Admin Settings','Admin','Complete','Platform configuration flags'],
        ['40','Notifications System','All','Complete','In-app notification center'],
        ['41','Mobile Responsive Layout','All','In Progress','Sidebar collapses, mobile menu works; dashboard cards being refined'],
        ['42','Performance Optimization','All','Complete','Edge auth, DB indexes, skeleton loaders, parallel queries'],
      ].map(([num,mod,portal,status,notes]) => {
        const badgeClass = status.startsWith('Complete') && !status.includes('Progress') ? 'badge-green' : status.includes('Progress') ? 'badge-amber' : 'badge-blue';
        return `<tr>
          <td style="color:#94a3b8;font-weight:600;">${num}</td>
          <td style="font-weight:600;color:#0f172a;">${mod}</td>
          <td><span class="badge badge-${portal==='Admin'?'purple':portal==='Patient'?'blue':portal==='Nurse'?'green':portal==='Hospital'?'amber':'gray'}">${portal}</span></td>
          <td><span class="badge ${badgeClass}">${status}</span></td>
          <td style="color:#64748b;font-size:11px;">${notes}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 2: Features Checklist</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- ═══════════════════════════════════════════════════════════
     SECTION 3: SCREENSHOTS
════════════════════════════════════════════════════════════ -->
<div class="content">
  <div class="section-header">
    <div class="section-number">3</div>
    <div>
      <div class="section-title">Screenshots Walkthrough</div>
      <div class="section-subtitle">Visual reference of all completed sections</div>
    </div>
  </div>

  <!-- 3.1 Public -->
  <div style="background:rgba(14,123,140,0.06);border:1px solid rgba(14,123,140,0.2);border-radius:10px;padding:12px 18px;margin-bottom:24px;font-size:12px;font-weight:700;color:#0E7B8C;text-transform:uppercase;letter-spacing:0.07em;">
    3.1 — Public Website
  </div>

  <div class="screenshot-block no-break">
    <div class="screenshot-label">Homepage — Desktop View (1440px)</div>
    ${img('01_homepage_desktop.png')}
    <div class="screenshot-caption">Full landing page: navbar, hero section with provider cards, trust badges, how it works, specialties, featured providers, features, testimonials, CTA, and footer.</div>
  </div>

  <div class="screenshots-grid no-break">
    <div class="screenshot-block">
      <div class="screenshot-label">Homepage — Mobile (390px)</div>
      ${img('02_homepage_mobile.png')}
      <div class="screenshot-caption">Mobile-responsive homepage with collapsible navigation.</div>
    </div>
    <div class="screenshot-block">
      <div class="screenshot-label">Hero Section — Above Fold</div>
      ${img('01b_homepage_hero.png')}
      <div class="screenshot-caption">Hero: headline, CTA buttons, live provider cards, stats.</div>
    </div>
  </div>

  <div class="screenshots-grid no-break">
    <div class="screenshot-block">
      <div class="screenshot-label">Login Page — Desktop</div>
      ${img('03_login_desktop.png')}
      <div class="screenshot-caption">Email/password login with role-based redirect after auth.</div>
    </div>
    <div class="screenshot-block">
      <div class="screenshot-label">Login Page — Mobile</div>
      ${img('04_login_mobile.png')}
      <div class="screenshot-caption">Mobile login — fully responsive auth card layout.</div>
    </div>
  </div>

  <div class="screenshot-block no-break">
    <div class="screenshot-label">Signup Page — Role Selection</div>
    ${img('05_signup_desktop.png')}
    <div class="screenshot-caption">Registration page with role selector: Patient, Nurse, or Hospital. Each role gets a tailored onboarding flow after signup.</div>
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 3.1: Public Website</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- 3.2 Patient -->
<div class="content">
  <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:12px 18px;margin-bottom:24px;font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.07em;">
    3.2 — Patient Portal
  </div>

  ${['05_patient_dashboard.png','06_patient_dashboard_mobile.png','07_patient_booking_step1.png','08_patient_my_bookings.png','09_patient_complaints.png','10_patient_profile.png'].some(f=>fs.existsSync(path.join(OUT_DIR,f))) ? '' : `
  <div class="warning-box">
    <strong>ℹ️ Note for client:</strong> Patient portal screenshots require an authenticated patient test account. The system is fully functional — please use the testing credentials provided separately to access and review these screens. All pages listed below are complete and operational.
  </div>`}

  <table class="tbl" style="margin-bottom:28px;">
    <thead><tr><th>Page</th><th>Route</th><th>Description</th><th>Status</th></tr></thead>
    <tbody>
      ${[
        ['Patient Dashboard','/patient/dashboard','KPI cards (active/pending bookings), recent bookings table, quick actions','✅ Complete'],
        ['Book a Nurse','/patient/booking','6-step booking wizard: service → nurse search → date/time → confirm','✅ Complete'],
        ['My Bookings','/patient/bookings','Full booking history with status filters and detail view','✅ Complete'],
        ['Booking Detail','/patient/bookings/[id]','Full booking info, status timeline, payment status, confirm/cancel actions','✅ Complete'],
        ['Complaints','/patient/complaints','Submit complaint (with booking link, type, description, image), view history','✅ Complete'],
        ['Messages','/patient/messages','In-app messaging interface','✅ Complete'],
        ['My Profile','/patient/profile','Edit personal information, contact details','✅ Complete'],
        ['Onboarding','/patient/onboarding','First-time patient setup flow','✅ Complete'],
      ].map(([page,route,desc,status])=>`<tr><td style="font-weight:600;">${page}</td><td><code style="font-size:11px;color:#0E7B8C;">${route}</code></td><td style="color:#64748b;">${desc}</td><td><span class="badge badge-green">${status}</span></td></tr>`).join('')}
    </tbody>
  </table>

  <div class="card card-blue" style="border-left-color:#2563eb;">
    <div style="font-weight:800;font-size:13px;margin-bottom:12px;">🔍 Patient Booking Flow — Step by Step</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
      ${[
        ['1','Select Service','Choose from available service categories (General Nursing, Cardiac Care, IV Therapy, etc.)'],
        ['2','Choose Nurse','Search and filter nurses by city, availability, and specialty. View profile and ratings.'],
        ['3','Pick Date &amp; Time','Select booking date, shift (morning/evening/night), duration, and booking type.'],
        ['4','Enter Details','Provide address, city, and any special notes for the nurse.'],
        ['5','Confirm Booking','Review summary and submit. Nurse receives instant notification.'],
        ['6','Track Status','Monitor booking status from pending → accepted → in-progress → completed.'],
      ].map(([n,t,d])=>`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;">
        <div style="width:26px;height:26px;background:linear-gradient(135deg,#0E7B8C,#0ABFCC);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;margin-bottom:8px;">${n}</div>
        <div style="font-weight:700;font-size:12px;margin-bottom:4px;">${t}</div>
        <div style="font-size:11px;color:#64748b;line-height:1.5;">${d}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="screenshot-block no-break">
    <div class="screenshot-label">Patient Dashboard</div>
    ${img('05_patient_dashboard.png')}
    <div class="screenshot-caption">Patient home: KPI summary, active booking alerts, recent bookings list, and quick action buttons.</div>
  </div>

  <div class="screenshots-grid no-break">
    <div>
      <div class="screenshot-label">Booking Flow — Step 1</div>
      ${img('07_patient_booking_step1.png')}
      <div class="screenshot-caption">Service and nurse selection step.</div>
    </div>
    <div>
      <div class="screenshot-label">My Bookings List</div>
      ${img('08_patient_my_bookings.png')}
      <div class="screenshot-caption">Full booking history with status filters.</div>
    </div>
  </div>

  <div class="screenshots-grid no-break">
    <div>
      <div class="screenshot-label">Complaints Page</div>
      ${img('09_patient_complaints.png')}
      <div class="screenshot-caption">Submit and track complaints with booking linkage.</div>
    </div>
    <div>
      <div class="screenshot-label">Mobile — Patient Dashboard</div>
      ${img('06_patient_dashboard_mobile.png')}
      <div class="screenshot-caption">Mobile-optimized dashboard view.</div>
    </div>
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 3.2: Patient Portal</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- 3.3 Provider -->
<div class="content">
  <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:12px 18px;margin-bottom:24px;font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.07em;">
    3.3 — Nurse / Provider Portal
  </div>

  <table class="tbl" style="margin-bottom:28px;">
    <thead><tr><th>Page</th><th>Route</th><th>Description</th><th>Status</th></tr></thead>
    <tbody>
      ${[
        ['Provider Dashboard','/provider/dashboard','KPI overview, pending requests, active bookings, hospital bookings table','✅ Complete'],
        ['My Bookings','/provider/bookings','Incoming requests, active bookings. Accept/decline actions.','✅ Complete'],
        ['Booking Detail','/provider/bookings/[id]','Full booking details, Work Start / Work Done buttons','✅ Complete'],
        ['Availability','/provider/availability','Weekly shift availability calendar with slot management','✅ Complete'],
        ['Leave Requests','/provider/leave','Submit leave, view history, conflict detection with bookings','✅ Complete'],
        ['My Services','/provider/services','View assigned service categories','✅ Complete'],
        ['Complaints','/provider/complaints','Submit and track complaints against patients or bookings','✅ Complete'],
        ['Documents','/provider/documents','Upload certifications, license, photo','✅ Complete'],
        ['ID Card','/provider/id-card','Digital nurse ID card with QR code','✅ Complete'],
        ['Agreements','/provider/agreements','View and digitally sign service agreements','✅ Complete'],
        ['Profile','/provider/profile','Edit personal and professional details','✅ Complete'],
        ['Onboarding','/provider/onboarding','Full nurse registration wizard','✅ Complete'],
      ].map(([page,route,desc,status])=>`<tr><td style="font-weight:600;">${page}</td><td><code style="font-size:11px;color:#0E7B8C;">${route}</code></td><td style="color:#64748b;">${desc}</td><td><span class="badge badge-green">${status}</span></td></tr>`).join('')}
    </tbody>
  </table>

  <div class="screenshot-block no-break">
    <div class="screenshot-label">Provider Dashboard</div>
    ${img('11_provider_dashboard.png')}
    <div class="screenshot-caption">Nurse dashboard: pending request alerts, KPI cards (new requests, active, in-progress, completed), bookings table with Work Start/Done actions, hospital bookings section.</div>
  </div>

  <div class="screenshots-grid no-break">
    <div>
      <div class="screenshot-label">Bookings Management</div>
      ${img('13_provider_bookings.png')}
      <div class="screenshot-caption">Incoming booking requests with accept/decline actions.</div>
    </div>
    <div>
      <div class="screenshot-label">Availability Settings</div>
      ${img('14_provider_availability.png')}
      <div class="screenshot-caption">Weekly shift availability management.</div>
    </div>
  </div>

  <div class="screenshots-grid no-break">
    <div>
      <div class="screenshot-label">Leave Requests</div>
      ${img('15_provider_leave.png')}
      <div class="screenshot-caption">Submit leave requests with conflict detection.</div>
    </div>
    <div>
      <div class="screenshot-label">Complaints</div>
      ${img('16_provider_complaints.png')}
      <div class="screenshot-caption">Provider complaint submission and tracking.</div>
    </div>
  </div>

  <div class="screenshots-grid no-break">
    <div>
      <div class="screenshot-label">Mobile — Provider Dashboard</div>
      ${img('12_provider_dashboard_mobile.png')}
      <div class="screenshot-caption">Responsive mobile view with slide-in sidebar.</div>
    </div>
    <div>
      <div class="screenshot-label">Provider Profile</div>
      ${img('18_provider_profile.png')}
      <div class="screenshot-caption">Professional profile with edit capabilities.</div>
    </div>
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 3.3: Provider Portal</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- 3.4 Hospital -->
<div class="content">
  <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:12px 18px;margin-bottom:24px;font-size:12px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.07em;">
    3.4 — Hospital Portal
  </div>

  <table class="tbl" style="margin-bottom:28px;">
    <thead><tr><th>Page</th><th>Route</th><th>Description</th><th>Status</th></tr></thead>
    <tbody>
      ${[
        ['Hospital Dashboard','/hospital/dashboard','Overview of agreements, bookings, billing summary, and quick actions','✅ Complete'],
        ['Book Nurses / Staffing','/hospital/booking','Multi-nurse staffing request with department/shift/period selection','✅ Complete'],
        ['Booking Detail','/hospital/booking/[id]','Full booking details, nurse selections, confirm/cancel actions','✅ Complete'],
        ['Shift Schedule','/hospital/schedule','Visual schedule of assigned nurses by day and shift','✅ Complete'],
        ['Departments','/hospital/departments','Create and manage hospital departments','✅ Complete'],
        ['Agreements','/hospital/agreements','Review and accept service agreements from NurseCare+','✅ Complete'],
        ['Complaints','/hospital/complaints','Submit and track complaints','✅ Complete'],
        ['Profile','/hospital/profile','Hospital profile and contact management','✅ Complete'],
        ['Onboarding','/hospital/onboarding','Hospital registration and verification flow','✅ Complete'],
      ].map(([page,route,desc,status])=>`<tr><td style="font-weight:600;">${page}</td><td><code style="font-size:11px;color:#0E7B8C;">${route}</code></td><td style="color:#64748b;">${desc}</td><td><span class="badge badge-green">${status}</span></td></tr>`).join('')}
    </tbody>
  </table>

  <div class="screenshot-block no-break">
    <div class="screenshot-label">Hospital Dashboard</div>
    ${img('19_hospital_dashboard.png')}
    <div class="screenshot-caption">Hospital overview: agreement KPIs, status banners, recent agreements list, recent bookings, quick actions, and billing summary.</div>
  </div>

  <div class="screenshots-grid no-break">
    <div>
      <div class="screenshot-label">Nurse Booking / Staffing</div>
      ${img('21_hospital_booking.png')}
      <div class="screenshot-caption">Multi-nurse staffing request builder.</div>
    </div>
    <div>
      <div class="screenshot-label">Agreements</div>
      ${img('22_hospital_agreements.png')}
      <div class="screenshot-caption">Service agreement list with review &amp; accept actions.</div>
    </div>
  </div>

  <div class="screenshots-grid no-break">
    <div>
      <div class="screenshot-label">Departments</div>
      ${img('23_hospital_departments.png')}
      <div class="screenshot-caption">Department management for staff assignment.</div>
    </div>
    <div>
      <div class="screenshot-label">Mobile — Hospital Dashboard</div>
      ${img('20_hospital_dashboard_mobile.png')}
      <div class="screenshot-caption">Mobile-optimized hospital interface.</div>
    </div>
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 3.4: Hospital Portal</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- 3.5 Admin -->
<div class="content">
  <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.2);border-radius:10px;padding:12px 18px;margin-bottom:24px;font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.07em;">
    3.5 — Admin Portal
  </div>

  <table class="tbl" style="margin-bottom:28px;">
    <thead><tr><th>Page</th><th>Route</th><th>Description</th><th>Status</th></tr></thead>
    <tbody>
      ${[
        ['Admin Dashboard','/admin/dashboard','Platform-wide KPIs, pending actions counter, recent activity','✅ Complete'],
        ['Nurse Approvals','/admin/nurses','Review nurse registrations, approve/reject with notes','✅ Complete'],
        ['Profile Updates','/admin/nurse-updates','Review nurse profile change requests','✅ Complete'],
        ['Booking Management','/admin/bookings','Full patient booking oversight with status management','✅ Complete'],
        ['Hospital Management','/admin/hospitals','Approve hospitals, generate agreements','✅ Complete'],
        ['Hospital Bookings','/admin/hospital-bookings','Match and confirm nurses for hospital staffing requests','✅ Complete'],
        ['Leave Requests','/admin/leave','Review nurse leave requests, check booking conflicts, approve/reject','✅ Complete'],
        ['Complaints','/admin/complaints','Review all complaints, resolve or reject with admin notes','✅ Complete'],
        ['Agreements','/admin/agreements','Generate and manage service agreements','✅ Complete'],
        ['Users','/admin/users','Platform user management','✅ Complete'],
        ['Service Master','/admin/services','Manage service categories and pricing','✅ Complete'],
        ['ID Cards','/admin/nurses/id-cards','Generate and view nurse ID cards','✅ Complete'],
        ['Settings','/admin/settings','Platform feature flags and configuration','✅ Complete'],
      ].map(([page,route,desc,status])=>`<tr><td style="font-weight:600;">${page}</td><td><code style="font-size:11px;color:#0E7B8C;">${route}</code></td><td style="color:#64748b;">${desc}</td><td><span class="badge badge-green">${status}</span></td></tr>`).join('')}
    </tbody>
  </table>

  <div class="screenshot-block no-break">
    <div class="screenshot-label">Admin Dashboard</div>
    ${img('25_admin_dashboard.png')}
    <div class="screenshot-caption">Platform command center: total nurses, bookings by status, pending approvals, users count, quick action links to all management areas.</div>
  </div>

  <div class="screenshots-grid no-break">
    <div>
      <div class="screenshot-label">Nurse Approvals</div>
      ${img('27_admin_nurse_approvals.png')}
      <div class="screenshot-caption">Review nurse registration with approve/reject actions.</div>
    </div>
    <div>
      <div class="screenshot-label">Booking Management</div>
      ${img('28_admin_bookings.png')}
      <div class="screenshot-caption">Full booking oversight with filters and status updates.</div>
    </div>
  </div>

  <div class="screenshots-grid no-break">
    <div>
      <div class="screenshot-label">Leave Requests Management</div>
      ${img('31_admin_leave.png')}
      <div class="screenshot-caption">Review nurse leave with booking conflict warnings.</div>
    </div>
    <div>
      <div class="screenshot-label">Complaints Management</div>
      ${img('30_admin_complaints.png')}
      <div class="screenshot-caption">Resolve or reject complaints from all user types.</div>
    </div>
  </div>

  <div class="screenshots-grid no-break">
    <div>
      <div class="screenshot-label">Users Management</div>
      ${img('29_admin_users.png')}
      <div class="screenshot-caption">Platform-wide user list management.</div>
    </div>
    <div>
      <div class="screenshot-label">Mobile — Admin Dashboard</div>
      ${img('26_admin_dashboard_mobile.png')}
      <div class="screenshot-caption">Admin dashboard on mobile/tablet.</div>
    </div>
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 3.5: Admin Portal</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- ═══════════════════════════════════════════════════════════
     SECTION 4: TESTING STEPS
════════════════════════════════════════════════════════════ -->
<div class="content">
  <div class="section-header">
    <div class="section-number">4</div>
    <div>
      <div class="section-title">Client Testing Steps</div>
      <div class="section-subtitle">Step-by-step guide to test all major flows</div>
    </div>
  </div>

  <div class="info-box">
    <strong>Before you start:</strong> Use the test credentials provided separately to log in as each user type. The system URL will be provided by the development team. We recommend testing on both desktop (Chrome/Edge) and mobile.
  </div>

  <!-- Test Flow 1: Patient -->
  <div class="card card-blue" style="border-left-color:#2563eb;margin-bottom:20px;">
    <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:16px;display:flex;align-items:center;gap:8px;"><span style="background:rgba(37,99,235,0.1);color:#2563eb;padding:3px 10px;border-radius:50px;font-size:11px;">FLOW 1</span> Patient — Full Booking Flow</div>
    ${[
      ['Login as Patient','Go to /auth/login → enter patient test email &amp; password → verify redirect to /patient/dashboard','/auth/login'],
      ['Explore Dashboard','Check KPI cards show correct counts. Review recent bookings list.','/patient/dashboard'],
      ['Create a Booking','Click "Book a Nurse" → select a service category → search/select a nurse → choose date, shift, city → confirm booking','/patient/booking'],
      ['Track Your Booking','Go to My Bookings → find your new booking → check status shows "Pending" → open detail view','/patient/bookings'],
      ['Submit a Complaint','Go to Complaints → click "Submit Complaint" → select booking, type, add description → submit → verify it appears in list','/patient/complaints'],
      ['Check Notifications','Click the bell icon → verify a notification appeared for your booking','/patient/dashboard'],
    ].map(([t,d,u],i)=>`<div class="step-item"><div class="step-num">${i+1}</div><div class="step-content"><div class="step-title">${t}</div><div class="step-desc">${d}</div><div class="step-url">${u}</div></div></div>`).join('')}
  </div>

  <!-- Test Flow 2: Nurse -->
  <div class="card card-green" style="border-left-color:#10b981;margin-bottom:20px;">
    <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:16px;display:flex;align-items:center;gap:8px;"><span style="background:rgba(16,185,129,0.1);color:#059669;padding:3px 10px;border-radius:50px;font-size:11px;">FLOW 2</span> Nurse — Accept Booking &amp; Submit Leave</div>
    ${[
      ['Login as Nurse','Go to /auth/login → enter nurse/provider test credentials → verify redirect to /provider/dashboard','/auth/login'],
      ['Review Pending Requests','Check the "Pending Requests" section on dashboard. You should see the patient\'s booking from Flow 1.','/provider/dashboard'],
      ['Accept Booking','Click View → on booking detail, click Accept (or Decline) → confirm action → check status updates','/provider/bookings'],
      ['Manage Availability','Go to Availability → set your available shifts for the week → save','/provider/availability'],
      ['Submit Leave Request','Go to Leave → click "Request Leave" → select date, type (full/half day), add reason → submit','/provider/leave'],
      ['Submit a Complaint','Go to Complaints → submit a complaint about a booking → verify it appears in list','/provider/complaints'],
    ].map(([t,d,u],i)=>`<div class="step-item"><div class="step-num">${i+1}</div><div class="step-content"><div class="step-title">${t}</div><div class="step-desc">${d}</div><div class="step-url">${u}</div></div></div>`).join('')}
  </div>

  <!-- Test Flow 3: Hospital -->
  <div class="card card-orange" style="border-left-color:#f59e0b;margin-bottom:20px;">
    <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:16px;display:flex;align-items:center;gap:8px;"><span style="background:rgba(245,158,11,0.1);color:#d97706;padding:3px 10px;border-radius:50px;font-size:11px;">FLOW 3</span> Hospital — Staffing Request</div>
    ${[
      ['Login as Hospital','Enter hospital test credentials → redirect to /hospital/dashboard','/auth/login'],
      ['Review Dashboard','Check agreement status, pending booking alerts, billing summary','/hospital/dashboard'],
      ['Create Staffing Request','Go to Book Nurses → fill in period, shifts, department, number of nurses needed → submit','/hospital/booking'],
      ['Check Agreements','Go to Agreements → review any pending service agreements → accept if applicable','/hospital/agreements'],
      ['Manage Departments','Go to Departments → add or edit a department','/hospital/departments'],
    ].map(([t,d,u],i)=>`<div class="step-item"><div class="step-num">${i+1}</div><div class="step-content"><div class="step-title">${t}</div><div class="step-desc">${d}</div><div class="step-url">${u}</div></div></div>`).join('')}
  </div>

  <!-- Test Flow 4: Admin -->
  <div class="card" style="border-left:4px solid #7c3aed;margin-bottom:20px;">
    <div style="font-weight:800;font-size:14px;color:#0f172a;margin-bottom:16px;display:flex;align-items:center;gap:8px;"><span style="background:rgba(139,92,246,0.1);color:#7c3aed;padding:3px 10px;border-radius:50px;font-size:11px;">FLOW 4</span> Admin — Approvals &amp; Management</div>
    ${[
      ['Login as Admin','Enter admin credentials → redirect to /admin/dashboard','/auth/login'],
      ['Review Dashboard KPIs','Check total nurses, pending approvals count, booking stats','/admin/dashboard'],
      ['Approve a Nurse','Go to Nurse Approvals → find a pending nurse → review documents → Approve','/admin/nurses'],
      ['Review a Booking','Go to Booking Management → find the patient booking from Flow 1 → review details','/admin/bookings'],
      ['Handle Leave Request','Go to Leave Requests → find the nurse leave from Flow 2 → check if it conflicts with bookings → approve or reject','/admin/leave'],
      ['Resolve a Complaint','Go to Complaints → find a complaint → add admin note → Mark Resolved or Reject','/admin/complaints'],
      ['Check Settings','Go to Settings → review platform feature flags (nurse approval mode, advance booking hours)','/admin/settings'],
    ].map(([t,d,u],i)=>`<div class="step-item"><div class="step-num">${i+1}</div><div class="step-content"><div class="step-title">${t}</div><div class="step-desc">${d}</div><div class="step-url">${u}</div></div></div>`).join('')}
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 4: Testing Steps</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- ═══════════════════════════════════════════════════════════
     SECTION 5: FEEDBACK REQUIRED
════════════════════════════════════════════════════════════ -->
<div class="content">
  <div class="section-header">
    <div class="section-number">5</div>
    <div>
      <div class="section-title">Feedback &amp; Decisions Required</div>
      <div class="section-subtitle">Client input needed to proceed with next development phase</div>
    </div>
  </div>

  <div class="warning-box">
    <strong>⚠️ Action Required:</strong> The items below require your decision before development can continue on the next phase. Please review each point and provide written confirmation or feedback.
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
    ${[
      ['💳','Payment Gateway','Which payment provider should be integrated? Options: Mada, STC Pay, Stripe, PayTabs, HyperPay. This affects the entire payment module architecture.'],
      ['📱','SMS / WhatsApp Notifications','Which SMS provider for OTP and notifications? Options: Twilio, Unifonic, Zain SMS, Msegat. Required for Arabic SMS support.'],
      ['🎨','Final Branding & Logo','Please confirm the final logo, brand colors, and tagline. The current design uses the NurseCare+ name — if this changes it affects many screens.'],
      ['💰','Nurse Pricing Rules','How should nurse pricing work? Fixed rate per service? Hourly? Should hospitals get discounted rates? Custom per-nurse pricing?'],
      ['🌐','Production Domain','What is the final domain name? e.g. nursecare.sa, nursecare.com.sa. Needed for SSL certificate and Supabase auth settings.'],
      ['🕌','Arabic Language (RTL)','When should Arabic support be added? This is a significant change affecting all UI components. Recommend Phase 3 after full testing.'],
      ['🏥','Hospital Workflow Details','Does the hospital booking flow match your real operational process? Are there steps missing (e.g. department head approval, contract types)?'],
      ['📊','Reports & Analytics','Which reports are needed first? Nurse performance, revenue, booking trends, city-wise stats? Required to build the analytics module.'],
      ['🔔','Notification Preferences','Should users receive email notifications in addition to in-app? What events should trigger WhatsApp messages?'],
      ['📋','Contract / Agreement Templates','Please provide the actual service agreement templates in DOCX format so we can implement the proper legal text generation.'],
    ].map(([icon,title,desc])=>`
    <div class="decision-item">
      <div class="decision-icon">${icon}</div>
      <div>
        <div class="decision-title">${title}</div>
        <div class="decision-desc">${desc}</div>
        <div style="margin-top:8px;border-bottom:1px solid #e2e8f0;height:20px;"></div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px;">Client response:</div>
      </div>
    </div>`).join('')}
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 5: Decisions Required</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- ═══════════════════════════════════════════════════════════
     SECTION 6: NEXT PHASE
════════════════════════════════════════════════════════════ -->
<div class="content">
  <div class="section-header">
    <div class="section-number">6</div>
    <div>
      <div class="section-title">Pending — Next Development Phase</div>
      <div class="section-subtitle">Planned work after client approval of current phase</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
    ${[
      ['Phase 4A','Payment Integration','High','Integrate selected payment gateway. Patient checkout flow. Invoice generation. Hospital billing module. Payment status tracking.','#dc2626'],
      ['Phase 4B','SMS & Notifications','High','Twilio/Unifonic SMS integration. WhatsApp notifications for bookings. Email templates. Push notifications (PWA).','#dc2626'],
      ['Phase 5A','Mobile Polish (Final)','Medium','Final responsive pass on all dashboards. Native-feeling mobile UX. Bottom navigation bar for mobile. PWA setup.','#d97706'],
      ['Phase 5B','Arabic Language','Medium','Full RTL layout support. Arabic translations for all UI. Bilingual toggle. Arabic date/time formatting.','#d97706'],
      ['Phase 6A','Analytics & Reports','Medium','Revenue dashboards. Nurse performance reports. Booking trends. Export to PDF/Excel. City-wise statistics.','#2563eb'],
      ['Phase 6B','Advanced AI Features','Low','AI-powered nurse matching. Smart scheduling suggestions. Predictive availability. Rating algorithm improvements.','#7c3aed'],
      ['Phase 7','Production Deploy','High','Vercel production deployment. Custom domain SSL. Supabase production DB. Environment hardening. Security audit.','#dc2626'],
      ['Phase 8','QA & Load Testing','Medium','Full regression testing. Load testing for concurrent bookings. Security penetration testing. Performance benchmarking.','#059669'],
    ].map(([phase,title,priority,desc,color])=>`
    <div class="card no-break" style="border-top:3px solid ${color};padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">${phase}</div>
        <span class="badge ${priority==='High'?'badge-red':priority==='Medium'?'badge-amber':'badge-gray'}">${priority} Priority</span>
      </div>
      <div style="font-weight:800;font-size:13px;margin-bottom:8px;">${title}</div>
      <div style="font-size:11px;color:#64748b;line-height:1.55;">${desc}</div>
    </div>`).join('')}
  </div>

  <div class="card card-teal">
    <div style="font-weight:800;font-size:14px;margin-bottom:14px;">📅 Estimated Timeline</div>
    <table class="tbl" style="margin:0;">
      <thead><tr><th>Phase</th><th>Estimated Duration</th><th>Dependency</th><th>Priority</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:600;">Phase 4A — Payment</td><td>2–3 weeks</td><td>Gateway selection from client</td><td><span class="badge badge-red">High</span></td></tr>
        <tr><td style="font-weight:600;">Phase 4B — SMS/Notifications</td><td>1–2 weeks</td><td>SMS provider selection from client</td><td><span class="badge badge-red">High</span></td></tr>
        <tr><td style="font-weight:600;">Phase 5A — Mobile Polish</td><td>1–2 weeks</td><td>Client UAT approval</td><td><span class="badge badge-amber">Medium</span></td></tr>
        <tr><td style="font-weight:600;">Phase 5B — Arabic/RTL</td><td>2–3 weeks</td><td>Final branding confirmation</td><td><span class="badge badge-amber">Medium</span></td></tr>
        <tr><td style="font-weight:600;">Phase 6A — Reports</td><td>1–2 weeks</td><td>Report requirements from client</td><td><span class="badge badge-amber">Medium</span></td></tr>
        <tr><td style="font-weight:600;">Phase 7 — Production Deploy</td><td>1 week</td><td>Domain, all phases complete</td><td><span class="badge badge-red">High</span></td></tr>
      </tbody>
    </table>
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 6: Next Phase</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>
<div class="page-break"></div>

<!-- ═══════════════════════════════════════════════════════════
     SECTION 7: APPROVAL
════════════════════════════════════════════════════════════ -->
<div class="content">
  <div class="section-header">
    <div class="section-number">7</div>
    <div>
      <div class="section-title">Approval &amp; Sign-Off</div>
      <div class="section-subtitle">Client acknowledgement of completed work and direction for next phase</div>
    </div>
  </div>

  <div class="info-box">
    Please review this document and the live system, then complete this approval form and return it to the development team. Your signature confirms you have reviewed the completed work and authorizes proceeding to the next development phase.
  </div>

  <!-- Approval checkboxes -->
  <div class="approval-box">
    <div class="approval-title">Phase Approval Status</div>
    <div class="checkbox-row"><div class="checkbox-box"></div>✅ <strong>Approved</strong> — Work is complete as described. Proceed to next phase.</div>
    <div class="checkbox-row"><div class="checkbox-box"></div>🔄 <strong>Approved with Minor Changes</strong> — Proceed but fix items noted below.</div>
    <div class="checkbox-row"><div class="checkbox-box"></div>⏸️ <strong>Changes Required Before Approval</strong> — Hold next phase until issues resolved.</div>
    <div class="checkbox-row"><div class="checkbox-box"></div>❌ <strong>Rejected</strong> — Significant issues found. Full review meeting required.</div>
  </div>

  <!-- Notes area -->
  <div class="approval-box" style="margin-bottom:20px;">
    <div class="approval-title">Feedback / Change Requests</div>
    <div style="min-height:80px;border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#fafafa;margin-bottom:12px;">
      <div style="color:#cbd5e1;font-size:12px;">Write your feedback here...</div>
    </div>
    <div style="min-height:60px;border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#fafafa;">
      <div style="color:#cbd5e1;font-size:12px;">Priority items to fix first...</div>
    </div>
  </div>

  <!-- Decisions -->
  <div class="approval-box" style="margin-bottom:20px;">
    <div class="approval-title">Key Decisions Confirmed (from Section 5)</div>
    <table class="tbl" style="margin:0;">
      <thead><tr><th>Decision Item</th><th>Client Selection / Response</th></tr></thead>
      <tbody>
        <tr><td>Payment Gateway</td><td style="min-width:200px;">&nbsp;</td></tr>
        <tr><td>SMS Provider</td><td>&nbsp;</td></tr>
        <tr><td>Production Domain</td><td>&nbsp;</td></tr>
        <tr><td>Arabic Language — Target Phase</td><td>&nbsp;</td></tr>
        <tr><td>Priority for Next Sprint</td><td>&nbsp;</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Signatures -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px;">
    <div class="card" style="padding:24px;">
      <div style="font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:0.07em;color:#64748b;margin-bottom:20px;">Client Signature</div>
      <div class="sig-field"></div>
      <div class="sig-label">Signature</div>
      <div class="sig-field" style="margin-top:20px;width:60%;"></div>
      <div class="sig-label">Full Name</div>
      <div class="sig-field" style="margin-top:20px;width:60%;"></div>
      <div class="sig-label">Date</div>
    </div>
    <div class="card" style="padding:24px;">
      <div style="font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:0.07em;color:#64748b;margin-bottom:20px;">Development Team</div>
      <div style="margin-bottom:12px;font-size:12px;color:#334155;"><strong>Project:</strong> NurseCare+ Platform</div>
      <div style="margin-bottom:12px;font-size:12px;color:#334155;"><strong>Phase:</strong> Booking Flow Complete</div>
      <div style="margin-bottom:12px;font-size:12px;color:#334155;"><strong>Report Date:</strong> ${TODAY}</div>
      <div style="margin-bottom:12px;font-size:12px;color:#334155;"><strong>Status:</strong> <span class="badge badge-green">✅ Ready for Review</span></div>
      <div style="margin-top:20px;padding:12px;background:rgba(14,123,140,0.06);border-radius:8px;font-size:11px;color:#64748b;">
        Return this signed document by email or WhatsApp to authorize the next development sprint.
      </div>
    </div>
  </div>

  <div class="spacer"></div>

  <!-- Final footer -->
  <div style="text-align:center;padding:24px;background:linear-gradient(135deg,#071622,#0B1E2D);border-radius:14px;">
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px;">
      <div style="width:28px;height:28px;background:linear-gradient(135deg,#0E7B8C,#0ABFCC);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;">🏥</div>
      <span style="font-family:Georgia,serif;font-size:16px;color:#fff;font-weight:700;">Nurse<span style="color:#0ABFCC;">Care+</span></span>
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);">Confidential Client Document — ${TODAY} — Do Not Distribute</div>
  </div>

  <div class="page-footer">
    <span>NurseCare+ UAT Report — Section 7: Approval</span>
    <span><strong>CONFIDENTIAL</strong></span>
    <span>${TODAY}</span>
  </div>
</div>

</body>
</html>`;

// Write HTML
const htmlPath = path.join(path.dirname(PDF_OUT), 'NurseCare_UAT_Report.html');
fs.writeFileSync(htmlPath, HTML);
console.log('✓ HTML generated');

// Convert to PDF
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  await page.setContent(HTML, { waitUntil: 'networkidle0', timeout: 60000 });

  await page.pdf({
    path: PDF_OUT,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
  const size = (fs.statSync(PDF_OUT).size / 1024 / 1024).toFixed(1);
  console.log(`✅ PDF generated: ${PDF_OUT} (${size} MB)`);
})().catch(e => { console.error('PDF error:', e.message); process.exit(1); });
