
-- Link flashcards to courses/topics (optional)
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_flashcards_course ON public.flashcards(course_id);

-- Course images / supplementary materials
CREATE TABLE IF NOT EXISTS public.course_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL,
  url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_images_course ON public.course_images(course_id);
ALTER TABLE public.course_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed views course images" ON public.course_images
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tutors manage own course images" ON public.course_images
  FOR ALL TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- AI generation history
CREATE TABLE IF NOT EXISTS public.ai_generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid,
  resource_label text,
  kind text NOT NULL CHECK (kind IN ('quiz','flashcards','summary','audio')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('processing','completed','failed','cancelled')),
  output_ref text,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_gen_user ON public.ai_generation_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gen_resource ON public.ai_generation_history(resource_id);
ALTER TABLE public.ai_generation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai history" ON public.ai_generation_history
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage bucket for course images (idempotent)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('course-images','course-images', true)
  ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "course-images public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'course-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "course-images tutor write" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'course-images' AND auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "course-images owner delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'course-images' AND owner = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
