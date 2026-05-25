-- Phase 8: device login history (audit log, distinct from single-session enforcement)
CREATE TABLE IF NOT EXISTS public.device_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_label TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_login_history_user_idx
  ON public.device_login_history(user_id, last_active_at DESC);

ALTER TABLE public.device_login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own device history"
  ON public.device_login_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own device history"
  ON public.device_login_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own device history"
  ON public.device_login_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Record/refresh a device login row (dedupes by user + device_label)
CREATE OR REPLACE FUNCTION public.record_device_login(_label TEXT, _ua TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO v_id FROM public.device_login_history
    WHERE user_id = v_uid AND device_label = _label
    ORDER BY last_active_at DESC LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.device_login_history SET last_active_at = now(), user_agent = COALESCE(_ua, user_agent)
      WHERE id = v_id;
    RETURN v_id;
  END IF;
  INSERT INTO public.device_login_history (user_id, device_label, user_agent)
    VALUES (v_uid, _label, _ua) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Trust score: lightweight 0..100 composite
CREATE OR REPLACE FUNCTION public.get_trust_score(_uid UUID DEFAULT auth.uid())
RETURNS TABLE(score INTEGER, profile_pct INTEGER, age_days INTEGER, study_days INTEGER, has_subscription BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile RECORD; v_age_days INTEGER := 0; v_study_days INTEGER := 0;
  v_pct INTEGER := 0; v_has_sub BOOLEAN := false; v_score INTEGER := 0;
BEGIN
  IF _uid IS NULL THEN
    score := 0; profile_pct := 0; age_days := 0; study_days := 0; has_subscription := false;
    RETURN NEXT; RETURN;
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = _uid;
  IF v_profile IS NOT NULL THEN
    v_age_days := GREATEST(0, (EXTRACT(EPOCH FROM (now() - v_profile.created_at))/86400)::INTEGER);
    v_pct := (
      CASE WHEN v_profile.full_name IS NOT NULL AND v_profile.full_name <> '' THEN 1 ELSE 0 END +
      CASE WHEN v_profile.university IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN v_profile.department IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN COALESCE(v_profile.profile_image_url, v_profile.avatar_url) IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN v_profile.academic_path IS NOT NULL THEN 1 ELSE 0 END
    ) * 20;
  END IF;
  SELECT COUNT(DISTINCT (completed_at AT TIME ZONE 'UTC')::date)::INTEGER INTO v_study_days
    FROM public.quiz_attempts WHERE user_id = _uid AND completed_at IS NOT NULL
      AND completed_at > now() - interval '60 days';
  v_has_sub := public.is_pro(_uid);
  v_score := LEAST(100,
    (v_pct * 30 / 100)               -- 30 pts profile
    + LEAST(25, v_age_days/3)        -- up to 25 pts (75 days = full)
    + LEAST(30, v_study_days * 2)    -- up to 30 pts (15 days = full)
    + CASE WHEN v_has_sub THEN 15 ELSE 0 END
  );
  score := v_score; profile_pct := v_pct; age_days := v_age_days;
  study_days := v_study_days; has_subscription := v_has_sub;
  RETURN NEXT;
END $$;

-- Smart opportunity matching for the calling student
CREATE OR REPLACE FUNCTION public.recommend_opportunities(_limit INTEGER DEFAULT 6)
RETURNS SETOF public.opportunities
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uni TEXT; v_dept TEXT;
BEGIN
  SELECT university, department INTO v_uni, v_dept FROM public.profiles WHERE id = auth.uid();
  RETURN QUERY
    SELECT * FROM public.opportunities o
    WHERE o.status = 'published'
      AND (o.deadline IS NULL OR o.deadline >= CURRENT_DATE)
    ORDER BY
      (CASE WHEN o.university IS NULL OR o.university = v_uni THEN 0 ELSE 1 END),
      (CASE WHEN v_dept IS NOT NULL AND o.description ILIKE '%' || v_dept || '%' THEN 0 ELSE 1 END),
      o.deadline NULLS LAST,
      o.created_at DESC
    LIMIT GREATEST(1, _limit);
END $$;