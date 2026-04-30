CREATE OR REPLACE FUNCTION public.notify_post_mentions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match TEXT;
  v_codes TEXT[];
  v_code TEXT;
  v_target UUID;
  v_pref BOOLEAN;
  v_author_name TEXT;
BEGIN
  IF NEW.content IS NULL OR NEW.content = '' THEN RETURN NEW; END IF;

  -- Extract all @TUT-XXXX style codes (case-insensitive)
  SELECT array_agg(DISTINCT UPPER(m[1]))
    INTO v_codes
    FROM regexp_matches(NEW.content, '@(TUT-[A-Z0-9]{4,})', 'gi') AS m;

  IF v_codes IS NULL OR array_length(v_codes, 1) = 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Someone') INTO v_author_name FROM public.profiles WHERE id = NEW.author_id;

  FOREACH v_code IN ARRAY v_codes LOOP
    SELECT id INTO v_target FROM public.profiles WHERE tutor_code = v_code LIMIT 1;
    IF v_target IS NULL OR v_target = NEW.author_id THEN CONTINUE; END IF;

    SELECT COALESCE(notify_mentions, true) INTO v_pref
      FROM public.notification_preferences WHERE user_id = v_target;
    IF v_pref IS NULL THEN v_pref := true; END IF;
    IF NOT v_pref THEN CONTINUE; END IF;

    INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (v_target, 'You were mentioned',
              v_author_name || ' mentioned you in a community post',
              'info', '/community-wall');
  END LOOP;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_post_mentions ON public.community_posts;
CREATE TRIGGER trg_notify_post_mentions
  AFTER INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_mentions();