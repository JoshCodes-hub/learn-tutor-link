-- Create tutor earnings table to track earnings per quiz
CREATE TABLE public.tutor_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
  student_id UUID NOT NULL,
  tokens_paid INTEGER NOT NULL,
  tutor_share INTEGER NOT NULL,
  platform_share INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutor_earnings ENABLE ROW LEVEL SECURITY;

-- RLS policies for tutor_earnings
CREATE POLICY "Tutors can view their own earnings"
ON public.tutor_earnings
FOR SELECT
USING (tutor_id = auth.uid());

CREATE POLICY "Admins can view all earnings"
ON public.tutor_earnings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert earnings"
ON public.tutor_earnings
FOR INSERT
WITH CHECK (true);

-- Create withdrawal requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for withdrawal_requests
CREATE POLICY "Tutors can view their own withdrawals"
ON public.withdrawal_requests
FOR SELECT
USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can create withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (tutor_id = auth.uid());

CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawal_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update withdrawals"
ON public.withdrawal_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create token purchase requests table (for manual admin crediting)
CREATE TABLE public.token_purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tokens_requested INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_reference TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.token_purchase_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for token_purchase_requests
CREATE POLICY "Users can view their own purchase requests"
ON public.token_purchase_requests
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create purchase requests"
ON public.token_purchase_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all purchase requests"
ON public.token_purchase_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update purchase requests"
ON public.token_purchase_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create student quiz purchases table to track which premium quizzes students have unlocked
CREATE TABLE public.student_quiz_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  tokens_spent INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, quiz_id)
);

-- Enable RLS
ALTER TABLE public.student_quiz_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_quiz_purchases
CREATE POLICY "Students can view their own purchases"
ON public.student_quiz_purchases
FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "System can insert purchases"
ON public.student_quiz_purchases
FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all purchases"
ON public.student_quiz_purchases
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at on withdrawal_requests
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on token_purchase_requests
CREATE TRIGGER update_token_purchase_requests_updated_at
BEFORE UPDATE ON public.token_purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();