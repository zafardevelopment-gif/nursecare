-- ============================================================
-- Digital Agreement System Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Agreement Templates (admin creates/edits these)
CREATE TABLE IF NOT EXISTS agreement_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  content       text NOT NULL,           -- plain text with {{placeholders}}
  logo_url      text,                    -- selected logo for this template
  is_active     boolean NOT NULL DEFAULT true,
  version       integer NOT NULL DEFAULT 1,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. Template Logos (admin uploads multiple logos)
CREATE TABLE IF NOT EXISTS agreement_logos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,             -- e.g. "NurseCare Logo", "Hospital Logo"
  file_url    text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Generated Agreements (one per nurse+hospital pair)
CREATE TABLE IF NOT EXISTS agreements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid REFERENCES agreement_templates(id),
  template_version integer NOT NULL DEFAULT 1,
  nurse_id        uuid REFERENCES nurses(id) ON DELETE CASCADE,
  hospital_id     uuid REFERENCES users(id),      -- hospital user
  title           text NOT NULL,
  template_content text,                          -- snapshot of template content at generation time
  rendered_html   text NOT NULL,                  -- final HTML at time of generation
  logo_url        text,
  status          text NOT NULL DEFAULT 'pending' -- pending | nurse_approved | hospital_approved | fully_approved
    CHECK (status IN ('pending','nurse_approved','hospital_approved','fully_approved')),
  -- Nurse approval
  nurse_approved_at   timestamptz,
  nurse_approved_by   uuid REFERENCES auth.users(id),
  -- Hospital approval
  hospital_approved_at timestamptz,
  hospital_approved_by  uuid REFERENCES auth.users(id),
  -- Meta
  generated_by    uuid REFERENCES auth.users(id),
  generated_at    timestamptz NOT NULL DEFAULT now(),
  locked_at       timestamptz,                    -- set when fully_approved
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_agreements_nurse    ON agreements(nurse_id);
CREATE INDEX IF NOT EXISTS idx_agreements_hospital ON agreements(hospital_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status   ON agreements(status);

-- 5. RLS Policies
ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_logos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements          ENABLE ROW LEVEL SECURITY;

-- Templates: admin full access, others read active only
CREATE POLICY "templates_admin_all" ON agreement_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "templates_read_active" ON agreement_templates
  FOR SELECT USING (is_active = true);

-- Logos: admin full access, others read
CREATE POLICY "logos_admin_all" ON agreement_logos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "logos_read_all" ON agreement_logos
  FOR SELECT USING (auth.role() = 'authenticated');

-- Agreements: admin full access; nurse/hospital can only read their own + approve
CREATE POLICY "agreements_admin_all" ON agreements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "agreements_nurse_read" ON agreements
  FOR SELECT USING (
    nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid())
  );
CREATE POLICY "agreements_hospital_read" ON agreements
  FOR SELECT USING (hospital_id = auth.uid());

-- Nurse can only update their approval fields
CREATE POLICY "agreements_nurse_approve" ON agreements
  FOR UPDATE USING (
    nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid())
    AND status IN ('pending', 'hospital_approved')
    -- nurse cannot touch hospital fields or rendered_html
  );

-- Hospital can only update their approval fields
CREATE POLICY "agreements_hospital_approve" ON agreements
  FOR UPDATE USING (hospital_id = auth.uid())
  WITH CHECK (
    hospital_id = auth.uid()
    AND status IN ('pending', 'nurse_approved')
  );

-- Storage bucket for logos (create manually in dashboard if not exists)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('agreement-logos', 'agreement-logos', true)
-- ON CONFLICT DO NOTHING;

-- Migration: add template_content snapshot column if running on existing DB
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS template_content text;
