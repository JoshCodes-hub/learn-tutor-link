
CREATE TABLE public.learning_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_date DATE,
  completed_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_goals_user_course ON public.learning_goals(user_id, course_id);

ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own goals" ON public.learning_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create their own goals" ON public.learning_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own goals" ON public.learning_goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own goals" ON public.learning_goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_learning_goals_updated_at
  BEFORE UPDATE ON public.learning_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
