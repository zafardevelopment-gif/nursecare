const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const OUT  = 'd:/CLAUDE CODE VS/nursecare/nursecare/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const PATIENT_EMAIL  = process.env.PATIENT_EMAIL  || '';
const PATIENT_PASS   = process.env.PATIENT_PASS   || '';
const PROVIDER_EMAIL = process.env.PROVIDER_EMAIL || '';
const PROVIDER_PASS  = process.env.PROVIDER_PASS  || '';
const HOSPITAL_EMAIL = process.env.HOSPITAL_EMAIL || '';
const HOSPITAL_PASS  = process.env.HOSPITAL_PASS  || '';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || '';
const ADMIN_PASS     = process.env.ADMIN_PASS     || '';

async function shot(page, filename, label) {
  await page.screenshot({ path: path.join(OUT, filename), fullPage: true });
  console.log(`✓ ${label}`);
}

async function shotMobile(page, filename, label) {
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(OUT, filename), fullPage: true });
  await page.setViewport({ width: 1440, height: 900 });
  console.log(`✓ ${label} (mobile)`);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle0' });
  await page.type('input[name="email"]',    email,    { delay: 30 });
  await page.type('input[name="password"]', password, { delay: 30 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
  ]);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    /* ── PUBLIC PAGES ─────────────────────────────────────── */
    const pub = await browser.newPage();
    await pub.setViewport({ width: 1440, height: 900 });

    // Homepage desktop
    await pub.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await shot(pub, '01_homepage_desktop.png', 'Homepage (desktop)');

    // Homepage mobile
    await pub.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await pub.reload({ waitUntil: 'networkidle0' });
    await shot(pub, '02_homepage_mobile.png', 'Homepage (mobile)');
    await pub.setViewport({ width: 1440, height: 900 });

    // Login page
    await pub.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle0' });
    await shot(pub, '03_login_page.png', 'Login page');

    // Signup page
    await pub.goto(`${BASE}/auth/signup`, { waitUntil: 'networkidle0' });
    await shot(pub, '04_signup_page.png', 'Signup / role selection');

    await pub.close();

    /* ── PATIENT FLOW ─────────────────────────────────────── */
    if (PATIENT_EMAIL) {
      const pat = await browser.newPage();
      await pat.setViewport({ width: 1440, height: 900 });
      await login(pat, PATIENT_EMAIL, PATIENT_PASS);

      await pat.goto(`${BASE}/patient/dashboard`, { waitUntil: 'networkidle0' });
      await shot(pat, '05_patient_dashboard.png', 'Patient dashboard');

      // Mobile dashboard
      await shotMobile(pat, '06_patient_dashboard_mobile.png', 'Patient dashboard');

      await pat.goto(`${BASE}/patient/booking`, { waitUntil: 'networkidle0' });
      await shot(pat, '07_patient_booking_step1.png', 'Patient booking - step 1');

      await pat.goto(`${BASE}/patient/bookings`, { waitUntil: 'networkidle0' });
      await shot(pat, '08_patient_my_bookings.png', 'Patient my bookings');

      await pat.goto(`${BASE}/patient/complaints`, { waitUntil: 'networkidle0' });
      await shot(pat, '09_patient_complaints.png', 'Patient complaints');

      await pat.goto(`${BASE}/patient/profile`, { waitUntil: 'networkidle0' });
      await shot(pat, '10_patient_profile.png', 'Patient profile');

      await pat.close();
    } else {
      console.log('⚠ No PATIENT_EMAIL — skipping patient screenshots');
    }

    /* ── PROVIDER FLOW ────────────────────────────────────── */
    if (PROVIDER_EMAIL) {
      const prv = await browser.newPage();
      await prv.setViewport({ width: 1440, height: 900 });
      await login(prv, PROVIDER_EMAIL, PROVIDER_PASS);

      await prv.goto(`${BASE}/provider/dashboard`, { waitUntil: 'networkidle0' });
      await shot(prv, '11_provider_dashboard.png', 'Provider dashboard');

      await shotMobile(prv, '12_provider_dashboard_mobile.png', 'Provider dashboard');

      await prv.goto(`${BASE}/provider/bookings`, { waitUntil: 'networkidle0' });
      await shot(prv, '13_provider_bookings.png', 'Provider bookings');

      await prv.goto(`${BASE}/provider/availability`, { waitUntil: 'networkidle0' });
      await shot(prv, '14_provider_availability.png', 'Provider availability');

      await prv.goto(`${BASE}/provider/leave`, { waitUntil: 'networkidle0' });
      await shot(prv, '15_provider_leave.png', 'Provider leave requests');

      await prv.goto(`${BASE}/provider/complaints`, { waitUntil: 'networkidle0' });
      await shot(prv, '16_provider_complaints.png', 'Provider complaints');

      await prv.goto(`${BASE}/provider/services`, { waitUntil: 'networkidle0' });
      await shot(prv, '17_provider_services.png', 'Provider services');

      await prv.goto(`${BASE}/provider/profile`, { waitUntil: 'networkidle0' });
      await shot(prv, '18_provider_profile.png', 'Provider profile');

      await prv.close();
    } else {
      console.log('⚠ No PROVIDER_EMAIL — skipping provider screenshots');
    }

    /* ── HOSPITAL FLOW ────────────────────────────────────── */
    if (HOSPITAL_EMAIL) {
      const hosp = await browser.newPage();
      await hosp.setViewport({ width: 1440, height: 900 });
      await login(hosp, HOSPITAL_EMAIL, HOSPITAL_PASS);

      await hosp.goto(`${BASE}/hospital/dashboard`, { waitUntil: 'networkidle0' });
      await shot(hosp, '19_hospital_dashboard.png', 'Hospital dashboard');

      await shotMobile(hosp, '20_hospital_dashboard_mobile.png', 'Hospital dashboard');

      await hosp.goto(`${BASE}/hospital/booking`, { waitUntil: 'networkidle0' });
      await shot(hosp, '21_hospital_booking.png', 'Hospital booking/staffing');

      await hosp.goto(`${BASE}/hospital/agreements`, { waitUntil: 'networkidle0' });
      await shot(hosp, '22_hospital_agreements.png', 'Hospital agreements');

      await hosp.goto(`${BASE}/hospital/departments`, { waitUntil: 'networkidle0' });
      await shot(hosp, '23_hospital_departments.png', 'Hospital departments');

      await hosp.goto(`${BASE}/hospital/complaints`, { waitUntil: 'networkidle0' });
      await shot(hosp, '24_hospital_complaints.png', 'Hospital complaints');

      await hosp.close();
    } else {
      console.log('⚠ No HOSPITAL_EMAIL — skipping hospital screenshots');
    }

    /* ── ADMIN FLOW ───────────────────────────────────────── */
    if (ADMIN_EMAIL) {
      const adm = await browser.newPage();
      await adm.setViewport({ width: 1440, height: 900 });
      await login(adm, ADMIN_EMAIL, ADMIN_PASS);

      await adm.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle0' });
      await shot(adm, '25_admin_dashboard.png', 'Admin dashboard');

      await shotMobile(adm, '26_admin_dashboard_mobile.png', 'Admin dashboard');

      await adm.goto(`${BASE}/admin/nurses`, { waitUntil: 'networkidle0' });
      await shot(adm, '27_admin_nurse_approvals.png', 'Admin nurse approvals');

      await adm.goto(`${BASE}/admin/bookings`, { waitUntil: 'networkidle0' });
      await shot(adm, '28_admin_bookings.png', 'Admin booking management');

      await adm.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle0' });
      await shot(adm, '29_admin_users.png', 'Admin users');

      await adm.goto(`${BASE}/admin/complaints`, { waitUntil: 'networkidle0' });
      await shot(adm, '30_admin_complaints.png', 'Admin complaints');

      await adm.goto(`${BASE}/admin/leave`, { waitUntil: 'networkidle0' });
      await shot(adm, '31_admin_leave.png', 'Admin leave requests');

      await adm.goto(`${BASE}/admin/hospitals`, { waitUntil: 'networkidle0' });
      await shot(adm, '32_admin_hospitals.png', 'Admin hospitals');

      await adm.goto(`${BASE}/admin/services`, { waitUntil: 'networkidle0' });
      await shot(adm, '33_admin_services.png', 'Admin service master');

      await adm.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle0' });
      await shot(adm, '34_admin_settings.png', 'Admin settings');

      await adm.close();
    } else {
      console.log('⚠ No ADMIN_EMAIL — skipping admin screenshots');
    }

    console.log('\n✅ All screenshots captured.');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
