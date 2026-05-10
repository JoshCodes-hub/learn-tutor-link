
-- ============ 1. Public profile visibility ============
-- Allow any authenticated user to view profiles (so avatars/names show in chat, feed, comments)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- ============ 2. start_dm RPC (student ↔ tutor DM) ============
CREATE OR REPLACE FUNCTION public.start_dm(_other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_thread_id uuid;
  v_other_name text;
  v_my_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other_user IS NULL OR _other_user = v_uid THEN RAISE EXCEPTION 'invalid recipient'; END IF;

  -- block check (either way)
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_uid AND blocked_id = _other_user)
       OR (blocker_id = _other_user AND blocked_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'messaging blocked';
  END IF;

  -- find existing 1:1 dm thread containing exactly these two
  SELECT t.id INTO v_existing
    FROM public.chat_threads t
    JOIN public.chat_thread_members m1 ON m1.thread_id = t.id AND m1.user_id = v_uid
    JOIN public.chat_thread_members m2 ON m2.thread_id = t.id AND m2.user_id = _other_user
   WHERE t.kind = 'dm'
   LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  SELECT COALESCE(full_name, 'Chat') INTO v_other_name FROM public.profiles WHERE id = _other_user;
  SELECT COALESCE(full_name, 'Someone') INTO v_my_name FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.chat_threads (kind, title, created_by)
    VALUES ('dm', v_other_name, v_uid)
    RETURNING id INTO v_thread_id;

  INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (v_thread_id, v_uid, 'owner') ON CONFLICT DO NOTHING;
  INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (v_thread_id, _other_user, 'member') ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (_other_user, 'New direct message',
            v_my_name || ' started a chat with you',
            'info', '/chat/' || v_thread_id);

  RETURN v_thread_id;
END $$;

-- ============ 3. Smart Semantic Search ============
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.search_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('quiz','tutor','library','curriculum','note')),
  entity_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  url text NOT NULL,
  owner_id uuid,
  is_public boolean NOT NULL DEFAULT true,
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS search_index_embedding_idx
  ON public.search_index USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS search_index_entity_idx
  ON public.search_index (entity_type, is_public);

ALTER TABLE public.search_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public + own search rows readable"
  ON public.search_index FOR SELECT
  TO authenticated
  USING (is_public OR owner_id = auth.uid());

CREATE POLICY "Admins manage search index"
  ON public.search_index FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.match_search_index(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  filter_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id uuid,
  title text,
  body text,
  url text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.entity_type, s.entity_id, s.title, s.body, s.url,
         1 - (s.embedding <=> query_embedding) AS similarity
    FROM public.search_index s
   WHERE s.embedding IS NOT NULL
     AND (s.is_public OR s.owner_id = auth.uid())
     AND (filter_type IS NULL OR s.entity_type = filter_type)
   ORDER BY s.embedding <=> query_embedding
   LIMIT match_count;
$$;

-- ============ 4. Growth: in-app campaigns ============
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  cta_label text,
  cta_url text,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','students','tutors','inactive')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  image_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_dismissals (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views active campaigns"
  ON public.campaigns FOR SELECT TO authenticated
  USING (is_active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "Admins manage campaigns"
  ON public.campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users dismiss their own"
  ON public.campaign_dismissals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
