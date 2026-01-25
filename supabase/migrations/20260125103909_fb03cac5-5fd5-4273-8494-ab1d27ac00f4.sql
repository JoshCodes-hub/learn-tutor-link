-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Tutors can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'question-images' 
  AND auth.role() = 'authenticated'
);

-- Allow anyone to view question images (public bucket)
CREATE POLICY "Anyone can view question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Allow tutors to update their own images
CREATE POLICY "Tutors can update their question images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'question-images' 
  AND auth.role() = 'authenticated'
);

-- Allow tutors to delete their own images
CREATE POLICY "Tutors can delete their question images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'question-images' 
  AND auth.role() = 'authenticated'
);