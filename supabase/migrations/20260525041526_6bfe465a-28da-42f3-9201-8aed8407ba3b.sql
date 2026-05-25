
ALTER TABLE public.ai_generation_history
  ADD COLUMN IF NOT EXISTS course_id uuid,
  ADD COLUMN IF NOT EXISTS topic_id uuid;

CREATE INDEX IF NOT EXISTS idx_ai_gen_history_course
  ON public.ai_generation_history(user_id, course_id, created_at DESC);

ALTER TABLE public.user_resources
  ADD COLUMN IF NOT EXISTS course_id uuid,
  ADD COLUMN IF NOT EXISTS topic_id uuid;

CREATE INDEX IF NOT EXISTS idx_user_resources_course
  ON public.user_resources(user_id, course_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.list_course_ai_generations(_course_id uuid)
RETURNS SETOF public.ai_generation_history
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.ai_generation_history
  WHERE user_id = auth.uid()
    AND course_id = _course_id
  ORDER BY created_at DESC
  LIMIT 200;
$$;
