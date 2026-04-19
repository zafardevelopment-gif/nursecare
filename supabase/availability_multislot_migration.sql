-- Migration: add slot_group column to nurse_availability for multi-range grouping
ALTER TABLE nurse_availability ADD COLUMN IF NOT EXISTS slot_group text;
