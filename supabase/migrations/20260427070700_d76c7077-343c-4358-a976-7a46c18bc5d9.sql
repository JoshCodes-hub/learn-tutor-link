ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tutor_match_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;