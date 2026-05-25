
ALTER TABLE public.lecture_notes DROP CONSTRAINT IF EXISTS lecture_notes_topic_id_fkey;
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_topic_id_fkey;

DROP TABLE IF EXISTS public.course_topics CASCADE;

ALTER TABLE public.lecture_notes
  ADD CONSTRAINT lecture_notes_topic_id_fkey
  FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;

ALTER TABLE public.quizzes
  ADD CONSTRAINT quizzes_topic_id_fkey
  FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE SET NULL;

-- Topic write policies (owner / admin)
DROP POLICY IF EXISTS "topics owner write" ON public.topics;
CREATE POLICY "topics owner write" ON public.topics
  FOR INSERT WITH CHECK (public.course_owner(course_id) OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "topics owner update" ON public.topics;
CREATE POLICY "topics owner update" ON public.topics
  FOR UPDATE USING (public.course_owner(course_id) OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "topics owner delete" ON public.topics;
CREATE POLICY "topics owner delete" ON public.topics
  FOR DELETE USING (public.course_owner(course_id) OR public.has_role(auth.uid(),'admin'::app_role));

-- Update search RPC to use topics
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
  (SELECT 'topic'::text, t.id, t.name, c.code, c.id
     FROM public.topics t
     JOIN public.courses c ON c.id = t.course_id
    WHERE (c.university = public.my_university() OR public.has_role(auth.uid(),'admin'::app_role))
      AND lower(t.name) LIKE '%' || lower(coalesce(_q,'')) || '%'
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
