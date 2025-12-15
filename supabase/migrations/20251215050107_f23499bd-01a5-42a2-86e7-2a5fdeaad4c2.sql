-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES auth.users(id),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quizzes table (for organized quiz sets)
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  question_count INTEGER NOT NULL DEFAULT 20,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  token_cost INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_questions junction table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  UNIQUE(quiz_id, question_id)
);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'simulation')),
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_answers table
CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option CHAR(1) CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create token_wallets table
CREATE TABLE public.token_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 50,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create token_transactions table
CREATE TABLE public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.token_wallets(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  description TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses (public read)
CREATE POLICY "Anyone can view active courses" ON public.courses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tutors can create courses" ON public.courses
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'tutor'));

-- RLS Policies for topics (public read)
CREATE POLICY "Anyone can view topics" ON public.topics
  FOR SELECT USING (true);

CREATE POLICY "Tutors can manage topics" ON public.topics
  FOR ALL USING (public.has_role(auth.uid(), 'tutor') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for questions
CREATE POLICY "Users can view approved questions" ON public.questions
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Tutors can view their own questions" ON public.questions
  FOR SELECT USING (tutor_id = auth.uid());

CREATE POLICY "Tutors can create questions" ON public.questions
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'tutor'));

CREATE POLICY "Admins can manage all questions" ON public.questions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quizzes
CREATE POLICY "Users can view active quizzes" ON public.quizzes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Tutors can manage their quizzes" ON public.quizzes
  FOR ALL USING (tutor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quiz_questions
CREATE POLICY "Users can view quiz questions" ON public.quiz_questions
  FOR SELECT USING (true);

CREATE POLICY "Tutors can manage quiz questions" ON public.quiz_questions
  FOR ALL USING (public.has_role(auth.uid(), 'tutor') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quiz_attempts
CREATE POLICY "Users can view their own attempts" ON public.quiz_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own attempts" ON public.quiz_attempts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all attempts" ON public.quiz_attempts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quiz_answers
CREATE POLICY "Users can view their own answers" ON public.quiz_answers
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own answers" ON public.quiz_answers
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_attempts WHERE id = attempt_id AND user_id = auth.uid()
  ));

-- RLS Policies for token_wallets
CREATE POLICY "Users can view their own wallet" ON public.token_wallets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own wallet" ON public.token_wallets
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert wallets" ON public.token_wallets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for token_transactions
CREATE POLICY "Users can view their own transactions" ON public.token_transactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.token_wallets WHERE id = wallet_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create transactions for their wallet" ON public.token_transactions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.token_wallets WHERE id = wallet_id AND user_id = auth.uid()
  ));

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.token_wallets (user_id, balance)
  VALUES (NEW.id, 50);
  RETURN NEW;
END;
$$;

-- Trigger to create wallet on user creation
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- Trigger for updated_at on token_wallets
CREATE TRIGGER update_token_wallets_updated_at
  BEFORE UPDATE ON public.token_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on courses
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();