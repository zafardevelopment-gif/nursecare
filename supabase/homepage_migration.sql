-- ============================================================
-- NurseCare+ Homepage Dynamic Content Migration
-- ============================================================

-- 1. General / Hero Settings
CREATE TABLE IF NOT EXISTS homepage_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text UNIQUE NOT NULL,
  value         text,
  updated_at    timestamptz DEFAULT now()
);

-- Seed defaults
INSERT INTO homepage_settings (key, value) VALUES
  ('hero_badge',           'Saudi Arabia''s #1 Home Healthcare Platform'),
  ('hero_heading_line1',   'Trusted Home'),
  ('hero_heading_line2',   'Healthcare'),
  ('hero_heading_line3',   'On Demand'),
  ('hero_subheading',      'Connect with MOH-licensed nurses, post-surgery specialists, and home care professionals. Book verified care for yourself or loved ones — in minutes.'),
  ('hero_cta1_text',       'Book a Nurse →'),
  ('hero_cta1_link',       '/auth/login'),
  ('hero_cta2_text',       'Join as Nurse ↗'),
  ('hero_cta2_link',       '/auth/login'),
  ('hero_stat1_num',       '1,200+'),
  ('hero_stat1_label',     'Verified Nurses'),
  ('hero_stat2_num',       '25,000+'),
  ('hero_stat2_label',     'Sessions Completed'),
  ('hero_stat3_num',       '4.9★'),
  ('hero_stat3_label',     'Average Rating'),
  ('hero_enabled',         'true'),
  ('site_title',           'NurseCare+ | Saudi Arabia''s Home Healthcare Platform'),
  ('meta_description',     'Book verified, MOH-licensed nurses for home care across Saudi Arabia. Same-day booking available.'),
  ('meta_keywords',        'home nursing saudi arabia, home healthcare, nurse booking, riyadh nurse'),
  ('og_image',             ''),
  ('footer_about',         'Saudi Arabia''s trusted home healthcare marketplace. Connecting patients with verified, licensed nursing professionals since 2024.'),
  ('footer_email',         'support@nursecare.sa'),
  ('footer_phone',         '+966 11 000 0000'),
  ('footer_copyright',     '© 2025 NurseCare+. All rights reserved.'),
  ('footer_twitter',       ''),
  ('footer_instagram',     ''),
  ('footer_linkedin',      ''),
  ('stats_nurses_label',   'Verified Nurses'),
  ('stats_patients_label', 'Happy Patients'),
  ('stats_bookings_label', 'Sessions Completed'),
  ('stats_cities_label',   'Cities Covered'),
  ('stats_cities_value',   '12')
ON CONFLICT (key) DO NOTHING;

-- 2. Homepage Sections (feature cards — "Why Choose Us")
CREATE TABLE IF NOT EXISTS homepage_sections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key  text NOT NULL,          -- 'features', 'how_it_works', etc.
  icon         text,
  title        text NOT NULL,
  description  text,
  sort_order   int DEFAULT 0,
  enabled      boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

INSERT INTO homepage_sections (section_key, icon, title, description, sort_order) VALUES
  ('features', '🛡️', 'Verified & Licensed',      'Every nurse undergoes rigorous background checks, license verification, and skills assessment before approval.',                              1),
  ('features', '⏱️', 'On-Demand Booking',         'Book same-day or schedule in advance. Our smart availability system ensures you always find care when you need it.',                       2),
  ('features', '📍', 'Location-Based Matching',   'Get matched with certified nurses in your city. We cover Riyadh, Jeddah, Dammam, and more cities across KSA.',                            3),
  ('features', '💬', 'Real-Time Messaging',        'Communicate directly with your care provider through our secure in-app messaging before and after visits.',                                4),
  ('features', '💳', 'Transparent Pricing',        'See full pricing upfront with no hidden fees. Compare rates across providers and choose what fits your budget.',                           5),
  ('features', '📋', 'Care Documentation',         'Access visit summaries, care plans, and medical notes digitally. Share with your doctor anytime.',                                        6),
  ('how_it_works', '🔍', 'Search Providers',       'Browse verified nurses and healthcare professionals by specialty, location, and availability.',                                            1),
  ('how_it_works', '👤', 'View Profiles',          'Read reviews, check qualifications, certifications, and service rates before booking.',                                                   2),
  ('how_it_works', '📅', 'Book a Session',         'Choose your preferred date, time slot, and service type in just a few taps.',                                                             3),
  ('how_it_works', '✅', 'Nurse Confirms',          'Your assigned nurse reviews and confirms the appointment within minutes.',                                                                4),
  ('how_it_works', '🏥', 'Receive Care',            'Enjoy professional, compassionate home healthcare at your preferred location.',                                                           5),
  ('how_it_works', '⭐', 'Rate & Review',           'Share your experience to help others find the best care providers.',                                                                      6),
  ('how_it_works', '🔁', 'Rebook Easily',           'Save your favorite providers and rebook with a single tap for ongoing care.',                                                            7)
ON CONFLICT DO NOTHING;

