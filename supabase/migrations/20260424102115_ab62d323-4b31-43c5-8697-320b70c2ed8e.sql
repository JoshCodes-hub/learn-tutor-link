-- Study materials table
CREATE TABLE public.study_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  topic_id UUID,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_study_materials_course ON public.study_materials(course_id);
CREATE INDEX idx_study_materials_owner ON public.study_materials(owner_id);
CREATE INDEX idx_study_materials_visibility ON public.study_materials(visibility);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views public materials"
  ON public.study_materials FOR SELECT
  USING (visibility = 'public' OR owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tutors upload public; students upload private"
  ON public.study_materials FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      (visibility = 'public' AND (has_role(auth.uid(), 'tutor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
      OR
      (visibility = 'private')
    )
  );

CREATE POLICY "Owners update own materials"
  ON public.study_materials FOR UPDATE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners delete own materials"
  ON public.study_materials FOR DELETE
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_study_materials_updated
  BEFORE UPDATE ON public.study_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cached AI artifacts per material
CREATE TABLE public.study_material_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.study_materials(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('summary','key_points','flashcards','likely_questions')),
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (material_id, kind)
);
CREATE INDEX idx_artifacts_material ON public.study_material_artifacts(material_id);

ALTER TABLE public.study_material_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View artifacts when material accessible"
  ON public.study_material_artifacts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.study_materials m
    WHERE m.id = study_material_artifacts.material_id
      AND (m.visibility = 'public' OR m.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Insert artifacts for own materials"
  ON public.study_material_artifacts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.study_materials m
    WHERE m.id = study_material_artifacts.material_id
      AND (m.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Update artifacts for own materials"
  ON public.study_material_artifacts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.study_materials m
    WHERE m.id = study_material_artifacts.material_id
      AND (m.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Delete artifacts for own materials"
  ON public.study_material_artifacts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.study_materials m
    WHERE m.id = study_material_artifacts.material_id
      AND (m.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-materials', 'study-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: path = {owner_id}/{material_id}/{filename}
CREATE POLICY "Users upload to own folder in study-materials"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'study-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read their own files in study-materials"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'study-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public materials readable by all authenticated"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'study-materials'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.study_materials m
      WHERE m.file_path = storage.objects.name
        AND m.visibility = 'public'
    )
  );

CREATE POLICY "Users delete their own files in study-materials"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'study-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );