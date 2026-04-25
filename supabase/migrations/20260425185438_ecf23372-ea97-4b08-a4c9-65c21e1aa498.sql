-- Phase 1: Academic path foundation

-- 1. Academic path enum
CREATE TYPE public.academic_path AS ENUM ('secondary', 'jamb', 'university');

-- 2. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS academic_path public.academic_path,
  ADD COLUMN IF NOT EXISTS academic_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_academic_path ON public.profiles(academic_path);

-- 3. Subjects table (curriculum reference data)
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.academic_path NOT NULL,
  level text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subjects are viewable by everyone"
  ON public.subjects FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage subjects"
  ON public.subjects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Path tagging on courses + past-question fields on questions
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS path_type public.academic_path NOT NULL DEFAULT 'university';

CREATE INDEX IF NOT EXISTS idx_courses_path_type ON public.courses(path_type);

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS is_past_question boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions(year) WHERE is_past_question;

-- 5. Study plans (Strategy Engine output)
CREATE TABLE public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own study plans"
  ON public.study_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own study plans"
  ON public.study_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own study plans"
  ON public.study_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own study plans"
  ON public.study_plans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Performance snapshots (Intelligence Layer)
CREATE TABLE public.user_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  readiness_score integer NOT NULL DEFAULT 0,
  weak_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  strong_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);

ALTER TABLE public.user_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own snapshots"
  ON public.user_performance_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts snapshots for users"
  ON public.user_performance_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all snapshots"
  ON public.user_performance_snapshots FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 7. Seed subjects
INSERT INTO public.subjects (name, category, level) VALUES
  -- Secondary (WAEC/NECO core)
  ('Mathematics', 'secondary', 'JSS-SS'),
  ('English Language', 'secondary', 'JSS-SS'),
  ('Physics', 'secondary', 'SS'),
  ('Chemistry', 'secondary', 'SS'),
  ('Biology', 'secondary', 'SS'),
  ('Further Mathematics', 'secondary', 'SS'),
  ('Literature in English', 'secondary', 'SS'),
  ('Government', 'secondary', 'SS'),
  ('Economics', 'secondary', 'SS'),
  ('Geography', 'secondary', 'SS'),
  ('Agricultural Science', 'secondary', 'SS'),
  ('Civic Education', 'secondary', 'JSS-SS'),
  ('Basic Science', 'secondary', 'JSS'),
  ('Basic Technology', 'secondary', 'JSS'),
  -- JAMB (UTME core)
  ('Use of English', 'jamb', 'UTME'),
  ('Mathematics', 'jamb', 'UTME'),
  ('Physics', 'jamb', 'UTME'),
  ('Chemistry', 'jamb', 'UTME'),
  ('Biology', 'jamb', 'UTME'),
  ('Government', 'jamb', 'UTME'),
  ('Economics', 'jamb', 'UTME'),
  ('Literature in English', 'jamb', 'UTME'),
  ('Christian Religious Studies', 'jamb', 'UTME'),
  ('Islamic Religious Studies', 'jamb', 'UTME'),
  ('Geography', 'jamb', 'UTME'),
  ('Commerce', 'jamb', 'UTME'),
  ('Accounting', 'jamb', 'UTME'),
  ('History', 'jamb', 'UTME')
ON CONFLICT DO NOTHING;