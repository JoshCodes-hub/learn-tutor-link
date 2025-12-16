-- Add referral columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- Create referral rewards table
CREATE TABLE public.referral_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referee_id UUID NOT NULL,
  referrer_tokens INTEGER NOT NULL DEFAULT 10,
  referee_tokens INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referee_id)
);

-- Enable RLS
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_rewards
CREATE POLICY "Users can view their referral rewards"
ON public.referral_rewards
FOR SELECT
USING (referrer_id = auth.uid() OR referee_id = auth.uid());

CREATE POLICY "System can insert referral rewards"
ON public.referral_rewards
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update referral rewards"
ON public.referral_rewards
FOR UPDATE
USING (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code like REF-XXXXXX (6 random alphanumeric chars)
    new_code := 'REF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Assign referral codes to existing users who don't have one
UPDATE public.profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Update handle_new_user to assign referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with referral code
  INSERT INTO public.profiles (id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    generate_referral_code()
  );
  
  -- Check if user was referred
  IF NEW.raw_user_meta_data ->> 'referred_by' IS NOT NULL THEN
    -- Update the referred_by field
    UPDATE public.profiles 
    SET referred_by = (
      SELECT id FROM public.profiles 
      WHERE referral_code = NEW.raw_user_meta_data ->> 'referred_by'
      LIMIT 1
    )
    WHERE id = NEW.id;
    
    -- Create pending referral reward
    INSERT INTO public.referral_rewards (referrer_id, referee_id)
    SELECT p.id, NEW.id
    FROM public.profiles p
    WHERE p.referral_code = NEW.raw_user_meta_data ->> 'referred_by';
  END IF;
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Function to complete referral and award tokens (called after first quiz)
CREATE OR REPLACE FUNCTION public.complete_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reward_record RECORD;
  referrer_wallet_id UUID;
  referee_wallet_id UUID;
BEGIN
  -- Only process completed quiz attempts
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if this user has a pending referral reward
  SELECT * INTO reward_record 
  FROM public.referral_rewards 
  WHERE referee_id = NEW.user_id AND status = 'pending';
  
  IF FOUND THEN
    -- Get wallet IDs
    SELECT id INTO referrer_wallet_id FROM public.token_wallets WHERE user_id = reward_record.referrer_id;
    SELECT id INTO referee_wallet_id FROM public.token_wallets WHERE user_id = reward_record.referee_id;
    
    -- Award tokens to referrer
    IF referrer_wallet_id IS NOT NULL THEN
      UPDATE public.token_wallets 
      SET balance = balance + reward_record.referrer_tokens,
          total_earned = total_earned + reward_record.referrer_tokens
      WHERE id = referrer_wallet_id;
      
      INSERT INTO public.token_transactions (wallet_id, amount, type, description, reference_id)
      VALUES (referrer_wallet_id, reward_record.referrer_tokens, 'referral_bonus', 'Referral bonus - friend completed first quiz', reward_record.id);
    END IF;
    
    -- Award tokens to referee
    IF referee_wallet_id IS NOT NULL THEN
      UPDATE public.token_wallets 
      SET balance = balance + reward_record.referee_tokens,
          total_earned = total_earned + reward_record.referee_tokens
      WHERE id = referee_wallet_id;
      
      INSERT INTO public.token_transactions (wallet_id, amount, type, description, reference_id)
      VALUES (referee_wallet_id, reward_record.referee_tokens, 'referral_bonus', 'Welcome bonus for using referral code', reward_record.id);
    END IF;
    
    -- Mark reward as completed
    UPDATE public.referral_rewards 
    SET status = 'completed', completed_at = now()
    WHERE id = reward_record.id;
    
    -- Create notifications
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES 
      (reward_record.referrer_id, 'Referral Bonus!', 'Your friend completed their first quiz! You earned ' || reward_record.referrer_tokens || ' tokens.', 'success', '/student/dashboard'),
      (reward_record.referee_id, 'Welcome Bonus!', 'You earned ' || reward_record.referee_tokens || ' bonus tokens for using a referral code!', 'success', '/student/dashboard');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for completing referral on first quiz
CREATE TRIGGER on_first_quiz_complete
AFTER UPDATE ON public.quiz_attempts
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.complete_referral_reward();