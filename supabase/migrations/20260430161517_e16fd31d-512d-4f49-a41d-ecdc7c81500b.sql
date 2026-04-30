-- Notification preferences per user
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_likes BOOLEAN NOT NULL DEFAULT true,
  notify_comments BOOLEAN NOT NULL DEFAULT true,
  notify_mentions BOOLEAN NOT NULL DEFAULT true,
  notify_messages BOOLEAN NOT NULL DEFAULT true,
  notify_announcements BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own prefs" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own prefs" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: when a community_likes row is inserted, notify post author (respect prefs)
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author UUID;
  v_pref BOOLEAN;
  v_liker_name TEXT;
BEGIN
  SELECT author_id INTO v_author FROM public.community_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(notify_likes, true) INTO v_pref
    FROM public.notification_preferences WHERE user_id = v_author;
  IF v_pref IS NULL THEN v_pref := true; END IF;
  IF NOT v_pref THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Someone') INTO v_liker_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_author, 'New like', v_liker_name || ' liked your post', 'info', '/community-wall');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_post_like
  AFTER INSERT ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();

-- Trigger: notify post author on new comment (respect prefs)
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author UUID;
  v_pref BOOLEAN;
  v_commenter_name TEXT;
BEGIN
  SELECT author_id INTO v_author FROM public.community_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.author_id THEN RETURN NEW; END IF;

  SELECT COALESCE(notify_comments, true) INTO v_pref
    FROM public.notification_preferences WHERE user_id = v_author;
  IF v_pref IS NULL THEN v_pref := true; END IF;
  IF NOT v_pref THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Someone') INTO v_commenter_name FROM public.profiles WHERE id = NEW.author_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_author, 'New comment', v_commenter_name || ' commented on your post', 'info', '/community-wall');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_post_comment
  AFTER INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();