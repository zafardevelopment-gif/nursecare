-- Migration: add custom_start_time and custom_end_time to hospital_booking_requests
-- Run this in Supabase SQL editor

ALTER TABLE hospital_booking_requests
  ADD COLUMN IF NOT EXISTS custom_start_time text,
  ADD COLUMN IF NOT EXISTS custom_end_time text;
