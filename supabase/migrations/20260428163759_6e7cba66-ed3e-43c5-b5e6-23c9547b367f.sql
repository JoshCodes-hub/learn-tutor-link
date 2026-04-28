
-- Analytics events (page views, quiz starts/completes, signups, custom)
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_name text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  path text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_created_at_idx ON public.analytics_events (created_at DESC);
CREATE INDEX analytics_events_event_name_idx ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX analytics_events_user_id_idx ON public.analytics_events (user_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert their own analytics"
  ON public.analytics_events FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can view analytics"
  ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Client errors (caught by ErrorBoundary)
CREATE TABLE public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  message text NOT NULL,
  stack text,
  component_stack text,
  path text,
  user_agent text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX client_errors_created_at_idx ON public.client_errors (created_at DESC);
CREATE INDEX client_errors_resolved_idx ON public.client_errors (resolved, created_at DESC);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert errors"
  ON public.client_errors FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can view errors"
  ON public.client_errors FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update errors"
  ON public.client_errors FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));
