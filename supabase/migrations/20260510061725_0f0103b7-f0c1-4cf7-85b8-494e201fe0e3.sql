
-- 1. REMEDIATION PLAYLISTS
CREATE TABLE public.remediation_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempt_id uuid REFERENCES public.mock_exam_attempts(id) ON DELETE SET NULL,
  exam_id uuid,
  title text NOT NULL DEFAULT 'Remediation Plan',
  content text NOT NULL DEFAULT '',
  topic_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_bookmarked boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rem_playlists_user ON public.remediation_playlists(user_id, created_at DESC);
ALTER TABLE public.remediation_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own playlists select" ON public.remediation_playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own playlists insert" ON public.remediation_playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own playlists update" ON public.remediation_playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own playlists delete" ON public.remediation_playlists FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_rem_playlists_updated BEFORE UPDATE ON public.remediation_playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. EXAM PROCTOR EVENTS
CREATE TABLE public.exam_proctor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.mock_exam_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'blur',
  duration_ms integer NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_proctor_attempt ON public.exam_proctor_events(attempt_id, occurred_at);
ALTER TABLE public.exam_proctor_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own proctor select" ON public.exam_proctor_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own proctor insert" ON public.exam_proctor_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. SESSION PAYMENTS — extend slots & bookings
ALTER TABLE public.tutor_session_slots
  ADD COLUMN IF NOT EXISTS price_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_share_bps integer NOT NULL DEFAULT 7000;

ALTER TABLE public.session_bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS tokens_paid integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_to_tutor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

ALTER TABLE public.tutor_earnings
  ADD COLUMN IF NOT EXISTS session_id uuid;

-- 4. NEW BOOK_SESSION (charges tokens, escrow)
CREATE OR REPLACE FUNCTION public.book_session(_slot_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_slot RECORD;
  v_count INT;
  v_thread_id UUID;
  v_booking_id UUID;
  v_wallet RECORD;
  v_tutor_share INT := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_slot FROM public.tutor_session_slots WHERE id = _slot_id;
  IF v_slot IS NULL THEN RAISE EXCEPTION 'slot not found'; END IF;
  IF v_slot.status <> 'open' THEN RAISE EXCEPTION 'slot not open'; END IF;
  IF v_slot.starts_at < now() THEN RAISE EXCEPTION 'slot already started'; END IF;
  IF v_slot.tutor_id = v_uid THEN RAISE EXCEPTION 'cannot book your own slot'; END IF;

  SELECT COUNT(*) INTO v_count FROM public.session_bookings
    WHERE slot_id = _slot_id AND status = 'confirmed';
  IF v_count >= v_slot.capacity THEN RAISE EXCEPTION 'slot full'; END IF;

  IF EXISTS (SELECT 1 FROM public.session_bookings
             WHERE slot_id = _slot_id AND student_id = v_uid AND status = 'confirmed') THEN
    RAISE EXCEPTION 'already booked';
  END IF;

  -- Charge tokens if priced
  IF v_slot.price_tokens > 0 THEN
    SELECT * INTO v_wallet FROM public.token_wallets WHERE user_id = v_uid FOR UPDATE;
    IF v_wallet IS NULL OR v_wallet.balance < v_slot.price_tokens THEN
      RAISE EXCEPTION 'insufficient tokens';
    END IF;
    UPDATE public.token_wallets
      SET balance = balance - v_slot.price_tokens, updated_at = now()
      WHERE id = v_wallet.id;
    INSERT INTO public.token_transactions (wallet_id, amount, type, description, reference_id)
      VALUES (v_wallet.id, -v_slot.price_tokens, 'debit',
              'Session booking: ' || v_slot.title, _slot_id);
    v_tutor_share := FLOOR(v_slot.price_tokens * v_slot.payout_share_bps / 10000.0);
  END IF;

  -- chat thread
  SELECT thread_id INTO v_thread_id FROM public.session_bookings
    WHERE slot_id = _slot_id AND thread_id IS NOT NULL LIMIT 1;
  IF v_thread_id IS NULL THEN
    INSERT INTO public.chat_threads (kind, title, context_kind, context_id, created_by)
    VALUES (
      CASE WHEN v_slot.capacity > 1 THEN 'group' ELSE 'dm' END,
      'Session: ' || v_slot.title, 'tutor_session', _slot_id, v_slot.tutor_id
    ) RETURNING id INTO v_thread_id;
  END IF;
  INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (v_thread_id, v_slot.tutor_id, 'owner') ON CONFLICT DO NOTHING;
  INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (v_thread_id, v_uid, 'member') ON CONFLICT DO NOTHING;

  INSERT INTO public.session_bookings (
    slot_id, student_id, thread_id, payment_status, tokens_paid, tokens_to_tutor
  ) VALUES (
    _slot_id, v_uid, v_thread_id,
    CASE WHEN v_slot.price_tokens > 0 THEN 'escrow' ELSE 'free' END,
    v_slot.price_tokens, v_tutor_share
  ) RETURNING id INTO v_booking_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_slot.tutor_id, 'New session booking',
    'A student booked "' || v_slot.title || '"' ||
      CASE WHEN v_slot.price_tokens > 0 THEN ' (' || v_tutor_share || ' tokens pending release)' ELSE '' END,
    'success', '/tutor/sessions');
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_uid, 'Session booked',
    'You booked "' || v_slot.title || '". We''ll remind you 15 minutes before.',
    'success', '/sessions');

  RETURN v_booking_id;
