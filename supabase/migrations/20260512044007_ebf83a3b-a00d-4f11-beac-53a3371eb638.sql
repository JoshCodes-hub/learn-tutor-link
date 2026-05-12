-- Course chat: per-course conversations open to enrolled students + course tutors
CREATE TABLE IF NOT EXISTS public.course_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_chat_course_created
  ON public.course_chat_messages(course_id, created_at DESC);

ALTER TABLE public.course_chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is this user "in" this course (enrolled student, or tutor of a quiz in the course)?
CREATE OR REPLACE FUNCTION public.is_course_participant(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_courses sc
      WHERE sc.course_id = _course_id AND sc.student_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.quizzes q
      WHERE q.course_id = _course_id AND q.tutor_id = _user_id
  ) OR public.has_role(_user_id, 'admin'::app_role);
$$;

CREATE POLICY "Participants can read course chat"
  ON public.course_chat_messages FOR SELECT
  TO authenticated
  USING (public.is_course_participant(course_id, auth.uid()));

CREATE POLICY "Participants can post"
  ON public.course_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_course_participant(course_id, auth.uid())
  );

CREATE POLICY "Authors can delete own messages"
  ON public.course_chat_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.course_chat_messages;
ALTER TABLE public.course_chat_messages REPLICA IDENTITY FULL;