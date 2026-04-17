-- Add license expiry, ID type/number/expiry to nurses table
ALTER TABLE nurses
  ADD COLUMN IF NOT EXISTS license_expiry   date,
  ADD COLUMN IF NOT EXISTS id_type          text,   -- 'iqama' | 'national_id' | 'passport'
  ADD COLUMN IF NOT EXISTS id_number        text,
  ADD COLUMN IF NOT EXISTS id_expiry        date;
