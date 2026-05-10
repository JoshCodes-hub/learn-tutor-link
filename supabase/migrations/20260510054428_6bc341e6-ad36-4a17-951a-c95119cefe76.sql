
-- 1. Invite controls on threads
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_single_use BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_used_at TIMESTAMPTZ;

-- Update join_brainstorm_thread with checks + regenerate-aware
CREATE OR REPLACE FUNCTION public.join_brainstorm_thread(_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; uid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT id, created_by, invite_expires_at, invite_single_use, invite_used_at
    INTO r
    FROM public.chat_threads
   WHERE invite_code = _code AND kind = 'brainstorm'
   LIMIT 1;
  IF r.id IS NULL THEN RAISE EXCEPTION 'invalid code'; END IF;

  IF r.invite_expires_at IS NOT NULL AND r.invite_expires_at < now() THEN
    RAISE EXCEPTION 'invite expired';
  END IF;

  IF r.invite_single_use AND r.invite_used_at IS NOT NULL THEN
    -- already consumed; allow only the original creator or existing members in
    IF NOT EXISTS (
      SELECT 1 FROM public.chat_thread_members WHERE thread_id = r.id AND user_id = uid
    ) THEN
      RAISE EXCEPTION 'invite already used';
    END IF;
    RETURN r.id;
  END IF;

  INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (r.id, uid, 'member')
    ON CONFLICT DO NOTHING;

  IF r.invite_single_use AND uid <> r.created_by THEN
    UPDATE public.chat_threads SET invite_used_at = now() WHERE id = r.id;
  END IF;

  RETURN r.id;
END $$;

-- 2. Reports
CREATE TABLE IF NOT EXISTS public.chat_message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/reviewed/dismissed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, reporter_id)
);
ALTER TABLE public.chat_message_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own reports"
  ON public.chat_message_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "users read own reports"
  ON public.chat_message_reports FOR SELECT
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update reports"
  ON public.chat_message_reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. User blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own blocks"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "users insert own blocks"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "users delete own blocks"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- 4. Notifications on new chat messages
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  thread_rec RECORD;
  author_name TEXT;
  member RECORD;
  preview TEXT;
  pref BOOLEAN;
BEGIN
  SELECT * INTO thread_rec FROM public.chat_threads WHERE id = NEW.thread_id;
  IF thread_rec IS NULL THEN RETURN NEW; END IF;

  IF NEW.is_ai THEN
    author_name := 'OverraPrep AI';
  ELSE
    SELECT COALESCE(full_name, 'Someone') INTO author_name
      FROM public.profiles WHERE id = NEW.author_id;
  END IF;

  preview := LEFT(NEW.content, 120);

  FOR member IN
    SELECT user_id FROM public.chat_thread_members
    WHERE thread_id = NEW.thread_id
      AND (NEW.author_id IS NULL OR user_id <> NEW.author_id)
  LOOP
    -- skip if member has blocked the author
    IF NEW.author_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE blocker_id = member.user_id AND blocked_id = NEW.author_id
    ) THEN CONTINUE; END IF;

    -- respect notify_messages preference (default true)
    SELECT COALESCE(notify_messages, true) INTO pref
      FROM public.notification_preferences WHERE user_id = member.user_id;
    IF pref IS NULL THEN pref := true; END IF;
    IF NOT pref THEN CONTINUE; END IF;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      member.user_id,
      author_name || ' in ' || COALESCE(thread_rec.title, 'a chat'),
      preview,
      'info',
      '/chat/' || thread_rec.id
    );
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_chat_message ON public.chat_messages;
CREATE TRIGGER trg_notify_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_chat_message();

-- Add notify_messages column to preferences if missing
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notify_messages BOOLEAN NOT NULL DEFAULT true;
