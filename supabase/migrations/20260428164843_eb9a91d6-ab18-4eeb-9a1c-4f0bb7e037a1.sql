-- Cover photo column for all users
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- Public bucket for cover banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-covers', 'profile-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (idempotent via DROP IF EXISTS)
DROP POLICY IF EXISTS "Cover photos are publicly readable" ON storage.objects;
CREATE POLICY "Cover photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-covers');

DROP POLICY IF EXISTS "Users upload their own cover" ON storage.objects;
CREATE POLICY "Users upload their own cover"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users update their own cover" ON storage.objects;
CREATE POLICY "Users update their own cover"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete their own cover" ON storage.objects;
CREATE POLICY "Users delete their own cover"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);