END;
$function$;

-- 5. COMPLETE_SESSION (release escrow to tutor)
CREATE OR REPLACE FUNCTION public.complete_session(_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_b RECORD;
  v_slot RECORD;
  v_tutor_wallet RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_b FROM public.session_bookings WHERE id = _booking_id;
  IF v_b IS NULL THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF v_b.released_at IS NOT NULL THEN RAISE EXCEPTION 'already released'; END IF;

  SELECT * INTO v_slot FROM public.tutor_session_slots WHERE id = v_b.slot_id;
  IF v_slot.tutor_id <> v_uid AND NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'only the tutor or admin can mark complete';
  END IF;

  UPDATE public.session_bookings
    SET completed_at = COALESCE(completed_at, now()),
        released_at = now(),
        payment_status = CASE WHEN tokens_paid > 0 THEN 'released' ELSE 'free' END,
        status = 'completed'
    WHERE id = _booking_id;

  IF v_b.tokens_to_tutor > 0 THEN
    SELECT * INTO v_tutor_wallet FROM public.token_wallets WHERE user_id = v_slot.tutor_id FOR UPDATE;
    IF v_tutor_wallet IS NULL THEN
      INSERT INTO public.token_wallets (user_id, balance, total_earned)
        VALUES (v_slot.tutor_id, v_b.tokens_to_tutor, v_b.tokens_to_tutor)
        RETURNING * INTO v_tutor_wallet;
    ELSE
      UPDATE public.token_wallets
        SET balance = balance + v_b.tokens_to_tutor,
            total_earned = total_earned + v_b.tokens_to_tutor,
            updated_at = now()
        WHERE id = v_tutor_wallet.id;
    END IF;
    INSERT INTO public.token_transactions (wallet_id, amount, type, description, reference_id)
      VALUES (v_tutor_wallet.id, v_b.tokens_to_tutor, 'session_payout',
              'Session payout: ' || v_slot.title, _booking_id);
    INSERT INTO public.tutor_earnings (
      tutor_id, student_id, session_id, tokens_paid, tutor_share, platform_share
    ) VALUES (
      v_slot.tutor_id, v_b.student_id, _booking_id,
      v_b.tokens_paid, v_b.tokens_to_tutor, v_b.tokens_paid - v_b.tokens_to_tutor
    );
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_b.student_id, 'Session completed',
    'Your session "' || v_slot.title || '" was marked complete.',
    'success', '/sessions');
  IF v_b.tokens_to_tutor > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_slot.tutor_id, 'Earnings released',
      v_b.tokens_to_tutor || ' tokens were credited to your wallet.',
      'success', '/tutor/dashboard');
  END IF;
END;
$function$;

-- 6. CANCEL_SESSION_BOOKING (student-side refund)
CREATE OR REPLACE FUNCTION public.cancel_session_booking(_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_b RECORD;
  v_slot RECORD;
  v_wallet RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_b FROM public.session_bookings WHERE id = _booking_id;
  IF v_b IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF v_b.released_at IS NOT NULL THEN RAISE EXCEPTION 'already completed'; END IF;
  IF v_b.status = 'cancelled' THEN RETURN; END IF;
  SELECT * INTO v_slot FROM public.tutor_session_slots WHERE id = v_b.slot_id;
  IF v_b.student_id <> v_uid AND v_slot.tutor_id <> v_uid THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  UPDATE public.session_bookings
    SET status = 'cancelled', payment_status = CASE WHEN tokens_paid > 0 THEN 'refunded' ELSE 'free' END
    WHERE id = _booking_id;

  IF v_b.tokens_paid > 0 THEN
    SELECT * INTO v_wallet FROM public.token_wallets WHERE user_id = v_b.student_id FOR UPDATE;
    IF v_wallet IS NOT NULL THEN
      UPDATE public.token_wallets
        SET balance = balance + v_b.tokens_paid, updated_at = now()
        WHERE id = v_wallet.id;
      INSERT INTO public.token_transactions (wallet_id, amount, type, description, reference_id)
        VALUES (v_wallet.id, v_b.tokens_paid, 'refund',
                'Session refund: ' || v_slot.title, _booking_id);
    END IF;
  END IF;
END;
$function$;
