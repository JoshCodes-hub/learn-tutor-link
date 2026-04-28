-- =========================================================
-- Tables (create first, then policies referencing helper)
-- =========================================================

CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  state text,
  lga text,
  address text,
  logo_url text,
  phone text,
  email text,
  approval_number text,
  motto text,
  principal_name text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.school_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_role text NOT NULL CHECK (member_role IN ('owner','admin','teacher','parent','student')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id, member_role)
);
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.school_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  level text NOT NULL,
  arm text NOT NULL DEFAULT 'A',
  class_teacher_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.school_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.school_subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.class_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.school_subjects(id) ON DELETE CASCADE,
  teacher_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject_id)
);
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.school_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE SET NULL,
  user_id uuid,
  full_name text NOT NULL,
  student_code text NOT NULL,
  gender text,
  date_of_birth date,
  parent_user_id uuid,
  parent_phone text,
  parent_email text,
  admission_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_code)
);
ALTER TABLE public.school_students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.school_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session text NOT NULL,
  term int NOT NULL CHECK (term IN (1,2,3)),
  starts_on date,
  ends_on date,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, session, term)
);
ALTER TABLE public.school_terms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('present','absent','late','excused')),
  marked_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES public.school_terms(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.school_subjects(id) ON DELETE CASCADE,
  ca1 numeric(5,2) DEFAULT 0,
  ca2 numeric(5,2) DEFAULT 0,
  exam numeric(5,2) DEFAULT 0,
  total numeric(5,2) GENERATED ALWAYS AS (COALESCE(ca1,0)+COALESCE(ca2,0)+COALESCE(exam,0)) STORED,
  grade text,
  position int,
  remark text,
  teacher_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (term_id, student_id, subject_id)
);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.school_terms(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fee_id uuid NOT NULL REFERENCES public.fees(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  receipt_no text,
  method text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.school_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','parents','students','teachers','class')),
  class_id uuid REFERENCES public.school_classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period_no int NOT NULL,
  subject_id uuid REFERENCES public.school_subjects(id) ON DELETE SET NULL,
  teacher_id uuid,
  start_time time,
  end_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, day_of_week, period_no)
);
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Helper: is current user a member of a school?
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_school_member(_school_id uuid, _role text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members sm
    WHERE sm.school_id = _school_id
      AND sm.user_id = auth.uid()
      AND (_role IS NULL OR sm.member_role = _role)
  )
$$;

-- =========================================================
-- Auto-add owner on school insert
-- =========================================================
CREATE OR REPLACE FUNCTION public.add_school_owner_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.school_members (school_id, user_id, member_role)
  VALUES (NEW.id, NEW.owner_id, 'owner') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.owner_id, 'school_owner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER schools_auto_owner AFTER INSERT ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.add_school_owner_member();

CREATE TRIGGER schools_updated BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER results_updated BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- POLICIES
-- =========================================================

