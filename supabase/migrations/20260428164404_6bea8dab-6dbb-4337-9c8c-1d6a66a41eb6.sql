-- Server-side aggregation RPC for the admin Health Dashboard.
-- Returns one row per day for the last `days` days with:
--   - active_users  (distinct user_id in analytics_events)
--   - quizzes_started / quizzes_completed (event counts)
--   - errors (count from client_errors)
-- Restricted to admins only.

CREATE OR REPLACE FUNCTION public.get_health_metrics(days integer DEFAULT 14)
RETURNS TABLE (
  day date,
  active_users integer,
  quizzes_started integer,
  quizzes_completed integer,
  errors integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since_date date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF days IS NULL OR days < 1 THEN days := 14; END IF;
  IF days > 90 THEN days := 90; END IF;

  since_date := (CURRENT_DATE - (days - 1));

  RETURN QUERY
  WITH day_series AS (
    SELECT generate_series(since_date, CURRENT_DATE, interval '1 day')::date AS d
  ),
  ev AS (
    SELECT
      (created_at AT TIME ZONE 'UTC')::date AS d,
      COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS active_users,
      COUNT(*) FILTER (WHERE event_name = 'quiz_started')::int AS quizzes_started,
      COUNT(*) FILTER (WHERE event_name = 'quiz_completed')::int AS quizzes_completed
    FROM public.analytics_events
    WHERE created_at >= since_date
    GROUP BY 1
  ),
  er AS (
    SELECT
      (created_at AT TIME ZONE 'UTC')::date AS d,
      COUNT(*)::int AS errors
    FROM public.client_errors
    WHERE created_at >= since_date
    GROUP BY 1
  )
  SELECT
    ds.d AS day,
    COALESCE(ev.active_users, 0) AS active_users,
    COALESCE(ev.quizzes_started, 0) AS quizzes_started,
    COALESCE(ev.quizzes_completed, 0) AS quizzes_completed,
    COALESCE(er.errors, 0) AS errors
  FROM day_series ds
  LEFT JOIN ev ON ev.d = ds.d
  LEFT JOIN er ON er.d = ds.d
  ORDER BY ds.d;
END;
$$;

REVOKE ALL ON FUNCTION public.get_health_metrics(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_health_metrics(integer) TO authenticated;

-- Helpful indexes for the aggregation
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created ON public.analytics_events (event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON public.client_errors (created_at);