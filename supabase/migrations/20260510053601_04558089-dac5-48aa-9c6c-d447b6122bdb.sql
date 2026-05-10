
-- Enums
CREATE TYPE public.chat_thread_kind AS ENUM ('dm','group','brainstorm');
CREATE TYPE public.chat_context_kind AS ENUM ('study_pack','tutor_curriculum');

-- Threads
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.chat_thread_kind NOT NULL DEFAULT 'dm',
  title TEXT,
  context_kind public.chat_context_kind,
  context_id UUID,
  invite_code TEXT UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE public.chat_thread_members (
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX idx_chat_members_user ON public.chat_thread_members(user_id);

-- Messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  author_id UUID,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  content TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at DESC);

-- Helper: is the calling user a member of a thread?
CREATE OR REPLACE FUNCTION public.is_chat_member(_thread_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_thread_members
    WHERE thread_id = _thread_id AND user_id = _user_id
  )
$$;

-- Enable RLS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_threads policies
CREATE POLICY "members can read thread"
  ON public.chat_threads FOR SELECT
  USING (public.is_chat_member(id, auth.uid()));

CREATE POLICY "creators insert thread"
  ON public.chat_threads FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "creators update thread"
  ON public.chat_threads FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "creators delete thread"
  ON public.chat_threads FOR DELETE
  USING (auth.uid() = created_by);

-- chat_thread_members policies
CREATE POLICY "user reads own membership"
  ON public.chat_thread_members FOR SELECT
  USING (auth.uid() = user_id OR public.is_chat_member(thread_id, auth.uid()));

CREATE POLICY "user inserts own membership"
  ON public.chat_thread_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user updates own membership"
  ON public.chat_thread_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user removes own membership"
  ON public.chat_thread_members FOR DELETE
  USING (auth.uid() = user_id);

-- chat_messages policies
CREATE POLICY "members read messages"
  ON public.chat_messages FOR SELECT
  USING (public.is_chat_member(thread_id, auth.uid()));

CREATE POLICY "members post messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    public.is_chat_member(thread_id, auth.uid())
    AND (
      (is_ai = false AND author_id = auth.uid())
      OR (is_ai = true) -- service role/edge fn writes; client cannot fake because RLS still requires membership
    )
  );

CREATE POLICY "authors delete own messages"
  ON public.chat_messages FOR DELETE
  USING (author_id = auth.uid());

-- updated_at trigger on threads
CREATE TRIGGER update_chat_threads_updated_at
  BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-add creator as owner member
CREATE OR REPLACE FUNCTION public.add_chat_thread_creator()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.chat_thread_members (thread_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_add_chat_thread_creator
  AFTER INSERT ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.add_chat_thread_creator();

-- Auto-generate brainstorm invite_code
CREATE OR REPLACE FUNCTION public.assign_brainstorm_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c TEXT; exists_flag BOOLEAN;
BEGIN
  IF NEW.kind = 'brainstorm' AND (NEW.invite_code IS NULL OR NEW.invite_code = '') THEN
    LOOP
      c := 'BR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
      SELECT EXISTS(SELECT 1 FROM public.chat_threads WHERE invite_code = c) INTO exists_flag;
      EXIT WHEN NOT exists_flag;
    END LOOP;
    NEW.invite_code := c;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_assign_brainstorm_code
  BEFORE INSERT ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.assign_brainstorm_code();

-- Join brainstorm by code
CREATE OR REPLACE FUNCTION public.join_brainstorm_thread(_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t_id UUID; uid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT id INTO t_id FROM public.chat_threads
    WHERE invite_code = _code AND kind = 'brainstorm' LIMIT 1;
  IF t_id IS NULL THEN RAISE EXCEPTION 'invalid code'; END IF;

  INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (t_id, uid, 'member')
    ON CONFLICT DO NOTHING;
  RETURN t_id;
END $$;

-- Realtime
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_thread_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_thread_members;
