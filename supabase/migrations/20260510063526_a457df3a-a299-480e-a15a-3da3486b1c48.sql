
-- Add new columns to existing withdrawal_requests
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS payout_email TEXT,
  ADD COLUMN IF NOT EXISTS payout_method TEXT NOT NULL DEFAULT 'paddle',
  ADD COLUMN IF NOT EXISTS processed_by UUID,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- ========== Creator Economy ==========
CREATE TABLE IF NOT EXISTS public.tutor_storefronts (
  tutor_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  headline TEXT,
  bio TEXT,
  banner_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tutor_storefronts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Storefronts public read" ON public.tutor_storefronts;
CREATE POLICY "Storefronts public read" ON public.tutor_storefronts FOR SELECT USING (is_published = true OR auth.uid() = tutor_id);
DROP POLICY IF EXISTS "Tutor manages own storefront" ON public.tutor_storefronts;
CREATE POLICY "Tutor manages own storefront" ON public.tutor_storefronts FOR ALL USING (auth.uid() = tutor_id) WITH CHECK (auth.uid() = tutor_id);

CREATE TABLE IF NOT EXISTS public.tutor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tutor_id, student_id)
);
ALTER TABLE public.tutor_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ratings public read" ON public.tutor_ratings;
CREATE POLICY "Ratings public read" ON public.tutor_ratings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Student writes own rating" ON public.tutor_ratings;
CREATE POLICY "Student writes own rating" ON public.tutor_ratings FOR INSERT WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS "Student updates own rating" ON public.tutor_ratings;
CREATE POLICY "Student updates own rating" ON public.tutor_ratings FOR UPDATE USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Student deletes own rating" ON public.tutor_ratings;
CREATE POLICY "Student deletes own rating" ON public.tutor_ratings FOR DELETE USING (auth.uid() = student_id);

-- ========== Subscriptions ==========
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  interval TEXT NOT NULL DEFAULT 'month',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  paddle_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plans public read" ON public.subscription_plans;
CREATE POLICY "Plans public read" ON public.subscription_plans FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admin manages plans" ON public.subscription_plans;
CREATE POLICY "Admin manages plans" ON public.subscription_plans FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  paddle_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User sees own sub" ON public.user_subscriptions;
CREATE POLICY "User sees own sub" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "Admin manages subs" ON public.user_subscriptions;
CREATE POLICY "Admin manages subs" ON public.user_subscriptions FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.subscription_plans (id,name,price_cents,interval,features) VALUES
  ('free','Free',0,'month','["Basic quizzes","50 starter tokens","Community access"]'::jsonb),
  ('pro_monthly','Pro Monthly',499,'month','["Unlimited AI explanations","Priority AI coach","Ad-free","Bonus tokens monthly","Pro badge"]'::jsonb),
  ('pro_yearly','Pro Yearly',4999,'year','["Everything in Monthly","2 months free","Pro badge"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ========== AI Coach + Adaptive ==========
CREATE TABLE IF NOT EXISTS public.coach_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  plan_json JSONB NOT NULL,
  weak_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_date)
);
ALTER TABLE public.coach_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User own coach plans" ON public.coach_plans;
CREATE POLICY "User own coach plans" ON public.coach_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.topic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  mastery_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic)
);
ALTER TABLE public.topic_mastery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User own mastery" ON public.topic_mastery;
CREATE POLICY "User own mastery" ON public.topic_mastery FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== Social ==========
CREATE TABLE IF NOT EXISTS public.tutor_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, tutor_id)
);
ALTER TABLE public.tutor_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Follows public read" ON public.tutor_follows;
CREATE POLICY "Follows public read" ON public.tutor_follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "User follows" ON public.tutor_follows;
CREATE POLICY "User follows" ON public.tutor_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "User unfollows" ON public.tutor_follows;
CREATE POLICY "User unfollows" ON public.tutor_follows FOR DELETE USING (auth.uid() = follower_id);

