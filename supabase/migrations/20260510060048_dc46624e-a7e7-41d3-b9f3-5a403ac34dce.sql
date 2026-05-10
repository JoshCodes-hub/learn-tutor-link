
-- ============ PHASE 6: SRS + SESSIONS + MOCK EXAMS ============

-- =========== 6A: SPACED REPETITION ===========
CREATE TABLE public.srs_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'flashcard' | 'note' | 'summary'
  source_id UUID,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  tag TEXT,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_srs_cards_user_due ON public.srs_cards(user_id, due_at);
ALTER TABLE public.srs_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read srs" ON public.srs_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner insert srs" ON public.srs_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update srs" ON public.srs_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner delete srs" ON public.srs_cards FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_srs_cards_updated BEFORE UPDATE ON public.srs_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.srs_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.srs_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  quality SMALLINT NOT NULL,
  prev_interval_days INTEGER,
  new_interval_days INTEGER,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_srs_reviews_user_date ON public.srs_reviews(user_id, reviewed_at);
ALTER TABLE public.srs_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read srs reviews" ON public.srs_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner insert srs reviews" ON public.srs_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =========== 6B: TUTOR SESSIONS ===========
CREATE TABLE public.tutor_session_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL,
  curriculum_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  capacity INTEGER NOT NULL DEFAULT 1,
  meeting_url TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'cancelled' | 'completed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_session_slots_starts ON public.tutor_session_slots(starts_at);
CREATE INDEX idx_session_slots_tutor ON public.tutor_session_slots(tutor_id);
ALTER TABLE public.tutor_session_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view open slots" ON public.tutor_session_slots
  FOR SELECT USING (true);
CREATE POLICY "tutor manage own slots" ON public.tutor_session_slots
  FOR ALL USING (auth.uid() = tutor_id) WITH CHECK (auth.uid() = tutor_id);
CREATE TRIGGER trg_session_slots_updated BEFORE UPDATE ON public.tutor_session_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.session_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.tutor_session_slots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed' | 'cancelled' | 'attended' | 'no_show'
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(slot_id, student_id)
);
CREATE INDEX idx_bookings_student ON public.session_bookings(student_id);
ALTER TABLE public.session_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student or tutor view bookings" ON public.session_bookings
  FOR SELECT USING (
    auth.uid() = student_id OR
    auth.uid() IN (SELECT tutor_id FROM public.tutor_session_slots WHERE id = slot_id)
  );
CREATE POLICY "student book" ON public.session_bookings
  FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "student or tutor update" ON public.session_bookings
  FOR UPDATE USING (
    auth.uid() = student_id OR
    auth.uid() IN (SELECT tutor_id FROM public.tutor_session_slots WHERE id = slot_id)
  );

CREATE OR REPLACE FUNCTION public.book_session(_slot_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_slot RECORD;
  v_count INT;
  v_thread_id UUID;
  v_booking_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_slot FROM public.tutor_session_slots WHERE id = _slot_id;
  IF v_slot IS NULL THEN RAISE EXCEPTION 'slot not found'; END IF;
  IF v_slot.status <> 'open' THEN RAISE EXCEPTION 'slot not open'; END IF;
  IF v_slot.starts_at < now() THEN RAISE EXCEPTION 'slot already started'; END IF;

  SELECT COUNT(*) INTO v_count FROM public.session_bookings
    WHERE slot_id = _slot_id AND status = 'confirmed';
  IF v_count >= v_slot.capacity THEN RAISE EXCEPTION 'slot full'; END IF;

  -- find or create a chat thread for this booking
  SELECT thread_id INTO v_thread_id FROM public.session_bookings
    WHERE slot_id = _slot_id AND thread_id IS NOT NULL LIMIT 1;
  IF v_thread_id IS NULL THEN
    INSERT INTO public.chat_threads (kind, title, context_kind, context_id, created_by)
    VALUES (
      CASE WHEN v_slot.capacity > 1 THEN 'group' ELSE 'dm' END,
      'Session: ' || v_slot.title,
      'tutor_session',
      _slot_id,
      v_slot.tutor_id
    )
    RETURNING id INTO v_thread_id;
  END IF;

  -- ensure both members
  INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (v_thread_id, v_slot.tutor_id, 'owner') ON CONFLICT DO NOTHING;
  INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (v_thread_id, v_uid, 'member') ON CONFLICT DO NOTHING;

  INSERT INTO public.session_bookings (slot_id, student_id, thread_id)
    VALUES (_slot_id, v_uid, v_thread_id)
    RETURNING id INTO v_booking_id;

  -- notify tutor
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_slot.tutor_id, 'New session booking',
    'A student booked "' || v_slot.title || '"',
    'success', '/tutor/sessions'
  );
  -- confirm to student
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_uid, 'Session booked',
    'You booked "' || v_slot.title || '". We''ll remind you 15 minutes before.',
    'success', '/sessions'
  );

  RETURN v_booking_id;
END;
$$;

-- =========== 6D: MOCK EXAMS ===========
CREATE TABLE public.mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_min INTEGER NOT NULL DEFAULT 60,
  total_questions INTEGER NOT NULL DEFAULT 30,
  topic_ids UUID[] DEFAULT '{}',
  course_id UUID,
  created_by UUID NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view published exams" ON public.mock_exams
  FOR SELECT USING (is_published OR auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "creator manage exam" ON public.mock_exams
  FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE TRIGGER trg_mock_exams_updated BEFORE UPDATE ON public.mock_exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mock_exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mock_exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  tab_blur_count INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  topic_breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mock_attempts_user ON public.mock_exam_attempts(user_id);
ALTER TABLE public.mock_exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner view attempts" ON public.mock_exam_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner insert attempt" ON public.mock_exam_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update attempt" ON public.mock_exam_attempts
  FOR UPDATE USING (auth.uid() = user_id);
