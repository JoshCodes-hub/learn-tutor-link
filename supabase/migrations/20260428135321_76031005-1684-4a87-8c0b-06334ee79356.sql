-- Exam goals (one active per user)
CREATE TABLE public.exam_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_date DATE NOT NULL,
  target_score INTEGER NOT NULL DEFAULT 75,
  weekly_quiz_target INTEGER NOT NULL DEFAULT 5,
  exam_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_goals_user ON public.exam_goals(user_id, is_active);

ALTER TABLE public.exam_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own goals" ON public.exam_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own goals" ON public.exam_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own goals" ON public.exam_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own goals" ON public.exam_goals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_exam_goals_updated_at
BEFORE UPDATE ON public.exam_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();