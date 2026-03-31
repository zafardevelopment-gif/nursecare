-- ============================================================
-- Fix 1: nurse_documents RLS policies
-- ============================================================

-- Enable RLS
ALTER TABLE nurse_documents ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start clean
DROP POLICY IF EXISTS "nurse_documents_select" ON nurse_documents;
DROP POLICY IF EXISTS "nurse_documents_insert" ON nurse_documents;
DROP POLICY IF EXISTS "nurse_documents_delete" ON nurse_documents;
DROP POLICY IF EXISTS "nurse_documents_update" ON nurse_documents;

-- Provider can SELECT their own documents
CREATE POLICY "nurse_documents_select" ON nurse_documents
  FOR SELECT USING (
    nurse_id IN (
      SELECT id FROM nurses WHERE user_id = auth.uid()
    )
  );

-- Provider can INSERT their own documents
CREATE POLICY "nurse_documents_insert" ON nurse_documents
  FOR INSERT WITH CHECK (
    nurse_id IN (
      SELECT id FROM nurses WHERE user_id = auth.uid()
    )
  );

-- Provider can DELETE their own documents
CREATE POLICY "nurse_documents_delete" ON nurse_documents
  FOR DELETE USING (
    nurse_id IN (
      SELECT id FROM nurses WHERE user_id = auth.uid()
    )
  );

-- Admin can do everything
CREATE POLICY "nurse_documents_admin_all" ON nurse_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- Fix 2: nurses table RLS (needed for nurse_id lookup above)
-- ============================================================

ALTER TABLE nurses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nurses_select_own" ON nurses;
DROP POLICY IF EXISTS "nurses_insert_own" ON nurses;
DROP POLICY IF EXISTS "nurses_update_own" ON nurses;
DROP POLICY IF EXISTS "nurses_admin_all"  ON nurses;

-- Provider can see their own row
CREATE POLICY "nurses_select_own" ON nurses
  FOR SELECT USING (user_id = auth.uid());

-- Provider can insert their own row
CREATE POLICY "nurses_insert_own" ON nurses
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Provider can update their own row
CREATE POLICY "nurses_update_own" ON nurses
  FOR UPDATE USING (user_id = auth.uid());

-- Admin can do everything
CREATE POLICY "nurses_admin_all" ON nurses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- Fix 3: Storage bucket policies for nurse-documents
-- ============================================================

-- Drop existing storage policies if any
DROP POLICY IF EXISTS "nurse_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "nurse_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "nurse_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "nurse_docs_delete" ON storage.objects;

-- Public read (bucket is public)
CREATE POLICY "nurse_docs_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'nurse-documents');

-- Authenticated users can upload
CREATE POLICY "nurse_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'nurse-documents'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can update (upsert)
CREATE POLICY "nurse_docs_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'nurse-documents'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can delete
CREATE POLICY "nurse_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'nurse-documents'
    AND auth.role() = 'authenticated'
  );
