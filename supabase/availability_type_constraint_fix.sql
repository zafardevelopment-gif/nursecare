-- Fix: add weekly_time and date_range to nurse_availability type check
-- Run this in Supabase SQL editor

ALTER TABLE nurse_availability
  DROP CONSTRAINT IF EXISTS nurse_availability_availability_type_check;

ALTER TABLE nurse_availability
  ADD CONSTRAINT nurse_availability_availability_type_check
  CHECK (availability_type IN ('specific', 'recurring', 'flexible', 'date_range', 'weekly_time'));

-- Add slot_group column if not already added
ALTER TABLE nurse_availability ADD COLUMN IF NOT EXISTS slot_group text;
