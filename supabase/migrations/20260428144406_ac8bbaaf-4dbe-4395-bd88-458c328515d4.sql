-- Report card verifications: persist a verifiable record per student/term so a public page can validate authenticity
CREATE TABLE IF NOT EXISTS public.report_card_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES public.school_terms(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  school_name text NOT NULL,
  class_label text,
  term_label text,
  total_score numeric(8,2),
  average_score numeric(6,2),
  position int,
  class_size int,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid,
  UNIQUE (term_id, student_id)
);

ALTER TABLE public.report_card_verifications ENABLE ROW LEVEL SECURITY;

-- Public can validate by ID (read-only). No row enumeration needed; lookup is by verification_id which is opaque.
CREATE POLICY "rcv_public_select" ON public.report_card_verifications
FOR SELECT USING (true);

-- Only school owners/staff can issue verifications for their school
CREATE POLICY "rcv_insert_school" ON public.report_card_verifications
FOR INSERT WITH CHECK (public.is_school_member(school_id));

CREATE POLICY "rcv_update_school" ON public.report_card_verifications
FOR UPDATE USING (public.is_school_member(school_id));

CREATE INDEX IF NOT EXISTS idx_rcv_student ON public.report_card_verifications(student_id);
CREATE INDEX IF NOT EXISTS idx_rcv_school ON public.report_card_verifications(school_id);

-- Tutor onboarding checklist progress
CREATE TABLE IF NOT EXISTS public.tutor_onboarding (
  user_id uuid PRIMARY KEY,
  profile_completed boolean NOT NULL DEFAULT false,
  course_created boolean NOT NULL DEFAULT false,
  quiz_created boolean NOT NULL DEFAULT false,
  bank_added boolean NOT NULL DEFAULT false,
  community_created boolean NOT NULL DEFAULT false,
  dismissed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tutor_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "to_self_select" ON public.tutor_onboarding
FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "to_self_upsert" ON public.tutor_onboarding
FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "to_self_update" ON public.tutor_onboarding
FOR UPDATE USING (auth.uid() = user_id);