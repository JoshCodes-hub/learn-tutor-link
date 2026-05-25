
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS faculty text;

UPDATE public.profiles SET university = 'FUTA' WHERE university IS NULL;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_university_check
    CHECK (university IS NULL OR university IN ('FUTA','OAU'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_university ON public.profiles(university);

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS university text NOT NULL DEFAULT 'FUTA',
  ADD COLUMN IF NOT EXISTS faculty text;

DO $$ BEGIN
  ALTER TABLE public.courses
    ADD CONSTRAINT courses_university_check
    CHECK (university IN ('FUTA','OAU'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_courses_university_dept_level
  ON public.courses(university, department, level);

CREATE TABLE IF NOT EXISTS public.course_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_topics_course ON public.course_topics(course_id, position);
ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lecture_notes ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL;
ALTER TABLE public.flashcards    ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL;
ALTER TABLE public.quizzes       ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.course_topics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lecture_notes_topic ON public.lecture_notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON public.flashcards(topic_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic ON public.quizzes(topic_id);

CREATE TABLE IF NOT EXISTS public.recently_opened_courses (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_recently_opened_user_time
  ON public.recently_opened_courses(user_id, opened_at DESC);
ALTER TABLE public.recently_opened_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own recents read" ON public.recently_opened_courses;
CREATE POLICY "own recents read" ON public.recently_opened_courses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own recents upsert" ON public.recently_opened_courses;
CREATE POLICY "own recents upsert" ON public.recently_opened_courses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own recents update" ON public.recently_opened_courses;
CREATE POLICY "own recents update" ON public.recently_opened_courses FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own recents delete" ON public.recently_opened_courses;
CREATE POLICY "own recents delete" ON public.recently_opened_courses FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.my_university()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT university FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.course_in_my_university(_course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = _course_id
      AND (c.university = public.my_university()
           OR public.has_role(auth.uid(), 'admin'::app_role)
           OR c.created_by = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.course_owner(_course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.created_by = auth.uid())
$$;

DROP POLICY IF EXISTS "topics read scoped" ON public.course_topics;
CREATE POLICY "topics read scoped" ON public.course_topics FOR SELECT USING (public.course_in_my_university(course_id));
DROP POLICY IF EXISTS "topics owner write" ON public.course_topics;
CREATE POLICY "topics owner write" ON public.course_topics FOR INSERT WITH CHECK (public.course_owner(course_id) OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "topics owner update" ON public.course_topics;
CREATE POLICY "topics owner update" ON public.course_topics FOR UPDATE USING (public.course_owner(course_id) OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "topics owner delete" ON public.course_topics;
CREATE POLICY "topics owner delete" ON public.course_topics FOR DELETE USING (public.course_owner(course_id) OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "courses scoped read" ON public.courses;
CREATE POLICY "courses scoped read" ON public.courses
  FOR SELECT USING (
    is_active AND (
      university = public.my_university()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR created_by = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.search_courses_scoped(_q text)
RETURNS TABLE(kind text, id uuid, title text, subtitle text, course_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  (SELECT 'course'::text, c.id, c.code || ' — ' || c.name, coalesce(c.department,''), c.id
     FROM public.courses c
    WHERE c.is_active
      AND (c.university = public.my_university() OR public.has_role(auth.uid(),'admin'::app_role))
      AND (lower(c.code) LIKE '%' || lower(coalesce(_q,'')) || '%'
           OR lower(c.name) LIKE '%' || lower(coalesce(_q,'')) || '%')
    LIMIT 25)
  UNION ALL
  (SELECT 'topic'::text, t.id, t.title, c.code, c.id
     FROM public.course_topics t
     JOIN public.courses c ON c.id = t.course_id
    WHERE (c.university = public.my_university() OR public.has_role(auth.uid(),'admin'::app_role))
      AND lower(t.title) LIKE '%' || lower(coalesce(_q,'')) || '%'
    LIMIT 25)
  UNION ALL
  (SELECT 'material'::text, n.id, n.title, c.code, c.id
     FROM public.lecture_notes n
     JOIN public.courses c ON c.id = n.course_id
    WHERE n.is_published = true
      AND (c.university = public.my_university() OR public.has_role(auth.uid(),'admin'::app_role))
      AND lower(n.title) LIKE '%' || lower(coalesce(_q,'')) || '%'
    LIMIT 25)
  UNION ALL
  (SELECT 'tutor'::text, p.id, p.full_name, coalesce(p.tutor_code,''), null::uuid
     FROM public.profiles p
     JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'tutor'::app_role
    WHERE (p.university = public.my_university() OR p.university IS NULL OR public.has_role(auth.uid(),'admin'::app_role))
      AND lower(coalesce(p.full_name,'')) LIKE '%' || lower(coalesce(_q,'')) || '%'
    LIMIT 25)
$$;
