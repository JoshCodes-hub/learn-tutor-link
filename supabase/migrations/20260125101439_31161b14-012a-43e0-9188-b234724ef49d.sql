-- Add image_url column to questions table for optional diagrams/images
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_url text;

-- Add comment to explain the column
COMMENT ON COLUMN public.questions.image_url IS 'Optional URL for question image/diagram';