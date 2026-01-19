-- Add is_simulation column to quizzes table for CBT simulation mode
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN NOT NULL DEFAULT false;

-- Add a comment for clarity
COMMENT ON COLUMN public.quizzes.is_simulation IS 'If true, quiz is meant for CBT exam simulation mode with strict timing';