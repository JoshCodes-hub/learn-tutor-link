-- Add category for filtering + notified_at tracking
ALTER TABLE public.platform_announcements
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Constrain to a known set so chips stay tidy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pa_category_check') THEN
    ALTER TABLE public.platform_announcements
      ADD CONSTRAINT pa_category_check
      CHECK (category IN ('general','feature','event','maintenance','promo','tips'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pa_category ON public.platform_announcements (category);