CREATE TABLE IF NOT EXISTS public.quiz_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quiz comments public read" ON public.quiz_comments;
CREATE POLICY "Quiz comments public read" ON public.quiz_comments FOR SELECT USING (is_hidden = false OR auth.uid() = author_id OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "Auth user comments" ON public.quiz_comments;
CREATE POLICY "Auth user comments" ON public.quiz_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Author edits own comment" ON public.quiz_comments;
CREATE POLICY "Author edits own comment" ON public.quiz_comments FOR UPDATE USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "Author deletes own comment" ON public.quiz_comments;
CREATE POLICY "Author deletes own comment" ON public.quiz_comments FOR DELETE USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.weekly_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  prize_tokens INTEGER NOT NULL DEFAULT 0,
  awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_start, user_id)
);
ALTER TABLE public.weekly_leaderboards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leaderboards public read" ON public.weekly_leaderboards;
CREATE POLICY "Leaderboards public read" ON public.weekly_leaderboards FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages leaderboards" ON public.weekly_leaderboards;
CREATE POLICY "Admin manages leaderboards" ON public.weekly_leaderboards FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- ========== Admin Ops ==========
CREATE TABLE IF NOT EXISTS public.tutor_scorecards (
  tutor_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_students INTEGER NOT NULL DEFAULT 0,
  total_quizzes INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_earnings INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_active TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tutor_scorecards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tutor sees own scorecard" ON public.tutor_scorecards;
CREATE POLICY "Tutor sees own scorecard" ON public.tutor_scorecards FOR SELECT USING (auth.uid() = tutor_id OR public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "Admin manages scorecards" ON public.tutor_scorecards;
CREATE POLICY "Admin manages scorecards" ON public.tutor_scorecards FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT,
  reported_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth user reports" ON public.moderation_queue;
CREATE POLICY "Auth user reports" ON public.moderation_queue FOR INSERT WITH CHECK (auth.uid() = reported_by);
DROP POLICY IF EXISTS "Admin reads queue" ON public.moderation_queue;
CREATE POLICY "Admin reads queue" ON public.moderation_queue FOR SELECT USING (public.has_role(auth.uid(),'admin'::app_role) OR auth.uid() = reported_by);
DROP POLICY IF EXISTS "Admin updates queue" ON public.moderation_queue;
CREATE POLICY "Admin updates queue" ON public.moderation_queue FOR UPDATE USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percent INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Flags public read" ON public.feature_flags;
CREATE POLICY "Flags public read" ON public.feature_flags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages flags" ON public.feature_flags;
CREATE POLICY "Admin manages flags" ON public.feature_flags FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.feature_flags (key,enabled,rollout_percent,description) VALUES
  ('ai_coach', true, 100, 'AI Study Coach feature'),
  ('weekly_prizes', true, 100, 'Weekly leaderboard prize tokens'),
  ('tutor_storefronts', true, 100, 'Public tutor storefront pages'),
  ('pro_subscription', false, 0, 'Pro subscription tier checkout')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.cohort_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_week DATE NOT NULL,
  cohort_size INTEGER NOT NULL DEFAULT 0,
  active_w1 INTEGER NOT NULL DEFAULT 0,
  active_w2 INTEGER NOT NULL DEFAULT 0,
  active_w4 INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(signup_week)
);
ALTER TABLE public.cohort_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin reads cohorts" ON public.cohort_snapshots;
CREATE POLICY "Admin reads cohorts" ON public.cohort_snapshots FOR SELECT USING (public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "Admin manages cohorts" ON public.cohort_snapshots;
CREATE POLICY "Admin manages cohorts" ON public.cohort_snapshots FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS trg_storefronts_updated ON public.tutor_storefronts;
CREATE TRIGGER trg_storefronts_updated BEFORE UPDATE ON public.tutor_storefronts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_subs_updated ON public.user_subscriptions;
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Withdrawal RPC (uses existing withdrawal_requests.amount column for tokens)
CREATE OR REPLACE FUNCTION public.request_withdrawal(_tokens INTEGER, _payout_email TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_wallet RECORD;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _tokens < 100 THEN RAISE EXCEPTION 'minimum withdrawal is 100 tokens'; END IF;
  SELECT * INTO v_wallet FROM public.token_wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_wallet IS NULL OR v_wallet.balance < _tokens THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;
  UPDATE public.token_wallets SET balance = balance - _tokens, updated_at = now() WHERE id = v_wallet.id;
  INSERT INTO public.token_transactions (wallet_id, amount, type, description)
    VALUES (v_wallet.id, -_tokens, 'withdrawal', 'Withdrawal request: ' || _tokens || ' tokens');
  INSERT INTO public.withdrawal_requests (tutor_id, amount, payout_email)
    VALUES (v_uid, _tokens, _payout_email) RETURNING id INTO v_id;
  INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_uid, 'Withdrawal requested', _tokens || ' tokens are pending payout review.', 'info', '/tutor/payouts');
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_tutor_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_avg NUMERIC; v_tutor UUID;
BEGIN
  v_tutor := COALESCE(NEW.tutor_id, OLD.tutor_id);
  SELECT COALESCE(AVG(rating),0) INTO v_avg FROM public.tutor_ratings WHERE tutor_id = v_tutor;
  INSERT INTO public.tutor_scorecards (tutor_id, avg_rating, computed_at)
    VALUES (v_tutor, v_avg, now())
    ON CONFLICT (tutor_id) DO UPDATE SET avg_rating = EXCLUDED.avg_rating, computed_at = now();
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_tutor_rating_refresh ON public.tutor_ratings;
CREATE TRIGGER trg_tutor_rating_refresh
AFTER INSERT OR UPDATE OR DELETE ON public.tutor_ratings
FOR EACH ROW EXECUTE FUNCTION public.refresh_tutor_rating();

ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_leaderboards;
