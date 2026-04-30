
-- ============ LECTURE NOTES ============
CREATE TABLE public.lecture_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL,
  course_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes BIGINT,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lecture_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published lecture notes"
  ON public.lecture_notes FOR SELECT
  USING (is_published = true OR tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Tutors can insert their own notes"
  ON public.lecture_notes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'tutor') AND tutor_id = auth.uid());

CREATE POLICY "Tutors can update their own notes"
  ON public.lecture_notes FOR UPDATE
  USING (tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Tutors can delete their own notes"
  ON public.lecture_notes FOR DELETE
  USING (tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER lecture_notes_updated
  BEFORE UPDATE ON public.lecture_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lecture_notes_tutor ON public.lecture_notes(tutor_id);
CREATE INDEX idx_lecture_notes_course ON public.lecture_notes(course_id);

-- ============ DIRECT MESSAGES ============
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their DMs"
  ON public.direct_messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send DMs"
  ON public.direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can mark read"
  ON public.direct_messages FOR UPDATE
  USING (recipient_id = auth.uid());

CREATE INDEX idx_dm_pair ON public.direct_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_dm_recipient ON public.direct_messages(recipient_id, is_read);

-- ============ TUTOR ANNOUNCEMENTS ============
CREATE TABLE public.tutor_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL,
  course_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tutor_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view announcements"
  ON public.tutor_announcements FOR SELECT
  USING (true);

CREATE POLICY "Tutors create their announcements"
  ON public.tutor_announcements FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'tutor') AND tutor_id = auth.uid());

CREATE POLICY "Tutors update their announcements"
  ON public.tutor_announcements FOR UPDATE
  USING (tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Tutors delete their announcements"
  ON public.tutor_announcements FOR DELETE
  USING (tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER tutor_announcements_updated
  BEFORE UPDATE ON public.tutor_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tutor_announcements_tutor ON public.tutor_announcements(tutor_id, created_at DESC);

-- ============ Q&A BOARD ============
CREATE TABLE public.qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  answer_count INTEGER NOT NULL DEFAULT 0,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions" ON public.qa_questions FOR SELECT USING (true);
CREATE POLICY "Authed can ask questions" ON public.qa_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update their questions" ON public.qa_questions FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete their questions" ON public.qa_questions FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER qa_questions_updated
  BEFORE UPDATE ON public.qa_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view answers" ON public.qa_answers FOR SELECT USING (true);
CREATE POLICY "Authed can answer" ON public.qa_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update their answers" ON public.qa_answers FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete their answers" ON public.qa_answers FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER qa_answers_updated
  BEFORE UPDATE ON public.qa_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bump answer_count
CREATE OR REPLACE FUNCTION public.bump_qa_answer_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.qa_questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.qa_questions SET answer_count = GREATEST(answer_count - 1, 0) WHERE id = OLD.question_id;
  END IF;
  RETURN NULL;
END;$$;

CREATE TRIGGER qa_answer_count_trigger
  AFTER INSERT OR DELETE ON public.qa_answers
  FOR EACH ROW EXECUTE FUNCTION public.bump_qa_answer_count();

CREATE INDEX idx_qa_answers_question ON public.qa_answers(question_id, created_at);

-- ============ COMMUNITY MESSAGES ============
CREATE TABLE public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view community messages"
  ON public.community_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.community_members WHERE community_id = community_messages.community_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.tutor_communities WHERE id = community_messages.community_id AND tutor_id = auth.uid())
  );

CREATE POLICY "Members post community messages"
  ON public.community_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (SELECT 1 FROM public.community_members WHERE community_id = community_messages.community_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.tutor_communities WHERE id = community_messages.community_id AND tutor_id = auth.uid())
    )
  );

CREATE POLICY "Owners delete their community msgs"
  ON public.community_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_community_messages ON public.community_messages(community_id, created_at);

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('lecture-notes', 'lecture-notes', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view lecture-notes files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lecture-notes');

CREATE POLICY "Tutors can upload lecture-notes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lecture-notes' AND has_role(auth.uid(), 'tutor') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tutors can update their lecture-notes"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'lecture-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tutors can delete their lecture-notes"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lecture-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tutor_announcements;
