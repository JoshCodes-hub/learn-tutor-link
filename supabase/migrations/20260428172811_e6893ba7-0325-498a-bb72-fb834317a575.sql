ALTER TABLE public.tutor_applications
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS gov_id_url text,
  ADD COLUMN IF NOT EXISTS highest_qualification text,
  ADD COLUMN IF NOT EXISTS institution text,
  ADD COLUMN IF NOT EXISTS certificate_url text,
  ADD COLUMN IF NOT EXISTS subjects_taught text[],
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS current_position text,
  ADD COLUMN IF NOT EXISTS why_join text,
  ADD COLUMN IF NOT EXISTS sample_question_1 text,
  ADD COLUMN IF NOT EXISTS sample_question_2 text,
  ADD COLUMN IF NOT EXISTS sample_question_3 text,
  ADD COLUMN IF NOT EXISTS sample_explanation text,
  ADD COLUMN IF NOT EXISTS sample_video_url text;

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS established_year integer,
  ADD COLUMN IF NOT EXISTS approval_letter_url text,
  ADD COLUMN IF NOT EXISTS cac_document_url text,
  ADD COLUMN IF NOT EXISTS principal_phone text,
  ADD COLUMN IF NOT EXISTS owner_id_url text,
  ADD COLUMN IF NOT EXISTS official_email text,
  ADD COLUMN IF NOT EXISTS official_phone text,
  ADD COLUMN IF NOT EXISTS student_count integer,
  ADD COLUMN IF NOT EXISTS classes_offered text[],
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS social_link text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own application docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'application-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own application docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'application-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update their own application docs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'application-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own application docs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'application-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
