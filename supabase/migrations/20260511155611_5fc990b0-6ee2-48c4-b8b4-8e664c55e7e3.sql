ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.tutor_curricula ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.lecture_notes ADD COLUMN IF NOT EXISTS level TEXT;
CREATE INDEX IF NOT EXISTS idx_quizzes_level ON public.quizzes(level);
CREATE INDEX IF NOT EXISTS idx_tutor_curricula_level ON public.tutor_curricula(level);
CREATE INDEX IF NOT EXISTS idx_lecture_notes_level ON public.lecture_notes(level);