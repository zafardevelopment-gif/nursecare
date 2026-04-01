-- Add chat_enabled flag to platform_settings
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS chat_enabled boolean NOT NULL DEFAULT true;
