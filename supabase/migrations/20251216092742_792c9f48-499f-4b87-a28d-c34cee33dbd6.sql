-- Create favorite_tutors table
CREATE TABLE public.favorite_tutors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  tutor_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, tutor_id)
);

-- Enable RLS
ALTER TABLE public.favorite_tutors ENABLE ROW LEVEL SECURITY;

-- Students can view their own favorites
CREATE POLICY "Students can view their own favorites"
ON public.favorite_tutors
FOR SELECT
USING (auth.uid() = student_id);

-- Students can add favorites
CREATE POLICY "Students can add favorites"
ON public.favorite_tutors
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Students can remove favorites
CREATE POLICY "Students can remove favorites"
ON public.favorite_tutors
FOR DELETE
USING (auth.uid() = student_id);

-- Allow anyone to count favorites for a tutor (for display purposes)
CREATE POLICY "Anyone can view tutor follower counts"
ON public.favorite_tutors
FOR SELECT
USING (true);