
-- 1. course_modes: user mode preference per course
CREATE TABLE public.course_modes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  preferred_mode TEXT NOT NULL DEFAULT 'cbt' CHECK (preferred_mode IN ('cbt', 'theory')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.course_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own course modes" ON public.course_modes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own course modes" ON public.course_modes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own course modes" ON public.course_modes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_course_modes_updated_at
  BEFORE UPDATE ON public.course_modes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. theory_questions: written/essay questions
CREATE TABLE public.theory_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  topic_id UUID,
  tutor_id UUID,
  question_text TEXT NOT NULL,
  model_answer TEXT,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  year INTEGER,
  source TEXT,
  marks INTEGER NOT NULL DEFAULT 10,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.theory_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views approved theory questions" ON public.theory_questions
  FOR SELECT USING (is_approved = true OR tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tutors create theory questions" ON public.theory_questions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'tutor'::app_role) AND tutor_id = auth.uid());
CREATE POLICY "Tutors update own theory questions" ON public.theory_questions
  FOR UPDATE USING (tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tutors delete own theory questions" ON public.theory_questions
  FOR DELETE USING (tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_theory_questions_updated_at
  BEFORE UPDATE ON public.theory_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_theory_questions_course ON public.theory_questions(course_id);
CREATE INDEX idx_theory_questions_tutor ON public.theory_questions(tutor_id);

-- 3. theory_attempts: student answers + AI feedback
CREATE TABLE public.theory_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL,
  answer_text TEXT NOT NULL DEFAULT '',
  ai_score INTEGER,
  ai_feedback JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.theory_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own theory attempts" ON public.theory_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tutors view attempts on their questions" ON public.theory_attempts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.theory_questions tq
    WHERE tq.id = theory_attempts.question_id AND tq.tutor_id = auth.uid()
  ));
CREATE POLICY "Admins view all theory attempts" ON public.theory_attempts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users create own theory attempts" ON public.theory_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own theory attempts" ON public.theory_attempts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own theory attempts" ON public.theory_attempts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_theory_attempts_updated_at
  BEFORE UPDATE ON public.theory_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_theory_attempts_user ON public.theory_attempts(user_id);
CREATE INDEX idx_theory_attempts_question ON public.theory_attempts(question_id);
