-- Live Recordings
CREATE TABLE public.live_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.tutor_session_slots(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  duration_s INTEGER,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.live_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutors manage own recordings" ON public.live_recordings
  FOR ALL TO authenticated USING (tutor_id = auth.uid()) WITH CHECK (tutor_id = auth.uid());
CREATE POLICY "Booked students view recordings" ON public.live_recordings
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.session_bookings b
            WHERE b.slot_id = live_recordings.slot_id
              AND b.student_id = auth.uid() AND b.status = 'confirmed')
  );

-- Breakouts
CREATE TABLE public.live_breakouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.tutor_session_slots(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL,
  name TEXT NOT NULL,
  room_suffix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE public.live_breakouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutors manage own breakouts" ON public.live_breakouts
  FOR ALL TO authenticated USING (tutor_id = auth.uid()) WITH CHECK (tutor_id = auth.uid());
CREATE POLICY "Booked students see breakouts" ON public.live_breakouts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.session_bookings b
            WHERE b.slot_id = live_breakouts.slot_id
              AND b.student_id = auth.uid() AND b.status = 'confirmed')
  );

-- Paid live tickets
ALTER TABLE public.tutor_session_slots ADD COLUMN IF NOT EXISTS ticket_price_tokens INTEGER NOT NULL DEFAULT 0;

CREATE TABLE public.live_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.tutor_session_slots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  tokens_paid INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slot_id, student_id)
);
ALTER TABLE public.live_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own tickets" ON public.live_tickets
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Hosts view tickets on their slots" ON public.live_tickets
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tutor_session_slots s
            WHERE s.id = live_tickets.slot_id AND s.tutor_id = auth.uid())
  );
CREATE POLICY "Students create own ticket" ON public.live_tickets
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- AI class recaps
CREATE TABLE public.live_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL UNIQUE REFERENCES public.tutor_session_slots(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL,
  summary TEXT NOT NULL,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.live_recaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Host manages recap" ON public.live_recaps
  FOR ALL TO authenticated USING (tutor_id = auth.uid()) WITH CHECK (tutor_id = auth.uid());
CREATE POLICY "Booked students view recap" ON public.live_recaps
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.session_bookings b
            WHERE b.slot_id = live_recaps.slot_id
              AND b.student_id = auth.uid() AND b.status = 'confirmed')
  );

-- Promo codes
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutors manage own codes" ON public.promo_codes
  FOR ALL TO authenticated USING (tutor_id = auth.uid()) WITH CHECK (tutor_id = auth.uid());
CREATE POLICY "Public reads active codes" ON public.promo_codes
  FOR SELECT TO authenticated USING (active = true);

-- Bundle pricing
CREATE TABLE public.bundle_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 1),
  price_tokens INTEGER NOT NULL CHECK (price_tokens >= 0),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bundle_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutors manage own bundles" ON public.bundle_offers
  FOR ALL TO authenticated USING (tutor_id = auth.uid()) WITH CHECK (tutor_id = auth.uid());
CREATE POLICY "Public reads active bundles" ON public.bundle_offers
  FOR SELECT TO authenticated USING (active = true);

-- Affiliate links
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutors manage own links" ON public.affiliate_links
  FOR ALL TO authenticated USING (tutor_id = auth.uid()) WITH CHECK (tutor_id = auth.uid());
CREATE POLICY "Public can resolve link by slug" ON public.affiliate_links
  FOR SELECT TO anon, authenticated USING (true);

-- Recordings storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('class-recordings', 'class-recordings', false)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Tutors upload own recordings" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'class-recordings' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Tutors read own recordings" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'class-recordings' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Tutors delete own recordings" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'class-recordings' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_recordings_slot ON public.live_recordings(slot_id);
CREATE INDEX IF NOT EXISTS idx_live_breakouts_slot ON public.live_breakouts(slot_id);
CREATE INDEX IF NOT EXISTS idx_live_tickets_slot ON public.live_tickets(slot_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_tutor ON public.promo_codes(tutor_id);
CREATE INDEX IF NOT EXISTS idx_bundle_offers_tutor ON public.bundle_offers(tutor_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_tutor ON public.affiliate_links(tutor_id);