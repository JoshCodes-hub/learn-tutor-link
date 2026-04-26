-- Course Survival Kits: bundles of notes + likely Qs + model answers
CREATE TABLE public.course_survival_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  tutor_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  contents JSONB NOT NULL DEFAULT '{}'::jsonb,
  token_cost INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_survival_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active kits"
ON public.course_survival_kits FOR SELECT
USING (is_active = true OR tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tutors create their kits"
ON public.course_survival_kits FOR INSERT
WITH CHECK (has_role(auth.uid(), 'tutor'::app_role) AND tutor_id = auth.uid());

CREATE POLICY "Tutors update their kits"
ON public.course_survival_kits FOR UPDATE
USING (tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tutors delete their kits"
ON public.course_survival_kits FOR DELETE
USING (tutor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_survival_kits_updated_at
BEFORE UPDATE ON public.course_survival_kits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_survival_kits_course ON public.course_survival_kits(course_id);
CREATE INDEX idx_survival_kits_tutor ON public.course_survival_kits(tutor_id);