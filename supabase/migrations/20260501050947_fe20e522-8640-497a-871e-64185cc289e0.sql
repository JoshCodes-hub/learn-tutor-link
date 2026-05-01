
-- Platform announcements: admin-authored notices with optional image, visible to everyone
CREATE TABLE public.platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  link_label TEXT,
  audience TEXT NOT NULL DEFAULT 'all',
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT pa_audience_check CHECK (audience IN ('all','students','tutors','parents'))
);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active platform announcements"
ON public.platform_announcements
FOR SELECT
USING (
  is_published = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at > now())
);

CREATE POLICY "Admins can view all platform announcements"
ON public.platform_announcements
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage platform announcements"
ON public.platform_announcements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_platform_announcements_updated_at
BEFORE UPDATE ON public.platform_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pa_active_created ON public.platform_announcements (is_published, created_at DESC);

-- Public bucket for announcement images
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-announcements', 'platform-announcements', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read platform-announcements"
ON storage.objects FOR SELECT
USING (bucket_id = 'platform-announcements');

CREATE POLICY "Admins upload platform-announcements"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'platform-announcements' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update platform-announcements"
ON storage.objects FOR UPDATE
USING (bucket_id = 'platform-announcements' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete platform-announcements"
ON storage.objects FOR DELETE
USING (bucket_id = 'platform-announcements' AND has_role(auth.uid(), 'admin'::app_role));