-- 3. Services / Specialties
CREATE TABLE IF NOT EXISTS homepage_services (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon        text,
  name        text NOT NULL,
  description text,
  sort_order  int DEFAULT 0,
  enabled     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO homepage_services (icon, name, description, sort_order) VALUES
  ('🩺', 'General Nursing',   'Comprehensive home nursing care',       1),
  ('❤️', 'Cardiac Care',      'Specialist heart care at home',         2),
  ('🧠', 'Neurology',          'Neurological support and monitoring',   3),
  ('👶', 'Pediatric Care',     'Expert care for infants and children',  4),
  ('🦴', 'Orthopedic',         'Post-surgery orthopedic recovery',      5),
  ('🩻', 'Post-Surgery',       'Recovery care after operations',        6),
  ('🩹', 'Wound Care',         'Professional wound dressing & care',    7),
  ('💊', 'IV Therapy',         'Intravenous therapy at home',           8)
ON CONFLICT DO NOTHING;

-- 4. Testimonials
CREATE TABLE IF NOT EXISTS homepage_testimonials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stars       int DEFAULT 5 CHECK (stars BETWEEN 1 AND 5),
  text        text NOT NULL,
  author_name text NOT NULL,
  author_role text,
  author_emoji text DEFAULT '👤',
  sort_order  int DEFAULT 0,
  enabled     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO homepage_testimonials (stars, text, author_name, author_role, author_emoji, sort_order) VALUES
  (5, 'NurseCare+ made finding post-surgery home care incredibly easy. The nurse was professional, punctual, and genuinely caring. Highly recommend.',       'Abdullah Al-Otaibi', 'Patient — Riyadh',         '👨',     1),
  (5, 'As a hospital administrator, NurseCare+ has transformed how we fill urgent shifts. The platform is fast, reliable, and the nurses are well-vetted.', 'Dr. Layla Al-Shehri', 'Hospital Admin — Jeddah', '👩',    2),
  (5, 'I''ve been a registered nurse for 7 years. This platform gave me flexibility to work on my own schedule while still serving patients who need me.',    'Nurse Rania Khalid', 'Certified Nurse — Dammam', '👩‍⚕️', 3)
ON CONFLICT DO NOTHING;

-- 5. FAQs
CREATE TABLE IF NOT EXISTS homepage_faqs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question    text NOT NULL,
  answer      text NOT NULL,
  sort_order  int DEFAULT 0,
  enabled     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO homepage_faqs (question, answer, sort_order) VALUES
  ('How do I book a nurse?',                    'Simply sign up, search for a nurse by specialty and city, and book a slot in minutes. You''ll receive confirmation instantly.',                  1),
  ('Are all nurses verified?',                  'Yes. Every nurse on NurseCare+ goes through MOH license verification, background checks, and skills assessment before being approved.',          2),
  ('How much does it cost?',                    'Pricing varies by nurse specialty, experience, and session type. All rates are displayed upfront — no hidden fees.',                            3),
  ('Can I book same-day care?',                 'Yes, subject to nurse availability. Many of our providers offer same-day and next-hour booking.',                                               4),
  ('What cities do you cover?',                 'We cover Riyadh, Jeddah, Dammam, Mecca, Medina, and many more cities across Saudi Arabia.',                                                    5),
  ('Is my payment secure?',                     'Absolutely. All transactions are encrypted and processed through secure payment gateways. You only pay once care is confirmed.',               6)
ON CONFLICT DO NOTHING;

-- 6. Featured Providers (admin manually selects)
CREATE TABLE IF NOT EXISTS homepage_featured_providers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  priority     int DEFAULT 0,
  enabled      boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(nurse_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE homepage_settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections            ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_testimonials        ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_faqs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_featured_providers  ENABLE ROW LEVEL SECURITY;

-- Public can read all homepage content
CREATE POLICY "public_read_homepage_settings"   ON homepage_settings           FOR SELECT USING (true);
CREATE POLICY "public_read_homepage_sections"   ON homepage_sections           FOR SELECT USING (true);
CREATE POLICY "public_read_homepage_services"   ON homepage_services           FOR SELECT USING (true);
CREATE POLICY "public_read_homepage_testimonials" ON homepage_testimonials      FOR SELECT USING (true);
CREATE POLICY "public_read_homepage_faqs"       ON homepage_faqs               FOR SELECT USING (true);
CREATE POLICY "public_read_homepage_featured"   ON homepage_featured_providers FOR SELECT USING (true);

-- Service role (admin) can do everything
CREATE POLICY "service_all_homepage_settings"   ON homepage_settings           FOR ALL USING (true);
CREATE POLICY "service_all_homepage_sections"   ON homepage_sections           FOR ALL USING (true);
CREATE POLICY "service_all_homepage_services"   ON homepage_services           FOR ALL USING (true);
CREATE POLICY "service_all_homepage_testimonials" ON homepage_testimonials      FOR ALL USING (true);
CREATE POLICY "service_all_homepage_faqs"       ON homepage_faqs               FOR ALL USING (true);
CREATE POLICY "service_all_homepage_featured"   ON homepage_featured_providers FOR ALL USING (true);
