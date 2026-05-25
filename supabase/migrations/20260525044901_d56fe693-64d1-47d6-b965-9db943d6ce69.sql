
-- 1) Course chat: threaded replies + @AI
ALTER TABLE public.course_chat_messages
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.course_chat_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_status text;

CREATE INDEX IF NOT EXISTS idx_course_chat_parent ON public.course_chat_messages(parent_id);

-- 2) OPPORTUNITIES
DO $$ BEGIN
  CREATE TYPE public.opportunity_category AS ENUM (
    'internship','scholarship','hackathon','competition','tech_program','career'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.opportunity_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  organization text NOT NULL,
  category public.opportunity_category NOT NULL,
  description text NOT NULL,
  deadline date,
  apply_url text,
  cover_image_url text,
  university text,
  posted_by uuid,
  status public.opportunity_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opportunities_status_deadline ON public.opportunities(status, deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON public.opportunities(category);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published opportunities"
  ON public.opportunities FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert opportunities"
  ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update opportunities"
  ON public.opportunities FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete opportunities"
  ON public.opportunities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS opportunities_updated_at ON public.opportunities;
CREATE TRIGGER opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.opportunity_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, user_id)
);
ALTER TABLE public.opportunity_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks"
  ON public.opportunity_bookmarks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3) STUDENT SPOTLIGHTS
CREATE TABLE IF NOT EXISTS public.student_spotlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  category text NOT NULL CHECK (category IN ('graduating','innovator','hackathon','scholarship','top_performer')),
  title text NOT NULL,
  summary text,
  image_url text,
  link_url text,
  featured_until date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spotlights_featured ON public.student_spotlights(featured_until DESC NULLS LAST);
ALTER TABLE public.student_spotlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view spotlights"
  ON public.student_spotlights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage spotlights"
  ON public.student_spotlights FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) ACTIVITY EVENTS
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  verb text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  course_id uuid,
  university text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers','course')),
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_events_created ON public.activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor ON public.activity_events(actor_id, created_at DESC);
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view activity feed"
  ON public.activity_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can log own activity"
  ON public.activity_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) TRIGGERS
CREATE OR REPLACE FUNCTION public.notify_followers_on_lecture_note()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_published THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT f.follower_id,
           'New material from a tutor you follow',
           COALESCE(NEW.title, 'New lecture note'),
           'tutor_upload',
           '/courses/' || COALESCE(NEW.course_id::text, '')
    FROM public.tutor_follows f
    WHERE f.tutor_id = NEW.tutor_id;

    INSERT INTO public.activity_events (actor_id, verb, object_type, object_id, course_id, visibility, meta)
    VALUES (NEW.tutor_id, 'uploaded_note', 'lecture_note', NEW.id, NEW.course_id, 'public',
            jsonb_build_object('title', NEW.title));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_followers_lecture_note ON public.lecture_notes;
CREATE TRIGGER trg_notify_followers_lecture_note
  AFTER INSERT ON public.lecture_notes
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_lecture_note();

CREATE OR REPLACE FUNCTION public.notify_followers_on_tutor_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT f.follower_id,
         COALESCE(NEW.title, 'Tutor announcement'),
         COALESCE(LEFT(NEW.body, 200), ''),
         'tutor_announcement',
         '/tutor/' || NEW.tutor_id::text
  FROM public.tutor_follows f
  WHERE f.tutor_id = NEW.tutor_id;

  INSERT INTO public.activity_events (actor_id, verb, object_type, object_id, course_id, visibility, meta)
  VALUES (NEW.tutor_id, 'announced', 'announcement', NEW.id, NEW.course_id, 'public',
          jsonb_build_object('title', NEW.title));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_followers_tutor_announcement ON public.tutor_announcements;
CREATE TRIGGER trg_notify_followers_tutor_announcement
  AFTER INSERT ON public.tutor_announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_tutor_announcement();

CREATE OR REPLACE FUNCTION public.notify_followers_on_quiz()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.is_active, true) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT f.follower_id,
           'New quiz from a tutor you follow',
           COALESCE(NEW.title, 'New quiz'),
           'tutor_quiz',
           '/quiz/' || NEW.id::text
    FROM public.tutor_follows f
    WHERE f.tutor_id = NEW.tutor_id;

    INSERT INTO public.activity_events (actor_id, verb, object_type, object_id, course_id, visibility, meta)
    VALUES (NEW.tutor_id, 'posted_quiz', 'quiz', NEW.id, NEW.course_id, 'public',
            jsonb_build_object('title', NEW.title));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_followers_quiz ON public.quizzes;
CREATE TRIGGER trg_notify_followers_quiz
  AFTER INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_quiz();

CREATE OR REPLACE FUNCTION public.activity_on_opportunity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' THEN
    INSERT INTO public.activity_events (actor_id, verb, object_type, object_id, university, visibility, meta)
    VALUES (NEW.posted_by, 'posted_opportunity', 'opportunity', NEW.id, NEW.university, 'public',
            jsonb_build_object('title', NEW.title, 'category', NEW.category, 'organization', NEW.organization));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_activity_opportunity ON public.opportunities;
CREATE TRIGGER trg_activity_opportunity
  AFTER INSERT ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.activity_on_opportunity();

