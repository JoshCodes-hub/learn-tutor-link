
-- ===== Seed / refresh subscription plans =====
INSERT INTO public.subscription_plans (id, name, price_cents, currency, interval, features, is_active) VALUES
  ('free',    'Free',    0,    'USD', 'month', '["Limited AI","Limited audio","Browse courses & tutors","Personal Library"]'::jsonb, true),
  ('weekly',  'Weekly',  200,  'USD', 'week',  '["Unlimited AI Study Packs","Unlimited Audio","Advanced Quizzes","Premium Tutor Content","Exam Analytics"]'::jsonb, true),
  ('monthly', 'Monthly', 700,  'USD', 'month', '["Unlimited AI Study Packs","Unlimited Audio","Advanced Quizzes","Premium Tutor Content","Exam Analytics","Offline Smart Storage"]'::jsonb, true),
  ('yearly',  'Yearly',  6000, 'USD', 'year',  '["Everything in Monthly","2 months free","Priority support"]'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  interval = EXCLUDED.interval,
  features = EXCLUDED.features,
  is_active = true;

-- ===== Payment requests (manual flow) =====
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id       text NOT NULL REFERENCES public.subscription_plans(id),
  amount_cents  integer NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'NGN',
  reference     text,
  proof_path    text,
  status        text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_note    text,
  reviewed_by   uuid REFERENCES auth.users(id),
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user   ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own payment req" ON public.payment_requests;
CREATE POLICY "Users insert own payment req" ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own payment req" ON public.payment_requests;
CREATE POLICY "Users read own payment req" ON public.payment_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update payment req" ON public.payment_requests;
CREATE POLICY "Admins update payment req" ON public.payment_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== Storage bucket for proofs =====
INSERT INTO storage.buckets (id, name, public)
  VALUES ('payment-proofs', 'payment-proofs', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own proof" ON storage.objects;
CREATE POLICY "Users upload own proof" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users read own proof" ON storage.objects;
CREATE POLICY "Users read own proof" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'::app_role)));

-- ===== is_pro helper =====
CREATE OR REPLACE FUNCTION public.is_pro(_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = _uid
      AND status = 'active'
      AND plan_id <> 'free'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- ===== Approve payment request (admin only) =====
CREATE OR REPLACE FUNCTION public.approve_payment_request(_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req RECORD;
  v_plan RECORD;
  v_expires timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO v_req FROM public.payment_requests WHERE id = _id FOR UPDATE;
  IF v_req IS NULL THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_req.status = 'approved' THEN RETURN; END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_req.plan_id;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'plan not found'; END IF;

  v_expires := CASE v_plan.interval
    WHEN 'week'  THEN now() + interval '7 days'
    WHEN 'month' THEN now() + interval '30 days'
    WHEN 'year'  THEN now() + interval '365 days'
    ELSE NULL
  END;

  -- Mark any current active subscription as superseded
  UPDATE public.user_subscriptions
     SET status = 'replaced', updated_at = now()
   WHERE user_id = v_req.user_id AND status = 'active';

  INSERT INTO public.user_subscriptions (user_id, plan_id, status, started_at, expires_at)
    VALUES (v_req.user_id, v_req.plan_id, 'active', now(), v_expires);

  UPDATE public.payment_requests
     SET status = 'approved', admin_note = COALESCE(_note, admin_note),
         reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_req.user_id, 'Subscription approved',
            'Your ' || v_plan.name || ' plan is now active.',
            'success', '/subscription');
END $$;

CREATE OR REPLACE FUNCTION public.reject_payment_request(_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO v_req FROM public.payment_requests WHERE id = _id;
  IF v_req IS NULL THEN RAISE EXCEPTION 'request not found'; END IF;
  UPDATE public.payment_requests
     SET status = 'rejected', admin_note = COALESCE(_note, admin_note),
         reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _id;
  INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_req.user_id, 'Payment not approved',
            COALESCE(_note, 'Please review your payment details and try again.'),
            'warning', '/subscription');
END $$;

-- ===== AI usage tracker =====
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day     date NOT NULL DEFAULT CURRENT_DATE,
  kind    text NOT NULL,
  count   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own usage" ON public.ai_usage_daily;
CREATE POLICY "Users read own usage" ON public.ai_usage_daily
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_ai_usage(_kind text, _limit integer)
RETURNS TABLE(allowed boolean, used integer, remaining integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_count integer; v_pro boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  v_pro := public.is_pro(v_uid);
  IF v_pro THEN
    -- still record usage for analytics, but no limit
    INSERT INTO public.ai_usage_daily (user_id, day, kind, count)
      VALUES (v_uid, CURRENT_DATE, _kind, 1)
      ON CONFLICT (user_id, day, kind) DO UPDATE
        SET count = ai_usage_daily.count + 1
      RETURNING count INTO v_count;
    allowed := true; used := v_count; remaining := 9999; RETURN NEXT; RETURN;
  END IF;
  SELECT COALESCE(count,0) INTO v_count FROM public.ai_usage_daily
    WHERE user_id = v_uid AND day = CURRENT_DATE AND kind = _kind;
  IF v_count >= _limit THEN
    allowed := false; used := v_count; remaining := 0; RETURN NEXT; RETURN;
  END IF;
  INSERT INTO public.ai_usage_daily (user_id, day, kind, count)
    VALUES (v_uid, CURRENT_DATE, _kind, 1)
    ON CONFLICT (user_id, day, kind) DO UPDATE
      SET count = ai_usage_daily.count + 1
    RETURNING count INTO v_count;
  allowed := true; used := v_count; remaining := GREATEST(_limit - v_count, 0); RETURN NEXT;
END $$;

-- ===== Referral code auto-generation =====
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE new_code text; exists_already boolean;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::text || clock_timestamp()::text) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_code;
END $$;

CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_referral_code ON public.profiles;
CREATE TRIGGER trg_assign_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_referral_code();

-- Backfill any existing profiles without a code
UPDATE public.profiles
   SET referral_code = public.generate_referral_code()
 WHERE referral_code IS NULL;

-- ===== Token transfers (architecture only) =====
CREATE TABLE IF NOT EXISTS public.token_transfers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user     uuid REFERENCES auth.users(id),
  to_email    text,
  amount      integer NOT NULL CHECK (amount > 0),
  status      text NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.token_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own transfers" ON public.token_transfers;
CREATE POLICY "Users see own transfers" ON public.token_transfers
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);
