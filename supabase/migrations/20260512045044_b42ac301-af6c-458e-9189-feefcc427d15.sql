
-- ============ course_chat_reactions ============
CREATE TABLE IF NOT EXISTS public.course_chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.course_chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_ccr_message ON public.course_chat_reactions(message_id);
ALTER TABLE public.course_chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read reactions"
ON public.course_chat_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_chat_messages m
    WHERE m.id = message_id
      AND public.is_course_participant(m.course_id, auth.uid())
  )
);

CREATE POLICY "Participants can add reactions"
ON public.course_chat_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.course_chat_messages m
    WHERE m.id = message_id
      AND public.is_course_participant(m.course_id, auth.uid())
  )
);

CREATE POLICY "Users remove their own reactions"
ON public.course_chat_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.course_chat_reactions;

-- ============ course_pinned_prompts ============
CREATE TABLE IF NOT EXISTS public.course_pinned_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 500),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpp_course ON public.course_pinned_prompts(course_id, created_at DESC);
ALTER TABLE public.course_pinned_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read pinned prompts"
ON public.course_pinned_prompts FOR SELECT TO authenticated
USING (public.is_course_participant(course_id, auth.uid()));

CREATE POLICY "Tutor or admin can pin prompts"
ON public.course_pinned_prompts FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = course_pinned_prompts.course_id AND q.tutor_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Tutor or admin can remove pins"
ON public.course_pinned_prompts FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.course_pinned_prompts;

-- ============ student_resource_bookmarks ============
CREATE TABLE IF NOT EXISTS public.student_resource_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('material','quiz','course')),
  resource_id uuid NOT NULL,
  course_id uuid,
  title text,
  level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_type, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_srb_user ON public.student_resource_bookmarks(user_id, created_at DESC);
ALTER TABLE public.student_resource_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own bookmarks"
ON public.student_resource_bookmarks FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============ student_download_history ============
CREATE TABLE IF NOT EXISTS public.student_download_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('material','quiz','audio')),
  resource_id uuid NOT NULL,
  course_id uuid,
  title text,
  level text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sdh_user ON public.student_download_history(user_id, created_at DESC);
ALTER TABLE public.student_download_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own download history"
ON public.student_download_history FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