CREATE OR REPLACE FUNCTION public.activity_on_spotlight()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_events (actor_id, verb, object_type, object_id, visibility, meta)
  VALUES (NEW.created_by, 'featured_spotlight', 'spotlight', NEW.id, 'public',
          jsonb_build_object('title', NEW.title, 'category', NEW.category));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_activity_spotlight ON public.student_spotlights;
CREATE TRIGGER trg_activity_spotlight
  AFTER INSERT ON public.student_spotlights
  FOR EACH ROW EXECUTE FUNCTION public.activity_on_spotlight();

-- 6) LEADERBOARD RPCs
CREATE OR REPLACE FUNCTION public.get_student_leaderboard(_limit int DEFAULT 20)
RETURNS TABLE (
  user_id uuid, full_name text, avatar_url text, university text,
  score numeric, quiz_accuracy numeric, cards_reviewed int,
  streak_days int, ai_activity int, engagement int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH win AS (SELECT (now() - interval '30 days') AS since),
  quiz AS (
    SELECT qa.user_id,
           CASE WHEN SUM(qa.total_questions) > 0
                THEN (SUM(qa.correct_answers)::numeric / SUM(qa.total_questions)) * 100
                ELSE 0 END AS accuracy
    FROM public.quiz_attempts qa, win
    WHERE qa.completed_at IS NOT NULL AND qa.completed_at >= win.since
    GROUP BY qa.user_id
  ),
  cards AS (
    SELECT s.user_id, COUNT(*)::int AS reviewed
    FROM public.srs_cards s, win
    WHERE s.last_reviewed_at IS NOT NULL AND s.last_reviewed_at >= win.since
    GROUP BY s.user_id
  ),
  ai AS (
    SELECT user_id, COUNT(*)::int AS gens
    FROM public.ai_generation_history, win
    WHERE created_at >= win.since
    GROUP BY user_id
  ),
  eng AS (
    SELECT user_id, COUNT(*)::int AS msgs
    FROM public.course_chat_messages, win
    WHERE created_at >= win.since
    GROUP BY user_id
  )
  SELECT p.id,
         p.full_name,
         COALESCE(p.profile_image_url, p.avatar_url),
         p.university,
         (
           COALESCE(quiz.accuracy, 0) * 0.40 +
           LEAST(COALESCE(cards.reviewed, 0), 200) * 0.5 * 0.20 +
           LEAST(COALESCE(ss.current_streak, 0), 60) * 1.0 * 0.15 +
           LEAST(COALESCE(ai.gens, 0), 100) * 0.6 * 0.15 +
           LEAST(COALESCE(eng.msgs, 0), 200) * 0.3 * 0.10
         )::numeric,
         COALESCE(quiz.accuracy, 0)::numeric,
         COALESCE(cards.reviewed, 0),
         COALESCE(ss.current_streak, 0),
         COALESCE(ai.gens, 0),
         COALESCE(eng.msgs, 0)
  FROM public.profiles p
  LEFT JOIN public.study_streaks ss ON ss.user_id = p.id
  LEFT JOIN quiz ON quiz.user_id = p.id
  LEFT JOIN cards ON cards.user_id = p.id
  LEFT JOIN ai ON ai.user_id = p.id
  LEFT JOIN eng ON eng.user_id = p.id
  WHERE (
    COALESCE(quiz.accuracy, 0) + COALESCE(cards.reviewed, 0) +
    COALESCE(ai.gens, 0) + COALESCE(eng.msgs, 0)
  ) > 0
  ORDER BY 5 DESC
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.get_tutor_leaderboard(_limit int DEFAULT 20)
RETURNS TABLE (
  tutor_id uuid, full_name text, avatar_url text,
  uploads_count int, students_impacted int, followers_count int,
  avg_rating numeric, score numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH uploads AS (
    SELECT tutor_id, COUNT(*)::int AS c FROM public.lecture_notes GROUP BY tutor_id
    UNION ALL
    SELECT tutor_id, COUNT(*)::int FROM public.quizzes GROUP BY tutor_id
  ),
  uploads_agg AS (SELECT tutor_id, SUM(c)::int AS uploads FROM uploads GROUP BY tutor_id),
  impact AS (
    SELECT q.tutor_id, COUNT(DISTINCT qa.user_id)::int AS impacted
    FROM public.quiz_attempts qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    WHERE qa.completed_at IS NOT NULL
    GROUP BY q.tutor_id
  ),
  follows AS (
    SELECT tutor_id, COUNT(*)::int AS followers FROM public.tutor_follows GROUP BY tutor_id
  )
  SELECT p.id,
         p.full_name,
         COALESCE(p.profile_image_url, p.avatar_url),
         COALESCE(uploads_agg.uploads, 0),
         COALESCE(impact.impacted, 0),
         COALESCE(follows.followers, 0),
         NULL::numeric,
         (
           COALESCE(uploads_agg.uploads, 0) * 2 +
           COALESCE(impact.impacted, 0) * 1.5 +
           COALESCE(follows.followers, 0) * 1.0
         )::numeric
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'tutor'::app_role
  LEFT JOIN uploads_agg ON uploads_agg.tutor_id = p.id
  LEFT JOIN impact ON impact.tutor_id = p.id
  LEFT JOIN follows ON follows.tutor_id = p.id
  WHERE (
    COALESCE(uploads_agg.uploads, 0) +
    COALESCE(impact.impacted, 0) +
    COALESCE(follows.followers, 0)
  ) > 0
  ORDER BY 8 DESC
  LIMIT _limit;
$$;
