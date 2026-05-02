/**
 * WhatsApp Business API sender for NurseCare+
 * Uses Meta Cloud API with pre-approved Twilio Content Templates.
 * All sends are gated by the whatsapp.enabled developer setting.
 * Per-template toggles use key: template_<name>_enabled (default: on).
 */

import { getDeveloperSettingsByCategory, getBool, getVal } from './developer-settings'

/* ── Template names (match Twilio Content Template names) ──────────────── */

export type WhatsAppTemplate =
  | 'nurse_new_booking_alert'
  | 'payment_deadline_reminder'
  | 'booking_cancelled_patient'
  | 'patient_welcome'
  | 'payment_confirmed_patient'
  | 'booking_submitted'
  | 'booking_cancelled_nurse'
  | 'nurse_rejected'
  | 'hospital_request_confirmed'
  | 'hospital_nurses_assigned'

/* ── Phone normalizer ────────────────────────────────────────────────────── */

function toE164(phone: string, defaultCC: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0'))  return defaultCC + digits.slice(1)
  if (digits.length <= 9)      return defaultCC + digits
  return digits
}

/* ── Core sender ─────────────────────────────────────────────────────────── */

export interface WhatsAppSendResult {
  ok:     boolean
  error?: string
}

async function sendViaMetaCloudApi(
  to:           string,
  templateName: WhatsAppTemplate,
  variables:    string[],
  cfg: { accessToken: string; phoneNumberId: string; defaultCC: string }
): Promise<WhatsAppSendResult> {
  const e164 = toE164(to, cfg.defaultCC)

  const body = {
    messaging_product: 'whatsapp',
    to:                e164,
    type:              'template',
    template: {
      name:     templateName,
      language: { code: 'en' },
      components: variables.length ? [
        {
          type:       'body',
          parameters: variables.map(v => ({ type: 'text', text: v })),
        },
      ] : [],
    },
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${cfg.phoneNumberId}/messages`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${cfg.accessToken}`,
        },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as any
      return { ok: false, error: j?.error?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

/* ── Public send ─────────────────────────────────────────────────────────── */

/**
 * Send a WhatsApp message using a pre-approved template.
 * Silent no-op (returns {ok:false}) when:
 *   - WhatsApp globally disabled in developer settings
 *   - The specific template's toggle is off
 *   - Credentials not configured
 * Never throws.
 */
export async function sendWhatsApp(
  toPhone:  string,
  template: WhatsAppTemplate,
  vars:     string[]
): Promise<WhatsAppSendResult> {
  if (!toPhone?.trim()) return { ok: false, error: 'No phone number' }

  let cfg: Awaited<ReturnType<typeof getDeveloperSettingsByCategory>>
  try {
    cfg = await getDeveloperSettingsByCategory('whatsapp')
  } catch {
    return { ok: false, error: 'Failed to load WhatsApp config' }
  }

  if (!getBool(cfg, 'enabled')) return { ok: false, error: 'WhatsApp disabled' }

  // Per-template toggle — only skip if explicitly set to 'false'
  if (cfg[`template_${template}_enabled`]?.key_value === 'false') {
    return { ok: false, error: `Template ${template} disabled` }
  }

  const accessToken   = getVal(cfg, 'access_token')
  const phoneNumberId = getVal(cfg, 'phone_number_id')
  const defaultCC     = getVal(cfg, 'default_country_code', '966')

  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp not configured (missing credentials)' }
  }

  return sendViaMetaCloudApi(toPhone, template, vars, { accessToken, phoneNumberId, defaultCC })
}

/* ── Template helpers ────────────────────────────────────────────────────── */
// Each helper maps to one approved template. Variables follow the order shown
// in the Twilio Content Template screenshots.

export const wa = {

  /** Nurse: new booking request
   * {{1}} nurse_name  {{2}} patient_name  {{3}} service
   * {{4}} date        {{5}} shift          {{6}} booking_id */
  nurseNewBookingAlert: (phone: string, p: {
    nurseName: string; patientName: string; service: string
    date: string; shift: string; bookingId: string
  }) => sendWhatsApp(phone, 'nurse_new_booking_alert', [
    p.nurseName, p.patientName, p.service, p.date, p.shift, p.bookingId,
  ]),

  /** Patient: payment deadline warning
   * {{1}} patient_name  {{2}} booking_id  {{3}} hours_remaining
   * {{4}} service       {{5}} nurse_name  {{6}} date */
  paymentDeadlineReminder: (phone: string, p: {
    patientName: string; bookingId: string; hours: string
    service: string; nurseName: string; date: string
  }) => sendWhatsApp(phone, 'payment_deadline_reminder', [
    p.patientName, p.bookingId, p.hours, p.service, p.nurseName, p.date,
  ]),

  /** Patient: booking cancelled confirmation
   * {{1}} patient_name  {{2}} booking_id  {{3}} service  {{4}} date */
  bookingCancelledPatient: (phone: string, p: {
    patientName: string; bookingId: string; service: string; date: string
  }) => sendWhatsApp(phone, 'booking_cancelled_patient', [
    p.patientName, p.bookingId, p.service, p.date,
  ]),

  /** Patient: welcome after registration
   * {{1}} patient_name */
  patientWelcome: (phone: string, name: string) =>
    sendWhatsApp(phone, 'patient_welcome', [name]),

  /** Patient: payment received + booking confirmed
   * {{1}} patient_name  {{2}} booking_id  {{3}} service
   * {{4}} nurse_name    {{5}} date         {{6}} shift */
  paymentConfirmedPatient: (phone: string, p: {
    patientName: string; bookingId: string; service: string
    nurseName: string; date: string; shift: string
  }) => sendWhatsApp(phone, 'payment_confirmed_patient', [
    p.patientName, p.bookingId, p.service, p.nurseName, p.date, p.shift,
  ]),

  /** Patient: booking submitted (awaiting payment)
   * {{1}} patient_name  {{2}} service   {{3}} nurse_name
   * {{4}} date          {{5}} shift      {{6}} booking_id  {{7}} payment_hours */
  bookingSubmitted: (phone: string, p: {
    patientName: string; service: string; nurseName: string
    date: string; shift: string; bookingId: string; paymentHours: string
  }) => sendWhatsApp(phone, 'booking_submitted', [
    p.patientName, p.service, p.nurseName, p.date, p.shift, p.bookingId, p.paymentHours,
  ]),

  /** Nurse: notified when patient cancels
   * {{1}} nurse_name  {{2}} patient_name  {{3}} service  {{4}} date  {{5}} booking_id */
  bookingCancelledNurse: (phone: string, p: {
    nurseName: string; patientName: string; service: string; date: string; bookingId: string
  }) => sendWhatsApp(phone, 'booking_cancelled_nurse', [
    p.nurseName, p.patientName, p.service, p.date, p.bookingId,
  ]),

  /** Nurse: application rejected
   * {{1}} nurse_name  {{2}} rejection_reason */
  nurseRejected: (phone: string, p: { nurseName: string; reason: string }) =>
    sendWhatsApp(phone, 'nurse_rejected', [p.nurseName, p.reason]),

  /** Hospital: staffing request received and confirmed
   * {{1}} contact_name  {{2}} service         {{3}} nurses_required
   * {{4}} start_date    {{5}} end_date          {{6}} request_id */
  hospitalRequestConfirmed: (phone: string, p: {
    contactName: string; service: string; nursesRequired: string
    startDate: string; endDate: string; requestId: string
  }) => sendWhatsApp(phone, 'hospital_request_confirmed', [
    p.contactName, p.service, p.nursesRequired, p.startDate, p.endDate, p.requestId,
  ]),

  /** Hospital: nurses have been assigned
   * {{1}} contact_name  {{2}} request_id  {{3}} service
   * {{4}} nurses_count  {{5}} start_date */
  hospitalNursesAssigned: (phone: string, p: {
    contactName: string; requestId: string; service: string
    nursesAssigned: string; startDate: string
  }) => sendWhatsApp(phone, 'hospital_nurses_assigned', [
    p.contactName, p.requestId, p.service, p.nursesAssigned, p.startDate,
  ]),
}