-- schools
CREATE POLICY "schools_insert_owner" ON public.schools
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "schools_select_members" ON public.schools
  FOR SELECT USING (owner_id = auth.uid() OR public.is_school_member(id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "schools_update_owner_admin" ON public.schools
  FOR UPDATE USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "schools_delete_admin" ON public.schools
  FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- school_members
CREATE POLICY "sm_select" ON public.school_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_school_member(school_id,'owner')
    OR public.is_school_member(school_id,'admin')
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "sm_all" ON public.school_members
  FOR ALL USING (
    public.is_school_member(school_id,'owner')
    OR public.is_school_member(school_id,'admin')
    OR public.has_role(auth.uid(),'admin')
  ) WITH CHECK (
    public.is_school_member(school_id,'owner')
    OR public.is_school_member(school_id,'admin')
    OR public.has_role(auth.uid(),'admin')
  );

-- school_classes
CREATE POLICY "sc_select" ON public.school_classes
  FOR SELECT USING (public.is_school_member(school_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "sc_all" ON public.school_classes
  FOR ALL USING (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'));

-- school_subjects
CREATE POLICY "ssub_select" ON public.school_subjects
  FOR SELECT USING (public.is_school_member(school_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ssub_all" ON public.school_subjects
  FOR ALL USING (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'));

-- class_subjects
CREATE POLICY "cs_select" ON public.class_subjects
  FOR SELECT USING (public.is_school_member(school_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cs_all" ON public.class_subjects
  FOR ALL USING (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'));

-- school_students
CREATE POLICY "ss_select" ON public.school_students
  FOR SELECT USING (
    public.is_school_member(school_id,'owner')
    OR public.is_school_member(school_id,'admin')
    OR public.is_school_member(school_id,'teacher')
    OR user_id = auth.uid()
    OR parent_user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "ss_all" ON public.school_students
  FOR ALL USING (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'));

-- school_terms
CREATE POLICY "st_select" ON public.school_terms
  FOR SELECT USING (public.is_school_member(school_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "st_all" ON public.school_terms
  FOR ALL USING (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'));

-- attendance
CREATE POLICY "att_select" ON public.attendance
  FOR SELECT USING (
    public.is_school_member(school_id,'owner')
    OR public.is_school_member(school_id,'admin')
    OR public.is_school_member(school_id,'teacher')
    OR EXISTS(SELECT 1 FROM public.school_students s WHERE s.id=attendance.student_id AND (s.user_id=auth.uid() OR s.parent_user_id=auth.uid()))
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "att_all" ON public.attendance
  FOR ALL USING (
    public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin')
    OR public.is_school_member(school_id,'teacher') OR public.has_role(auth.uid(),'admin')
  ) WITH CHECK (
    public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin')
    OR public.is_school_member(school_id,'teacher') OR public.has_role(auth.uid(),'admin')
  );

-- results
CREATE POLICY "res_select" ON public.results
  FOR SELECT USING (
    public.is_school_member(school_id,'owner')
    OR public.is_school_member(school_id,'admin')
    OR public.is_school_member(school_id,'teacher')
    OR EXISTS(SELECT 1 FROM public.school_students s WHERE s.id=results.student_id AND (s.user_id=auth.uid() OR s.parent_user_id=auth.uid()))
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "res_all" ON public.results
  FOR ALL USING (
    public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin')
    OR public.is_school_member(school_id,'teacher') OR public.has_role(auth.uid(),'admin')
  ) WITH CHECK (
    public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin')
    OR public.is_school_member(school_id,'teacher') OR public.has_role(auth.uid(),'admin')
  );

-- fees
CREATE POLICY "fees_select" ON public.fees
  FOR SELECT USING (public.is_school_member(school_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fees_all" ON public.fees
  FOR ALL USING (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'));

-- fee_payments
CREATE POLICY "fp_select" ON public.fee_payments
  FOR SELECT USING (
    public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin')
    OR EXISTS(SELECT 1 FROM public.school_students s WHERE s.id=fee_payments.student_id AND (s.user_id=auth.uid() OR s.parent_user_id=auth.uid()))
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "fp_all" ON public.fee_payments
  FOR ALL USING (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'));

-- school_announcements
CREATE POLICY "sa_select" ON public.school_announcements
  FOR SELECT USING (public.is_school_member(school_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "sa_all" ON public.school_announcements
  FOR ALL USING (
    public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin')
    OR public.is_school_member(school_id,'teacher') OR public.has_role(auth.uid(),'admin')
  ) WITH CHECK (
    public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin')
    OR public.is_school_member(school_id,'teacher') OR public.has_role(auth.uid(),'admin')
  );

-- timetable
CREATE POLICY "tt_select" ON public.timetable
  FOR SELECT USING (public.is_school_member(school_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tt_all" ON public.timetable
  FOR ALL USING (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_school_member(school_id,'owner') OR public.is_school_member(school_id,'admin') OR public.has_role(auth.uid(),'admin'));

-- Quizzes school scoping
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS school_class_id uuid REFERENCES public.school_classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quizzes_school ON public.quizzes(school_id);
CREATE INDEX IF NOT EXISTS idx_school_students_class ON public.school_students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_results_student ON public.results(student_id);
CREATE INDEX IF NOT EXISTS idx_school_members_user ON public.school_members(user_id);
