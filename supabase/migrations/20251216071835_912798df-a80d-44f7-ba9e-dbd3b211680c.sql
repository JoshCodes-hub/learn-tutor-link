-- Make questions automatically approved when created
ALTER TABLE public.questions ALTER COLUMN is_approved SET DEFAULT true;