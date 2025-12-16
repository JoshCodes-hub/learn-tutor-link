-- Create quiz_ratings table for students to rate quizzes
CREATE TABLE public.quiz_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, user_id)
);

-- Enable RLS
ALTER TABLE public.quiz_ratings ENABLE ROW LEVEL SECURITY;

-- Users can view all ratings (public)
CREATE POLICY "Anyone can view ratings"
ON public.quiz_ratings
FOR SELECT
USING (true);

-- Users can create their own ratings
CREATE POLICY "Users can create their own ratings"
ON public.quiz_ratings
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own ratings
CREATE POLICY "Users can update their own ratings"
ON public.quiz_ratings
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings"
ON public.quiz_ratings
FOR DELETE
USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_quiz_ratings_updated_at
BEFORE UPDATE ON public.quiz_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();