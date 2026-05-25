-- session_devices ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS session_devices_user_id_idx ON public.session_devices(user_id);

ALTER TABLE public.session_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own devices" ON public.session_devices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users manage own devices" ON public.session_devices
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- record_device_session(): upsert and notify on change ---------------------
CREATE OR REPLACE FUNCTION public.record_device_session(_token text, _ua text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing record;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  SELECT session_token, user_agent INTO existing FROM public.session_devices WHERE user_id = uid;

  IF existing.session_token IS NOT NULL AND existing.session_token <> _token THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (uid, 'New sign-in detected',
            'Your account was signed into on another device (' || COALESCE(left(_ua, 80), 'unknown') || '). If this wasn''t you, change your password.',
            'warning', '/settings/privacy');
  END IF;

  INSERT INTO public.session_devices(user_id, session_token, user_agent, last_seen_at)
  VALUES (uid, _token, left(COALESCE(_ua, ''), 400), now())
  ON CONFLICT (user_id) DO UPDATE
    SET session_token = EXCLUDED.session_token,
        user_agent    = EXCLUDED.user_agent,
        last_seen_at  = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_device_session(text, text) TO authenticated;

-- ping_session(): just heartbeat -------------------------------------------
CREATE OR REPLACE FUNCTION public.ping_session(_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); current text;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT session_token INTO current FROM public.session_devices WHERE user_id = uid;
  IF current IS NULL OR current = _token THEN
    UPDATE public.session_devices SET last_seen_at = now() WHERE user_id = uid;
    RETURN _token;
  END IF;
  RETURN current; -- caller compares; if mismatch, sign out
END;
$$;

GRANT EXECUTE ON FUNCTION public.ping_session(text) TO authenticated;

-- get_admin_insights() -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_insights()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role);
  out jsonb;
BEGIN
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  WITH
  dau AS (SELECT COUNT(DISTINCT user_id) c FROM analytics_events WHERE created_at >= now() - interval '1 day' AND user_id IS NOT NULL),
  wau AS (SELECT COUNT(DISTINCT user_id) c FROM analytics_events WHERE created_at >= now() - interval '7 days' AND user_id IS NOT NULL),
  mau AS (SELECT COUNT(DISTINCT user_id) c FROM analytics_events WHERE created_at >= now() - interval '30 days' AND user_id IS NOT NULL),
  top_unis AS (
    SELECT COALESCE(p.university, 'Unknown') u, COUNT(DISTINCT ae.user_id) c
    FROM analytics_events ae JOIN profiles p ON p.id = ae.user_id
    WHERE ae.created_at >= now() - interval '30 days'
    GROUP BY 1 ORDER BY c DESC LIMIT 5
  ),
  top_courses AS (
    SELECT c.id, c.code, c.title, COUNT(qa.id) attempts
    FROM quiz_attempts qa
    JOIN quizzes q ON q.id = qa.quiz_id
    JOIN courses c ON c.id = q.course_id
    WHERE qa.started_at >= now() - interval '30 days'
    GROUP BY c.id, c.code, c.title ORDER BY attempts DESC LIMIT 5
  ),
  ai_trend AS (
    SELECT to_char(day, 'YYYY-MM-DD') d, SUM(count)::int n
    FROM ai_usage_daily WHERE day >= CURRENT_DATE - 13
    GROUP BY day ORDER BY day
  ),
  top_tutors AS (
    SELECT pr.id, pr.full_name,
      COALESCE((SELECT COUNT(*) FROM quizzes WHERE tutor_id = pr.id AND is_active), 0)
      + COALESCE((SELECT COUNT(*) FROM lecture_notes WHERE tutor_id = pr.id), 0) AS uploads,
      COALESCE((SELECT COUNT(DISTINCT qa.user_id) FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id WHERE q.tutor_id = pr.id), 0) AS impacted
    FROM profiles pr
    WHERE EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pr.id AND r.role = 'tutor'::app_role)
    ORDER BY uploads DESC, impacted DESC LIMIT 5
  ),
  sub_growth AS (
    SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') wk, COUNT(*)::int n
    FROM token_purchases WHERE created_at >= now() - interval '8 weeks' AND status = 'completed'
    GROUP BY 1 ORDER BY 1
  )
  SELECT jsonb_build_object(
    'dau', (SELECT c FROM dau),
    'wau', (SELECT c FROM wau),
    'mau', (SELECT c FROM mau),
    'top_universities', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', u, 'count', c) ORDER BY c DESC) FROM top_unis), '[]'::jsonb),
    'top_courses',      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'code', code, 'title', title, 'attempts', attempts) ORDER BY attempts DESC) FROM top_courses), '[]'::jsonb),
    'ai_trend',         COALESCE((SELECT jsonb_agg(jsonb_build_object('day', d, 'count', n) ORDER BY d) FROM ai_trend), '[]'::jsonb),
    'top_tutors',       COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', full_name, 'uploads', uploads, 'impacted', impacted) ORDER BY uploads DESC) FROM top_tutors), '[]'::jsonb),
    'subscription_growth', COALESCE((SELECT jsonb_agg(jsonb_build_object('week', wk, 'count', n) ORDER BY wk) FROM sub_growth), '[]'::jsonb)
  ) INTO out;

  RETURN out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_insights() TO authenticated;