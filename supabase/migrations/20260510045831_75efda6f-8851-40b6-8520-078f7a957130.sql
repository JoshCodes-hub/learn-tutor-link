
-- 1. ENUM for material kinds
DO $$ BEGIN
  CREATE TYPE public.tutor_material_kind AS ENUM ('pdf','note','flashcard_set','link');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Curricula
CREATE TABLE public.tutor_curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  cover_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tutor_curricula_tutor ON public.tutor_curricula(tutor_id);
CREATE INDEX idx_tutor_curricula_published ON public.tutor_curricula(is_published) WHERE is_published = true;

-- 3. Topics
CREATE TABLE public.tutor_curriculum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID NOT NULL REFERENCES public.tutor_curricula(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tutor_topics_curriculum ON public.tutor_curriculum_topics(curriculum_id);

-- 4. Materials
CREATE TABLE public.tutor_curriculum_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.tutor_curriculum_topics(id) ON DELETE CASCADE,
  kind public.tutor_material_kind NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT,
  content_text TEXT,
  external_url TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tutor_materials_topic ON public.tutor_curriculum_materials(topic_id);

-- 5. Triggers for updated_at
CREATE TRIGGER trg_tutor_curricula_updated
  BEFORE UPDATE ON public.tutor_curricula
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tutor_topics_updated
  BEFORE UPDATE ON public.tutor_curriculum_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tutor_materials_updated
  BEFORE UPDATE ON public.tutor_curriculum_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Enable RLS
ALTER TABLE public.tutor_curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_curriculum_materials ENABLE ROW LEVEL SECURITY;

-- 7. RLS for curricula
CREATE POLICY "Tutors manage own curricula"
  ON public.tutor_curricula FOR ALL TO authenticated
  USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());
CREATE POLICY "Anyone authed views published curricula"
  ON public.tutor_curricula FOR SELECT TO authenticated
  USING (is_published = true);
CREATE POLICY "Admins manage all curricula"
  ON public.tutor_curricula FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 8. RLS for topics
CREATE POLICY "Tutors manage own curriculum topics"
  ON public.tutor_curriculum_topics FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tutor_curricula c
                 WHERE c.id = curriculum_id AND c.tutor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tutor_curricula c
                      WHERE c.id = curriculum_id AND c.tutor_id = auth.uid()));
CREATE POLICY "View topics of published curricula"
  ON public.tutor_curriculum_topics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tutor_curricula c
                 WHERE c.id = curriculum_id AND c.is_published = true));
CREATE POLICY "Admins manage all topics"
  ON public.tutor_curriculum_topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 9. RLS for materials
CREATE POLICY "Tutors manage own curriculum materials"
  ON public.tutor_curriculum_materials FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tutor_curriculum_topics t
                 JOIN public.tutor_curricula c ON c.id = t.curriculum_id
                 WHERE t.id = topic_id AND c.tutor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tutor_curriculum_topics t
                      JOIN public.tutor_curricula c ON c.id = t.curriculum_id
                      WHERE t.id = topic_id AND c.tutor_id = auth.uid()));
CREATE POLICY "View materials of published curricula"
  ON public.tutor_curriculum_materials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tutor_curriculum_topics t
                 JOIN public.tutor_curricula c ON c.id = t.curriculum_id
                 WHERE t.id = topic_id AND c.is_published = true));
CREATE POLICY "Admins manage all materials"
  ON public.tutor_curriculum_materials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 10. Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-materials', 'tutor-materials', false)
ON CONFLICT (id) DO NOTHING;

-- 11. Storage RLS: tutor folder pattern <tutor_id>/...
CREATE POLICY "Tutors upload own folder in tutor-materials"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tutor-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Tutors read own folder in tutor-materials"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tutor-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Tutors update own folder in tutor-materials"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tutor-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Tutors delete own folder in tutor-materials"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tutor-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Authed users read published-tutor files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tutor-materials'
    AND EXISTS (
      SELECT 1 FROM public.tutor_curricula c
      WHERE c.is_published = true
        AND c.tutor_id::text = (storage.foldername(name))[1]
    )
  );
