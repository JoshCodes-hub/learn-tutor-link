
-- 1. opportunity_applications
CREATE TABLE IF NOT EXISTS public.opportunity_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'interested' CHECK (status IN ('interested','applied','accepted','rejected')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, user_id)
);
ALTER TABLE public.opportunity_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own apps" ON public.opportunity_applications
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "owner inserts own apps" ON public.opportunity_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner updates own apps" ON public.opportunity_applications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner deletes own apps" ON public.opportunity_applications
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_opportunity_apps_updated
  BEFORE UPDATE ON public.opportunity_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_opp_apps_user ON public.opportunity_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_opp_apps_opp ON public.opportunity_applications(opportunity_id);

-- 2. refund_events
CREATE TABLE IF NOT EXISTS public.refund_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  paddle_transaction_id TEXT UNIQUE,
  amount_cents INTEGER,
  currency TEXT,
  reason TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.refund_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read refunds" ON public.refund_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins insert refunds" ON public.refund_events
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. audit_logs search index
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
  ON public.audit_logs (action, created_at DESC);

-- 4. suspicious purchase flag trigger (only if token_purchases exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='token_purchases') THEN
    CREATE OR REPLACE FUNCTION public.flag_suspicious_purchase()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
    DECLARE v_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_count FROM public.token_purchases
        WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour';
      IF v_count > 3 THEN
        INSERT INTO public.audit_logs (admin_id, action, table_name, record_id, new_data)
        VALUES (NEW.user_id, 'suspicious_purchase_burst', 'token_purchases', NEW.id,
                jsonb_build_object('count_last_hour', v_count, 'amount', NEW.amount_cents));
      END IF;
      RETURN NEW;
    END $f$;
    DROP TRIGGER IF EXISTS trg_flag_suspicious_purchase ON public.token_purchases;
    CREATE TRIGGER trg_flag_suspicious_purchase
      AFTER INSERT ON public.token_purchases
      FOR EACH ROW EXECUTE FUNCTION public.flag_suspicious_purchase();
  END IF;
END $$;

-- 5. admin RPCs
CREATE OR REPLACE FUNCTION public.admin_revoke_all_sessions(_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.device_login_history WHERE user_id = _user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  INSERT INTO public.audit_logs (admin_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'revoke_all_sessions', 'device_login_history', _user_id,
          jsonb_build_object('removed', v_n));
  RETURN v_n;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_tutor_status(_user_id UUID, _status TEXT, _reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _status NOT IN ('active','warned','suspended') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.profiles SET tutor_status = _status, updated_at = now() WHERE id = _user_id;
  INSERT INTO public.audit_logs (admin_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'tutor_status_change', 'profiles', _user_id,
          jsonb_build_object('status', _status, 'reason', _reason));
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (_user_id,
    CASE _status WHEN 'suspended' THEN 'Account suspended'
                 WHEN 'warned' THEN 'Account warning'
                 ELSE 'Account reinstated' END,
    COALESCE(_reason, 'Admin updated your tutor status to ' || _status),
    CASE _status WHEN 'active' THEN 'success' ELSE 'warning' END,
    '/tutor/dashboard');
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_kpis()
RETURNS TABLE(
  pending_tutor_apps INTEGER,
  low_trust_users_24h INTEGER,
  open_moderation_reports INTEGER,
  opportunities_expiring_7d INTEGER,
  refunds_24h INTEGER
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  pending_tutor_apps := (SELECT COUNT(*)::INTEGER FROM public.tutor_applications WHERE status = 'pending');
  low_trust_users_24h := 0;
  open_moderation_reports := COALESCE(
    (SELECT COUNT(*)::INTEGER FROM public.chat_message_reports WHERE resolved_at IS NULL), 0);
  opportunities_expiring_7d := (SELECT COUNT(*)::INTEGER FROM public.opportunities
     WHERE status = 'published' AND deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + 7);
  refunds_24h := (SELECT COUNT(*)::INTEGER FROM public.refund_events WHERE created_at > now() - interval '24 hours');
  RETURN NEXT;
END $$;

-- 6. deadline reminder helper (used by edge function cron)
CREATE OR REPLACE FUNCTION public.opportunities_needing_reminder()
RETURNS TABLE(user_id UUID, opportunity_id UUID, title TEXT, deadline DATE, hours_left INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ob.user_id, o.id, o.title, o.deadline,
         EXTRACT(EPOCH FROM (o.deadline::timestamptz - now()))::INTEGER / 3600
  FROM public.opportunity_bookmarks ob
  JOIN public.opportunities o ON o.id = ob.opportunity_id
  WHERE o.status = 'published'
    AND o.deadline IS NOT NULL
    AND o.deadline >= CURRENT_DATE
    AND o.deadline <= CURRENT_DATE + 3
$$;

-- 7. tutor_status column safety (default + check)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='profiles' AND column_name='tutor_status') THEN
    ALTER TABLE public.profiles ADD COLUMN tutor_status TEXT DEFAULT 'active';
  END IF;
END $$;
