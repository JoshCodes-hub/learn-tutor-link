-- Create question_reports table for students to flag problematic questions
CREATE TABLE public.question_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  tutor_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

-- Students can view their own reports
CREATE POLICY "Users can view their own reports" 
ON public.question_reports 
FOR SELECT 
USING (auth.uid() = reporter_id);

-- Students can create reports
CREATE POLICY "Users can create reports" 
ON public.question_reports 
FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

-- Tutors can view reports on their questions
CREATE POLICY "Tutors can view reports on their questions" 
ON public.question_reports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.questions q 
    WHERE q.id = question_id AND q.tutor_id = auth.uid()
  )
);

-- Tutors can update reports on their questions
CREATE POLICY "Tutors can update reports on their questions" 
ON public.question_reports 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.questions q 
    WHERE q.id = question_id AND q.tutor_id = auth.uid()
  )
);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" 
ON public.question_reports 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all reports
CREATE POLICY "Admins can update all reports" 
ON public.question_reports 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for faster lookups
CREATE INDEX idx_question_reports_question_id ON public.question_reports(question_id);
CREATE INDEX idx_question_reports_reporter_id ON public.question_reports(reporter_id);
CREATE INDEX idx_question_reports_status ON public.question_reports(status);

-- Add trigger for updated_at
CREATE TRIGGER update_question_reports_updated_at
BEFORE UPDATE ON public.question_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();