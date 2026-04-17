-- Add nurse approval toggle and on-the-way feature
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS require_nurse_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS on_the_way_enabled     boolean NOT NULL DEFAULT true;
