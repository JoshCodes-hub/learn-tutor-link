-- Create storage bucket for tutor profile images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tutor-profiles', 'tutor-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for the bucket
CREATE POLICY "Anyone can view tutor profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tutor-profiles');

CREATE POLICY "Authenticated users can upload their profile image"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tutor-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile image"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tutor-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile image"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tutor-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add profile_image_url to tutor_applications
ALTER TABLE public.tutor_applications 
ADD COLUMN IF NOT EXISTS profile_image_url text;

-- Add profile_image_url to profiles table for approved tutors
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_image_url text;