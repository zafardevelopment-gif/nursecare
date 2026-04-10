-- Add privacy and pricing display settings to platform_settings
-- Run this in Supabase SQL Editor → https://supabase.com/dashboard → SQL Editor

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS share_provider_phone_with_patient boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_hospital_contracts           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_price_with_commission        boolean NOT NULL DEFAULT true;

-- Set sensible defaults on existing row
UPDATE platform_settings SET
  share_provider_phone_with_patient = COALESCE(share_provider_phone_with_patient, false),
  show_hospital_contracts           = COALESCE(show_hospital_contracts, true),
  show_price_with_commission        = COALESCE(show_price_with_commission, true)
WHERE id IS NOT NULL;

-- Verify
SELECT id, share_provider_phone_with_patient, show_hospital_contracts, show_price_with_commission
FROM platform_settings LIMIT 1;
