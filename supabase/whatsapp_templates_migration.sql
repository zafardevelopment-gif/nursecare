-- WhatsApp per-template toggle settings
-- Run this migration to seed the 10 template on/off flags in developer_settings.
-- All default to enabled (true). Admins can toggle each off individually via
-- the Developer → WhatsApp tab in admin settings.

INSERT INTO developer_settings (category, key_name, key_value, description, is_sensitive, is_active)
VALUES
  ('whatsapp', 'template_nurse_new_booking_alert_enabled',    'true', 'Send WhatsApp to nurse when patient submits a booking request',             false, true),
  ('whatsapp', 'template_payment_deadline_reminder_enabled',  'true', 'Send WhatsApp to patient when payment deadline is approaching',             false, true),
  ('whatsapp', 'template_booking_cancelled_patient_enabled',  'true', 'Send WhatsApp to patient when their booking is cancelled',                 false, true),
  ('whatsapp', 'template_patient_welcome_enabled',            'true', 'Send WhatsApp welcome message when a new patient registers',               false, true),
  ('whatsapp', 'template_payment_confirmed_patient_enabled',  'true', 'Send WhatsApp to patient when payment is received and booking confirmed',  false, true),
  ('whatsapp', 'template_booking_submitted_enabled',          'true', 'Send WhatsApp to patient after booking is placed (awaiting payment)',      false, true),
  ('whatsapp', 'template_booking_cancelled_nurse_enabled',    'true', 'Send WhatsApp to nurse when a patient cancels their booking',             false, true),
  ('whatsapp', 'template_nurse_rejected_enabled',             'true', 'Send WhatsApp to nurse when their application is rejected by admin',      false, true),
  ('whatsapp', 'template_hospital_request_confirmed_enabled', 'true', 'Send WhatsApp to hospital when staffing request is received',             false, true),
  ('whatsapp', 'template_hospital_nurses_assigned_enabled',   'true', 'Send WhatsApp to hospital when nurses are assigned to their request',     false, true)
ON CONFLICT (category, key_name) DO NOTHING;
