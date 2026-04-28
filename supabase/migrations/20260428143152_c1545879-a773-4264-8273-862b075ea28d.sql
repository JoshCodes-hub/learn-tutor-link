-- School branding: brand color + report footer
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#1e3a8a',
  ADD COLUMN IF NOT EXISTS report_footer text;

-- Public bucket for school logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read logos (they appear on report cards)
DO $$ BEGIN
  CREATE POLICY "school_logos_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'school-logos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated users can upload to school-logos (RLS on schools table gates who actually owns one)
DO $$ BEGIN
  CREATE POLICY "school_logos_auth_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'school-logos' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "school_logos_auth_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'school-logos' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "school_logos_auth_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'school-logos' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;