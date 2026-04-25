-- Tutor specialization enum (reuses academic_path)
ALTER TABLE public.tutor_applications
  ADD COLUMN IF NOT EXISTS specialization public.academic_path;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutor_specialization public.academic_path;

-- Flashcards table
CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  topic text,
  front text NOT NULL,
  back text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  academic_path public.academic_path,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flashcards_user ON public.flashcards(user_id);
CREATE INDEX idx_flashcards_subject ON public.flashcards(subject);
CREATE INDEX idx_flashcards_public ON public.flashcards(is_public) WHERE is_public;

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own flashcards"
  ON public.flashcards FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users create their own flashcards"
  ON public.flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own flashcards"
  ON public.flashcards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own flashcards"
  ON public.flashcards FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();