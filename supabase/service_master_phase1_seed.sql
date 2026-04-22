-- ============================================================
-- Service Master Phase 1 — Seed Data
-- Run AFTER service_master_phase1_migration.sql
-- Uses INSERT ... ON CONFLICT DO NOTHING — safe to re-run
-- ============================================================

-- ── Categories ───────────────────────────────────────────────

INSERT INTO service_categories (name, description, icon, sort_order, is_active) VALUES
  ('Wound Care',       'Dressing changes, wound cleaning, suture care',              '🩹', 10, true),
  ('IV & Injections',  'IV cannula insertion, injections, infusion therapy',         '💉', 20, true),
  ('Elderly Care',     'Personal hygiene, mobility assistance, daily living support','👴', 30, true),
  ('Post-Op Care',     'Post-surgical monitoring, drain management, rehabilitation', '🏥', 40, true),
  ('Mother & Baby',    'Postpartum care, newborn bathing, lactation support',        '👶', 50, true),
  ('Physiotherapy',    'Exercises, mobility training, pain management',              '🦽', 60, true),
  ('Medical Monitoring','Vital signs, blood sugar, blood pressure monitoring',       '📊', 70, true),
  ('Palliative Care',  'Comfort care, pain management for terminal illness',         '🕊️', 80, true)
ON CONFLICT (name) DO NOTHING;

-- ── Services ─────────────────────────────────────────────────
-- Prices in SAR. base_price = suggested; min_price = floor; max_price = ceiling.

-- Wound Care
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Wound Dressing (Simple)',  'Basic wound cleaning and dressing change',              150, 100, 300,  30, false, true, 10 FROM service_categories c WHERE c.name = 'Wound Care' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Wound Dressing (Complex)', 'Deep wounds, surgical sites, multi-layer dressing',    250, 180, 450,  45, true,  true, 20 FROM service_categories c WHERE c.name = 'Wound Care' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Suture Removal',           'Removal of stitches and wound assessment',              120,  80, 250,  20, false, true, 30 FROM service_categories c WHERE c.name = 'Wound Care' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Stoma Care',               'Ostomy bag change and skin care around stoma',          300, 200, 500,  40, true,  true, 40 FROM service_categories c WHERE c.name = 'Wound Care' ON CONFLICT DO NOTHING;

-- IV & Injections
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'IV Cannula Insertion',     'Peripheral IV line insertion and securing',             200, 150, 400,  20, true,  true, 10 FROM service_categories c WHERE c.name = 'IV & Injections' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'IV Infusion Therapy',      'Administering IV fluids or medications per session',    350, 250, 600,  60, true,  true, 20 FROM service_categories c WHERE c.name = 'IV & Injections' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Intramuscular Injection',  'IM injection (antibiotics, vitamins, etc.)',            100,  70, 200,  10, false, true, 30 FROM service_categories c WHERE c.name = 'IV & Injections' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Subcutaneous Injection',   'SC injection (insulin, heparin, etc.)',                  80,  60, 180,  10, false, true, 40 FROM service_categories c WHERE c.name = 'IV & Injections' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Catheter Insertion',       'Urinary catheter insertion and initial care',           300, 220, 500,  30, true,  true, 50 FROM service_categories c WHERE c.name = 'IV & Injections' ON CONFLICT DO NOTHING;

-- Elderly Care
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Personal Hygiene Assist',  'Full bed bath, grooming, and hygiene for bedridden patients', 200, 150, 350, 60, false, true, 10 FROM service_categories c WHERE c.name = 'Elderly Care' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Mobility & Positioning',  'Repositioning to prevent bedsores, mobility exercises',  150, 100, 300,  45, false, true, 20 FROM service_categories c WHERE c.name = 'Elderly Care' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Medication Management',   'Medication administration and compliance tracking',       150, 100, 280,  30, false, true, 30 FROM service_categories c WHERE c.name = 'Elderly Care' ON CONFLICT DO NOTHING;

-- Post-Op Care
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Post-Surgery Monitoring', 'Vital signs, pain assessment, drain check after surgery',250, 180, 450,  60, false, true, 10 FROM service_categories c WHERE c.name = 'Post-Op Care' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Drain Management',        'Surgical drain care, output measurement, site dressing', 200, 150, 380,  40, true,  true, 20 FROM service_categories c WHERE c.name = 'Post-Op Care' ON CONFLICT DO NOTHING;

-- Mother & Baby
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Postpartum Home Visit',   'Mother and newborn assessment after delivery',           350, 250, 600,  90, false, true, 10 FROM service_categories c WHERE c.name = 'Mother & Baby' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Newborn Bathing',         'First bath guidance and baby hygiene instruction',        200, 150, 350,  45, false, true, 20 FROM service_categories c WHERE c.name = 'Mother & Baby' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Lactation Support',       'Breastfeeding technique, positioning, and guidance',     300, 200, 500,  60, false, true, 30 FROM service_categories c WHERE c.name = 'Mother & Baby' ON CONFLICT DO NOTHING;

-- Medical Monitoring
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Vital Signs Monitoring',  'Temperature, BP, HR, O2 saturation check',              100,  70, 200,  20, false, true, 10 FROM service_categories c WHERE c.name = 'Medical Monitoring' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Blood Sugar Monitoring',  'Blood glucose testing and trend recording',              100,  70, 200,  15, false, true, 20 FROM service_categories c WHERE c.name = 'Medical Monitoring' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'ECG Recording',           'Bedside 12-lead ECG with initial interpretation',        350, 250, 600,  30, true,  true, 30 FROM service_categories c WHERE c.name = 'Medical Monitoring' ON CONFLICT DO NOTHING;

-- Physiotherapy
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Physiotherapy Session',   'Targeted exercise and mobility therapy session',         400, 300, 700,  60, false, true, 10 FROM service_categories c WHERE c.name = 'Physiotherapy' ON CONFLICT DO NOTHING;
INSERT INTO services (category_id, name, description, base_price, min_price, max_price, duration_minutes, requires_equipment, is_active, sort_order)
SELECT c.id, 'Chest Physiotherapy',     'Breathing exercises and airway clearance techniques',    350, 250, 600,  45, false, true, 20 FROM service_categories c WHERE c.name = 'Physiotherapy' ON CONFLICT DO NOTHING;
